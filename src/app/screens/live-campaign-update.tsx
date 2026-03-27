import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  Download,
  Calendar,
  Tag,
  Tv,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  X,
  Upload,
  ArrowRight,
  Loader2,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: string;
  budget: number;
  status: string;
  start_date?: string;
  end_date?: string;
  streams_required: number;
  business_id: string;
  banner_url?: string;
}

interface CampaignCreator {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
}

interface Business {
  id: string;
  name: string;
  logo_url?: string;
  user_id?: string;
}

interface StreamProof {
  id: string;
  campaign_creator_id: string;
  stream_number: number;
  proof_url: string;
  status: string;
  submitted_at: string;
  verified_at?: string;
}

export function LiveCampaignUpdate() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatorLink, setCreatorLink] = useState<CampaignCreator | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [streamProofs, setStreamProofs] = useState<StreamProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedStreamNumber, setSelectedStreamNumber] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<{ url: string; streamNum: number } | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch creator profile ID ──────────────────────────────────────────
  useEffect(() => {
    const fetchCreatorProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching creator profile:", error);
        toast.error("Could not load profile");
        navigate("/campaigns");
      } else if (data) {
        setCreatorProfileId(data.id);
      } else {
        toast.error("Creator profile not found");
        navigate("/campaigns");
      }
    };
    fetchCreatorProfile();
  }, [user, navigate]);

  // ─── Fetch campaign data ──────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!campaignId || !user || !creatorProfileId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: linkData, error: linkError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("creator_id", creatorProfileId)
        .maybeSingle();
      if (linkError) throw linkError;
      if (!linkData) {
        toast.error("You are not assigned to this campaign");
        navigate("/campaigns");
        return;
      }
      setCreatorLink(linkData);

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, logo_url, user_id")
        .eq("id", campaignData.business_id)
        .maybeSingle();
      if (!businessError && businessData) setBusiness(businessData);

      const { data: proofsData, error: proofsError } = await supabase
        .from("stream_proofs")
        .select("*")
        .eq("campaign_creator_id", linkData.id)
        .order("stream_number", { ascending: true });
      if (!proofsError) setStreamProofs(proofsData || []);

      if (!silent) toast.success("Data refreshed");
    } catch (error: any) {
      console.error("Error fetching campaign:", error);
      toast.error(error.message || "Failed to load campaign");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId, user, creatorProfileId, navigate]);

  // ─── Real‑time subscriptions ──────────────────────────────────────────
  useEffect(() => {
    if (!creatorProfileId) return;
    fetchData();

    const campaignChannel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${campaignId}` },
        (payload) => {
          setCampaign((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    const creatorChannel = supabase
      .channel(`creator-link-${creatorProfileId}-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_creators", filter: `creator_id=eq.${creatorProfileId}` },
        (payload) => {
          setCreatorLink((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    const proofsChannel = supabase
      .channel(`proofs-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stream_proofs", filter: `campaign_creator_id=eq.${creatorLink?.id}` },
        () => fetchData(true)
      )
      .subscribe();

    return () => {
      campaignChannel.unsubscribe();
      creatorChannel.unsubscribe();
      proofsChannel.unsubscribe();
    };
  }, [campaignId, creatorProfileId, creatorLink?.id, fetchData]);

  // ─── File upload handler using Vercel function (bypasses RLS) ───────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedStreamNumber === null) return;

    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG or JPG images only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${campaignId}_${selectedStreamNumber}_${Date.now()}.${fileExt}`;
      const filePath = `stream-proofs/${creatorProfileId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("campaign-assets").getPublicUrl(filePath);

      // ─── Call Vercel Serverless Function (bypasses RLS) ───
      const response = await fetch("/api/insert-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_creator_id: creatorLink?.id,
          stream_number: selectedStreamNumber,
          proof_url: publicUrl,
          status: "pending",
          submitted_at: new Date().toISOString(),
        }),
      });

      // Handle non‑JSON responses (e.g., HTML errors)
      let errorMsg = null;
      let result = null;
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || `HTTP ${response.status}`;
        } else {
          // Read raw text for non‑JSON errors
          const rawText = await response.text();
          errorMsg = rawText || `HTTP ${response.status}`;
        }
        throw new Error(`Failed to insert proof: ${errorMsg}`);
      }

      // Parse successful JSON response
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        console.log("Insert success:", result);
      } else {
        // If response is not JSON (shouldn't happen on success), just ignore
        console.warn("Unexpected content type on success:", contentType);
      }

      toast.success(`Proof for Stream ${selectedStreamNumber} uploaded! The business will review it shortly.`);
      setIsUploadModalOpen(false);
      fetchData(true); // refresh
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload proof");
    } finally {
      setUploading(false);
      setSelectedStreamNumber(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (streamNum: number) => {
    setSelectedStreamNumber(streamNum);
    setIsUploadModalOpen(true);
  };

  const handleViewProof = (proofUrl: string, streamNum: number) => {
    setSelectedProof({ url: proofUrl, streamNum });
    setIsProofModalOpen(true);
  };

  if (!creatorProfileId || loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Live Campaign" backPath="/dashboard" />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  if (!campaign || !creatorLink) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Live Campaign" backPath="/dashboard" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 mb-8">You are not part of this campaign.</p>
          <button
            onClick={() => navigate("/campaigns")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  const businessName = business?.name || "Business";
  const businessLogo = business?.logo_url || "https://via.placeholder.com/100?text=Logo";
  const totalEarnings = creatorLink.total_earnings;
  const completedStreams = creatorLink.streams_completed;
  const totalStreams = campaign.streams_required;
  const progress = (completedStreams / totalStreams) * 100;

  // Build stream log
  const streamLog = Array.from({ length: totalStreams }, (_, i) => {
    const streamNum = i + 1;
    const proof = streamProofs.find(p => p.stream_number === streamNum);
    let status: "Verified" | "Under Review" | "Upload Required" | "Upcoming" = "Upcoming";
    let proofUrl = null;
    if (proof) {
      if (proof.status === "verified") {
        status = "Verified";
        proofUrl = proof.proof_url;
      } else if (proof.status === "pending") {
        status = "Under Review";
        proofUrl = proof.proof_url;
      }
    } else if (streamNum <= completedStreams) {
      status = "Verified"; // fallback if missing proof but stream count is high
    } else if (streamNum === completedStreams + 1) {
      status = "Upload Required";
    }
    return { num: streamNum, status, proofUrl, date: "TBC", duration: "TBC" };
  });

  const verifiedStreams = streamLog.filter(s => s.status === "Verified").length;
  const underReview = streamLog.filter(s => s.status === "Under Review").length;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Live Campaign" backPath="/dashboard" />

      <main className="flex-1 px-6 py-8">
        {/* Active Campaign Badge */}
        <div className="flex justify-center mb-10">
          <div className="bg-[#1D1D1D] text-white px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] italic">
            ACTIVE CAMPAIGN
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-24 h-24 border-2 border-[#1D1D1D] bg-white p-2 mb-6 shadow-none">
            <ImageWithFallback src={businessLogo} className="w-full h-full object-contain grayscale" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic mb-2">
            {businessName}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 italic">
            {campaign.name}
          </p>
        </div>

        {/* Streams Progress Card */}
        <div className="bg-white border-2 border-[#1D1D1D] p-10 mb-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 italic">STREAMS PROGRESS</p>
              <h3 className="text-4xl font-black italic tracking-tighter leading-none">
                {completedStreams} / {totalStreams}
              </h3>
            </div>
            <p className="text-2xl font-black italic text-[#389C9A] tracking-tighter">
              ₦{totalEarnings.toLocaleString()}
            </p>
          </div>

          <div className="h-2.5 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-[#389C9A]"
            />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.1em] opacity-30 text-center italic">
            {Math.round(progress)}% OF CAMPAIGN COMPLETED
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-[1px] bg-[#1D1D1D] border-2 border-[#1D1D1D] mb-12">
          <div className="bg-white p-6">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2 italic">TOTAL BUDGET</span>
            <span className="text-sm font-black italic">₦{campaign.budget?.toLocaleString()}</span>
          </div>
          <div className="bg-white p-6">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2 italic">PROMO CODE</span>
            <span className="text-sm font-black italic tracking-tight">WELCOME20</span>
          </div>
          <div className="bg-white p-6">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2 italic">START DATE</span>
            <span className="text-sm font-black italic">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "TBC"}</span>
          </div>
          <div className="bg-white p-6">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2 italic">TYPE</span>
            <span className="text-sm font-black italic">{campaign.type || "Banner Only"}</span>
          </div>
        </div>

        {/* Active Asset Section */}
        <div className="mb-14">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">ACTIVE ASSET</h4>
          <div className="relative group">
            <div className="aspect-video border-2 border-[#1D1D1D] bg-black overflow-hidden relative">
              <ImageWithFallback
                src={campaign.banner_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=400&fit=crop"}
                className="w-full h-full object-cover opacity-60 grayscale"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => {
                    if (campaign.banner_url) {
                      const link = document.createElement("a");
                      link.href = campaign.banner_url;
                      link.download = "banner.png";
                      link.click();
                    } else {
                      toast.error("No banner available");
                    }
                  }}
                  className="bg-white p-5 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all italic"
                >
                  <Download className="w-4 h-4 text-[#FEDB71]" /> DOWNLOAD BANNER
                </button>
              </div>
            </div>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mt-5 leading-relaxed italic">
            Note: This banner is dynamic. Our tracking system detects this specific graphic in your stream.
          </p>
        </div>

        {/* Stream Updates Section */}
        <div className="mb-14">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">STREAM UPDATES</h4>
          <div className="flex flex-col gap-6">
            {streamLog.map((stream) => (
              <div key={stream.num} className="bg-white border-2 border-[#1D1D1D] p-8 flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <span className="font-black text-lg uppercase italic tracking-tighter leading-none">STREAM {stream.num}</span>
                  <div
                    className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                      stream.status === "Verified"
                        ? "bg-[#389C9A]/10 text-[#389C9A] border-[#389C9A]/20"
                        : stream.status === "Under Review"
                        ? "bg-[#FEDB71]/10 text-[#D2691E] border-[#FEDB71]/20"
                        : stream.status === "Upload Required"
                        ? "bg-[#F8F8F8] text-[#1D1D1D]/40 border-[#1D1D1D]/10"
                        : "bg-white text-[#1D1D1D]/20 border-[#1D1D1D]/10"
                    }`}
                  >
                    {stream.status === "Verified" && "✓ VERIFIED"}
                    {stream.status === "Under Review" && "⏳ UNDER REVIEW"}
                    {stream.status === "Upload Required" && "UPLOAD REQUIRED"}
                    {stream.status === "Upcoming" && "UPCOMING"}
                  </div>
                </div>

                {/* Always show VIEW PROOF if proofUrl exists */}
                {stream.proofUrl && (
                  <button
                    onClick={() => handleViewProof(stream.proofUrl, stream.num)}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest italic text-[#389C9A]"
                  >
                    <Eye className="w-4 h-4" /> VIEW PROOF
                  </button>
                )}

                {stream.status === "Under Review" && (
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest italic text-[#D2691E]">
                    <Clock className="w-4 h-4" />
                    <span>PROOF SUBMITTED — AWAITING BUSINESS VERIFICATION</span>
                  </div>
                )}

                {stream.status === "Upload Required" && (
                  <div className="flex flex-col gap-5">
                    <button
                      onClick={() => triggerFileInput(stream.num)}
                      className="w-full bg-[#1D1D1D] text-white py-5 px-6 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic border-2 border-[#1D1D1D]"
                    >
                      <Upload className="w-4 h-4 text-[#FEDB71]" /> UPLOAD STREAM PROOF
                    </button>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/30 text-center italic">
                      SCREENSHOT OF YOUR ANALYTICS SHOWING VIEWERS AND STREAM DURATION
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Earnings Bar */}
            <div className="mt-4 bg-[#1D1D1D] p-10 text-white border-b-4 border-[#389C9A]">
              <div className="grid grid-cols-2 gap-10 mb-8">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 italic">VERIFIED STREAMS</p>
                  <p className="text-3xl font-black italic tracking-tighter">{verifiedStreams}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 italic text-[#FEDB71]">EARNINGS UNLOCKED</p>
                  <p className="text-3xl font-black italic tracking-tighter">₦{totalEarnings.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 mb-8" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center italic opacity-80">
                {underReview > 0
                  ? `${underReview} STREAMS AWAITING VERIFICATION`
                  : `NEXT PAYOUT TRIGGERS AFTER STREAM ${Math.min(completedStreams + 1, totalStreams)} IS VERIFIED`}
              </p>
            </div>
          </div>
        </div>

        {/* Partnership Rules */}
        <div className="mb-14 px-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-40 italic">PARTNERSHIP RULES</h4>
          <div className="space-y-4">
            {[
              "Minimum stream duration: 45 minutes",
              "Banner must be clearly visible throughout the stream",
              "Promo code must be mentioned at least once per hour",
              "No offensive content during the sponsored stream",
            ].map((req, i) => (
              <div key={i} className="flex gap-5 p-6 bg-white border border-[#1D1D1D]/10 items-start italic group hover:border-[#389C9A] transition-colors">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#389C9A] shrink-0 mt-0.5" />
                <p className="text-[10px] font-black uppercase tracking-tight leading-relaxed opacity-60 group-hover:opacity-100">
                  {req}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Need Help? Section – FIXED MESSAGE LINK using business user_id */}
        <div className="px-4 mb-20">
          <div className="bg-[#1D1D1D]/5 p-12 border-2 border-[#1D1D1D] text-center">
            <h4 className="text-xl font-black uppercase italic mb-3 tracking-tighter leading-none">NEED HELP?</h4>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-10 italic leading-relaxed">
              Contact the brand representative directly for any questions regarding assets or technical issues.
            </p>
            <Link
              to={`/messages/${campaign.id}/business/${business?.user_id}`}
              className="w-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border-2 border-[#1D1D1D] bg-white py-6 px-8 hover:bg-[#1D1D1D] hover:text-white transition-all italic active:scale-[0.98]"
            >
              <MessageSquare className="w-5 h-5 text-[#389C9A]" /> MESSAGE {businessName}
            </Link>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileUpload}
          className="hidden"
        />
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-8 max-w-[90%] w-full max-w-[400px] text-center">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">
                  Upload Proof – Stream {selectedStreamNumber}
                </h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {uploading ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-[#389C9A] mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Uploading...</p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1D1D1D] p-8 cursor-pointer hover:bg-[#F8F8F8] transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto mb-4 text-[#389C9A]" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Tap to select screenshot</p>
                  <p className="text-[8px] font-medium opacity-40 mt-2">PNG or JPG, max 5MB</p>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof Modal */}
      <AnimatePresence>
        {isProofModalOpen && selectedProof && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProofModalOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[32px] max-w-[480px] mx-auto overflow-hidden border-t-4 border-[#1D1D1D]"
            >
              <div className="w-12 h-1 bg-[#1D1D1D]/10 mx-auto mt-4 rounded-full" />
              <div className="p-8 text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">
                  Stream Proof — Stream {selectedProof.streamNum}
                </h3>
                <div className="mb-8 border-2 border-[#1D1D1D] aspect-video bg-black overflow-hidden">
                  <ImageWithFallback
                    src={selectedProof.url}
                    className="w-full h-full object-cover grayscale opacity-80"
                  />
                </div>
                <button
                  onClick={() => setIsProofModalOpen(false)}
                  className="w-full py-6 bg-[#1D1D1D] text-white font-black uppercase tracking-widest italic active:scale-[0.98] transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
