import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  Download,
  Calendar,
  Tag,
  Tv,
  PoundSterling as Pound,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  RefreshCcw,
  X,
  Upload,
  ArrowRight,
  Loader2,
  Eye,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
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
  pay_per_stream?: number;
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

interface CreatorProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  user_id?: string; // auth user ID
}

interface StreamProof {
  id: string;
  campaign_creator_id: string;
  stream_number: number;
  proof_url: string;
  status: string; // 'pending' or 'verified'
  submitted_at: string;
  verified_at?: string;
}

// Helper confirm toast
function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(message, {
      duration: 10000,
      action: {
        label: "Confirm",
        onClick: () => resolve(true),
      },
      cancel: {
        label: "Cancel",
        onClick: () => resolve(false),
      },
      onDismiss: () => resolve(false),
    });
  });
}

export function CampaignCreatorDetail() {
  const navigate = useNavigate();
  const { campaignId, creatorId } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatorLink, setCreatorLink] = useState<CampaignCreator | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [streamProofs, setStreamProofs] = useState<StreamProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<{ url: string; streamNum: number } | null>(null);
  const [verifyingProofId, setVerifyingProofId] = useState<string | null>(null);

  const campaignChannelRef = useRef<any>(null);
  const creatorChannelRef = useRef<any>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!campaignId || !creatorId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch the creator's link to this campaign
      const { data: linkData, error: linkError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("creator_id", creatorId)
        .maybeSingle();
      if (linkError) throw linkError;
      if (!linkData) {
        toast.error("Creator not found in this campaign");
        navigate(`/business/campaign/overview/${campaignId}`);
        return;
      }
      setCreatorLink(linkData);

      // Fetch creator profile (including user_id)
      const { data: profileData, error: profileError } = await supabase
        .from("creator_profiles")
        .select("id, full_name, username, avatar_url, user_id")
        .eq("id", creatorId)
        .single();
      if (profileError) throw profileError;
      setCreatorProfile(profileData);

      // Fetch stream proofs
      const { data: proofsData, error: proofsError } = await supabase
        .from("stream_proofs")
        .select("*")
        .eq("campaign_creator_id", linkData.id)
        .order("stream_number", { ascending: true });
      if (!proofsError) setStreamProofs(proofsData || []);

      if (!silent) toast.success("Data loaded");
    } catch (error: any) {
      console.error("Error fetching creator details:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId, creatorId, navigate]);

  useEffect(() => {
    if (!campaignId || !creatorId) return;
    fetchData();

    const subscribe = () => {
      campaignChannelRef.current = supabase
        .channel(`campaign-${campaignId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "campaigns",
            filter: `id=eq.${campaignId}`,
          },
          (payload) => {
            setCampaign((prev) => (prev ? { ...prev, ...payload.new } : prev));
          }
        )
        .subscribe();

      if (creatorLink?.id) {
        creatorChannelRef.current = supabase
          .channel(`campaign-creator-${creatorLink.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "campaign_creators",
              filter: `id=eq.${creatorLink.id}`,
            },
            (payload) => {
              setCreatorLink((prev) => (prev ? { ...prev, ...payload.new } : prev));
            }
          )
          .subscribe();
      }
    };

    subscribe();

    return () => {
      campaignChannelRef.current?.unsubscribe();
      creatorChannelRef.current?.unsubscribe();
    };
  }, [campaignId, creatorId, creatorLink?.id, fetchData]);

  const verifyProof = async (proofId: string, streamNum: number) => {
    const ok = await confirmToast(`Verify stream ${streamNum}? This will mark the stream as completed and add earnings.`);
    if (!ok) return;

    setVerifyingProofId(proofId);
    try {
      // 1. Update the proof status
      const { error: proofError } = await supabase
        .from("stream_proofs")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", proofId);
      if (proofError) throw proofError;

      // 2. Calculate per‑stream earning (if not stored)
      let perStreamEarning = campaign?.pay_per_stream;
      if (!perStreamEarning && campaign) {
        perStreamEarning = campaign.budget / campaign.streams_required;
        // Optional: store it for future use
        await supabase
          .from("campaigns")
          .update({ pay_per_stream: perStreamEarning })
          .eq("id", campaign.id);
      }

      // 3. Increment streams_completed and total_earnings in campaign_creators
      const { error: updateError } = await supabase
        .from("campaign_creators")
        .update({
          streams_completed: (creatorLink?.streams_completed || 0) + 1,
          total_earnings: (creatorLink?.total_earnings || 0) + perStreamEarning,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creatorLink?.id);
      if (updateError) throw updateError;

      // 4. Notify the creator
      if (creatorProfile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: creatorProfile.user_id,
          type: "stream_verified",
          title: "Stream Verified! 🎉",
          message: `Stream ${streamNum} for campaign "${campaign?.name}" has been verified. ₦${perStreamEarning?.toLocaleString()} added to your earnings.`,
          data: { campaign_id: campaign?.id, stream_number: streamNum },
          created_at: new Date().toISOString(),
        }).catch(console.error);
      }

      toast.success(`Stream ${streamNum} verified!`);
      fetchData(true); // refresh all data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifyingProofId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath={`/business/campaign/overview/${campaignId}`} title="Creator Breakdown" userType="business" />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  if (!campaign || !creatorLink || !creatorProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath={`/business/campaign/overview/${campaignId}`} title="Creator Breakdown" userType="business" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Data Not Found</h2>
          <p className="text-gray-400 mb-8">This creator may not be part of this campaign.</p>
          <button
            onClick={() => navigate(`/business/campaign/overview/${campaignId}`)}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }

  const totalEarnings = creatorLink.total_earnings;
  const completedStreams = creatorLink.streams_completed;
  const totalStreams = campaign.streams_required;
  const progress = (completedStreams / totalStreams) * 100;

  // Build stream log with proof status and URL
  const streamLog = Array.from({ length: totalStreams }, (_, i) => {
    const streamNum = i + 1;
    const proof = streamProofs.find(p => p.stream_number === streamNum);
    if (proof) {
      const status = proof.status === 'verified' ? 'Verified' : 'Pending Verification';
      const date = proof.submitted_at ? new Date(proof.submitted_at).toLocaleDateString() : 'TBC';
      return { num: streamNum, status, proofUrl: proof.proof_url, date, duration: 'TBC', proofId: proof.id };
    } else if (streamNum <= completedStreams) {
      return { num: streamNum, status: 'No Proof Uploaded', proofUrl: null, date: 'TBC', duration: 'TBC', proofId: null };
    } else {
      return { num: streamNum, status: 'Upcoming', proofUrl: null, date: 'TBC', duration: 'TBC', proofId: null };
    }
  });

  const handleViewProof = (proofUrl: string, streamNum: number) => {
    setSelectedProof({ url: proofUrl, streamNum });
    setIsProofModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      <AppHeader showBack backPath={`/business/campaign/overview/${campaignId}`} title="Creator Breakdown" userType="business" />

      <main className="flex-1">
        {/* Header with avatar */}
        <div className="px-8 py-8 border-b-2 border-[#1D1D1D]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden">
              <ImageWithFallback
                src={creatorProfile.avatar_url}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-1">
                {creatorProfile.full_name}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] italic">
                {creatorProfile.username}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Stream Progress</span>
            <span className="text-[9px] font-black">{completedStreams} / {totalStreams}</span>
          </div>
          <div className="h-1 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-[#389C9A]"
            />
          </div>
        </div>

        {/* Campaign Overview Grid */}
        <div className="px-8 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">
            Campaign Overview
          </h3>
          <div className="grid grid-cols-2 gap-[2px] bg-[#1D1D1D]/10 border border-[#1D1D1D]/10">
            {[
              { icon: Calendar, label: "Start Date", val: campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "TBC" },
              { icon: Calendar, label: "End Date", val: campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "TBC" },
              { icon: Tag, label: "Package", val: `${campaign.streams_required} Streams` },
              { icon: Tv, label: "Campaign Type", val: campaign.type || "Banner Only" },
              { icon: Pound, label: "Total Budget", val: `₦${campaign.budget?.toLocaleString()}` },
              { icon: Pound, label: "Earned So Far", val: `₦${totalEarnings.toLocaleString()}` },
            ].map((tile, i) => (
              <div key={i} className="bg-white p-5 flex items-start gap-4">
                <tile.icon className="w-4 h-4 mt-0.5 text-[#389C9A]" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1 italic">{tile.label}</p>
                  <p className="text-[10px] font-black uppercase tracking-tight italic">{tile.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stream Log */}
        <div className="px-8 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">
            Stream Log
          </h3>
          <div className="flex flex-col gap-4">
            {streamLog.map((stream) => (
              <div key={stream.num} className="bg-white border-2 border-[#1D1D1D] p-5 flex items-center justify-between group">
                <div>
                  <span className="text-sm font-black uppercase italic tracking-tight">Stream {stream.num}</span>
                  {stream.date !== 'TBC' && (
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 mt-1">{stream.date}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div
                    className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                      stream.status === 'Verified'
                        ? 'bg-[#389C9A] text-white border-[#389C9A]'
                        : stream.status === 'Pending Verification'
                        ? 'bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10'
                        : stream.status === 'No Proof Uploaded'
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : 'bg-white text-[#1D1D1D]/20 border-[#1D1D1D]/10'
                    }`}
                  >
                    {stream.status === 'Verified' && '✓ VERIFIED'}
                    {stream.status === 'Pending Verification' && '⏳ PENDING VERIFICATION'}
                    {stream.status === 'No Proof Uploaded' && '⚠️ NO PROOF'}
                    {stream.status === 'Upcoming' && 'UPCOMING'}
                  </div>
                  {/* Always show View Proof button if proof exists */}
                  {stream.proofUrl && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewProof(stream.proofUrl, stream.num)}
                        className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline italic flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Proof
                      </button>
                      {/* Show verify button only if pending */}
                      {stream.status === 'Pending Verification' && (
                        <button
                          onClick={() => stream.proofId && verifyProof(stream.proofId, stream.num)}
                          disabled={verifyingProofId === stream.proofId}
                          className="text-[8px] font-black uppercase tracking-widest bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {verifyingProofId === stream.proofId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Verify
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Communication */}
        <div className="px-8 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">
            Communication
          </h3>
          <Link
            to={`/business/messages/${campaignId}/creator/${creatorProfile.user_id}`}
            className="w-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border-2 border-[#1D1D1D] bg-white py-6 px-8 hover:bg-[#1D1D1D] hover:text-white transition-all italic active:scale-[0.98]"
          >
            <MessageSquare className="w-5 h-5 text-[#389C9A]" /> Message {creatorProfile.full_name}
          </Link>
        </div>
      </main>

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
