import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Calendar, 
  Video as VideoIcon, 
  Tag, 
  PoundSterling as Pound, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Download,
  MessageSquare,
  X,
  Upload,
  Check,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Users,
  Eye,
  Star,
  Award,
  Share2,
  Copy,
  RefreshCw,
  HelpCircle,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";

type StreamStatus = "Verified" | "Under Review" | "Upload Required" | "Pending";

interface StreamUpdate {
  id: string;
  stream_number: number;
  status: StreamStatus;
  stream_date: string;
  duration: string;
  video_url?: string;
  screenshot_url?: string;
  notes?: string;
}

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  start_date: string;
  end_date?: string;
  streams_required: number;
  streams_completed: number;
  budget?: number;
  price_per_stream?: number;
  total_budget?: number;
  promo_code?: string;
  banner_url?: string;
  requirements?: string[];
  business: {
    id: string;
    business_name: string;
    logo_url?: string;
    website?: string;
    contact_email?: string;
    verified?: boolean;
  };
}

export function CreatorCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [streamUpdates, setStreamUpdates] = useState<StreamUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamUpdate | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingPayment: 0,
    completedStreams: 0,
    averageRating: 0
  });

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  useEffect(() => {
    if (campaign && user) {
      fetchStreamUpdates();
      calculateStats();
    }
  }, [campaign, user]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);

      // Fetch campaign with business details
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            logo_url,
            website,
            contact_email,
            id_verified
          )
        `)
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;

      // Fetch campaign requirements
      const { data: requirementsData } = await supabase
        .from("campaign_requirements")
        .select("*")
        .eq("campaign_id", id);

      setCampaign({
        ...campaignData,
        requirements: requirementsData?.map(r => r.description) || [
          "Minimum stream duration: 45 minutes",
          "Banner must be clearly visible",
          "Promo code must be mentioned at least once",
          "No offensive content during stream"
        ]
      });

    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign details");
    } finally {
      setLoading(false);
    }
  };

  const fetchStreamUpdates = async () => {
    if (!user || !campaign) return;

    try {
      const { data, error } = await supabase
        .from("stream_updates")
        .select("*")
        .eq("campaign_id", id)
        .eq("creator_id", user.id)
        .order("stream_number", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setStreamUpdates(data);
      } else {
        // Generate placeholder streams
        const placeholders: StreamUpdate[] = [];
        for (let i = 1; i <= (campaign.streams_required || 12); i++) {
          const isCompleted = i <= (campaign.streams_completed || 0);
          placeholders.push({
            id: `stream-${i}`,
            stream_number: i,
            status: isCompleted ? "Verified" : i === (campaign.streams_completed || 0) + 1 ? "Upload Required" : "Pending",
            stream_date: isCompleted ? new Date(Date.now() - (i * 86400000)).toLocaleDateString() : "Not scheduled",
            duration: isCompleted ? `${45 + i} mins` : "Not streamed"
          });
        }
        setStreamUpdates(placeholders);
      }
    } catch (error) {
      console.error("Error fetching stream updates:", error);
    }
  };

  const calculateStats = () => {
    if (!campaign) return;

    const completed = campaign.streams_completed || 0;
    const pricePerStream = campaign.price_per_stream || (campaign.budget ? campaign.budget / (campaign.streams_required || 12) : 15);
    const earned = completed * pricePerStream;
    const pending = ((campaign.streams_completed || 0) + 1) * pricePerStream - earned;

    setStats({
      totalEarned: earned,
      pendingPayment: pending,
      completedStreams: completed,
      averageRating: 4.8
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaignData();
    await fetchStreamUpdates();
    setRefreshing(false);
    toast.success("Campaign data updated");
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStream || !user || !campaign) return;

    try {
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // In a real app, upload file to storage
      // const { data: uploadData, error: uploadError } = await supabase.storage
      //   .from("stream-proofs")
      //   .upload(`${user.id}/${campaign.id}/stream-${selectedStream.stream_number}.jpg`, uploadFile);

      // if (uploadError) throw uploadError;

      // Update stream status
      const { error: updateError } = await supabase
        .from("stream_updates")
        .upsert({
          campaign_id: campaign.id,
          creator_id: user.id,
          stream_number: selectedStream.stream_number,
          status: "Under Review",
          stream_date: new Date().toISOString(),
          duration: "Stream recorded",
          // video_url: uploadData?.path
        });

      if (updateError) throw updateError;

      // Update local state
      setStreamUpdates(prev => prev.map(s => 
        s.stream_number === selectedStream.stream_number 
          ? { ...s, status: "Under Review", stream_date: new Date().toLocaleDateString() }
          : s
      ));

      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedStream(null);
        setUploadFile(null);
        setUploadProgress(0);
        toast.success("Stream proof submitted! We'll verify within 24 hours.");
      }, 500);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload stream proof");
    }
  };

  const handleCopyPromoCode = () => {
    if (campaign?.promo_code) {
      navigator.clipboard.writeText(campaign.promo_code);
      toast.success("Promo code copied!");
    }
  };

  const handleDownloadBanner = async () => {
    if (!campaign?.banner_url) {
      toast.error("No banner available for download");
      return;
    }

    try {
      const response = await fetch(campaign.banner_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banner-${campaign.business.business_name}.jpg`;
      a.click();
      toast.success("Banner downloaded!");
    } catch (error) {
      toast.error("Failed to download banner");
    }
  };

  const handleMessageBusiness = () => {
    if (campaign?.business_id) {
      navigate(`/messages/${campaign.business_id}`);
    }
  };

  const getStatusColor = (status: StreamStatus) => {
    switch(status) {
      case "Verified": return "bg-[#389C9A] text-white border-[#389C9A]";
      case "Under Review": return "bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10";
      case "Upload Required": return "bg-red-500 text-white border-red-500";
      default: return "bg-gray-100 text-gray-400 border-gray-200";
    }
  };

  const getStatusIcon = (status: StreamStatus) => {
    switch(status) {
      case "Verified": return <CheckCircle2 className="w-3 h-3" />;
      case "Under Review": return <Clock className="w-3 h-3" />;
      case "Upload Required": return <AlertTriangle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Campaign Details" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading campaign...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Campaign Details" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The campaign you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest"
          >
            Back to Dashboard
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const progress = (campaign.streams_completed / campaign.streams_required) * 100;
  const pricePerStream = campaign.price_per_stream || 15;
  const nextPayment = (campaign.streams_completed + 1) * pricePerStream - stats.totalEarned;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Campaign Details" />
      <Toaster position="top-center" expand={false} richColors />

      <main className="max-w-[480px] mx-auto w-full pt-8">
        {/* Status Badge & Refresh */}
        <div className="px-6 flex justify-between items-center mb-4">
          <div className="bg-[#1D1D1D] text-white px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] italic">
            {campaign.status} Campaign
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Business Header */}
        <div className="flex flex-col items-center text-center mb-10 px-6">
          <div className="w-24 h-24 border-2 border-[#1D1D1D] bg-white p-2 mb-6 rounded-xl overflow-hidden">
            <ImageWithFallback 
              src={campaign.business.logo_url} 
              className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all duration-500" 
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
              {campaign.business.business_name}
            </h2>
            {campaign.business.verified && (
              <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-2">
            {campaign.name}
          </p>
          <p className="text-[8px] font-medium uppercase tracking-widest text-[#389C9A]">
            {campaign.type}
          </p>
        </div>

        {/* Progress Card */}
        <div className="px-6 mb-8">
          <div className="bg-white border-2 border-[#1D1D1D] p-8 rounded-xl">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Streams Progress</p>
                <h3 className="text-2xl font-black italic">
                  {campaign.streams_completed} / {campaign.streams_required}
                </h3>
              </div>
              <p className="text-lg font-black italic text-[#389C9A]">
                £{stats.totalEarned.toFixed(2)}
              </p>
            </div>
            
            <div className="h-2 bg-[#1D1D1D]/5 w-full rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-[#389C9A] rounded-full"
              />
            </div>
            
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 text-center italic">
              {Math.round(progress)}% of campaign completed
            </p>

            {nextPayment > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1D1D1D]/10">
                <div className="flex items-center justify-between text-[9px] font-black uppercase">
                  <span className="opacity-40">Next Payment</span>
                  <span className="text-[#FEDB71]">£{nextPayment.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="px-6 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Viewers</span>
              </div>
              <p className="text-lg font-black">1.2k</p>
              <p className="text-[7px] font-medium opacity-40">avg. per stream</p>
            </div>
            <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-[#FEDB71]" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Rating</span>
              </div>
              <p className="text-lg font-black">{stats.averageRating}</p>
              <p className="text-[7px] font-medium opacity-40">from 23 reviews</p>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        {campaign.promo_code && (
          <div className="px-6 mb-8">
            <div className="bg-[#1D1D1D] p-6 rounded-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Your Promo Code</p>
                <div className="flex items-center gap-3 mb-3">
                  <code className="text-2xl font-black tracking-tighter bg-white/10 px-4 py-2 rounded-lg">
                    {showPromoCode ? campaign.promo_code : '••••••••'}
                  </code>
                  <button
                    onClick={() => setShowPromoCode(!showPromoCode)}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleCopyPromoCode}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#FEDB71] hover:gap-3 transition-all"
                >
                  <Copy className="w-3 h-3" /> Copy Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Details Grid */}
        <div className="px-6 mb-8">
          <div className="grid grid-cols-2 gap-[1px] bg-[#1D1D1D] border border-[#1D1D1D] rounded-xl overflow-hidden">
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Total Budget</span>
              <span className="text-sm font-black italic">£{campaign.budget || 0}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Start Date</span>
              <span className="text-sm font-black italic">{new Date(campaign.start_date).toLocaleDateString()}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Per Stream</span>
              <span className="text-sm font-black text-[#389C9A] italic">£{pricePerStream}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Type</span>
              <span className="text-sm font-black italic">{campaign.type}</span>
            </div>
          </div>
        </div>

        {/* Campaign Banner */}
        {campaign.banner_url && (
          <div className="px-6 mb-12">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 italic">Active Asset</h4>
            <div className="relative group">
              <div className="aspect-video border-2 border-[#1D1D1D] bg-black overflow-hidden relative rounded-xl">
                <ImageWithFallback 
                  src={campaign.banner_url} 
                  className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={handleDownloadBanner}
                    className="bg-white p-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl"
                  >
                    <Download className="w-4 h-4 text-[#FEDB71]" /> Download Banner
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="px-6 mb-8">
          <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 italic">Campaign Description</h4>
          <p className="text-sm leading-relaxed opacity-60">{campaign.description}</p>
        </div>

        {/* Requirements */}
        {campaign.requirements && campaign.requirements.length > 0 && (
          <div className="px-6 mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 italic flex items-center gap-2">
              <Info className="w-4 h-4 text-[#389C9A]" /> Requirements
            </h4>
            <ul className="space-y-2">
              {campaign.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-[#389C9A] mt-0.5 flex-shrink-0" />
                  <span className="opacity-60">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stream Updates */}
        <div className="px-6 mb-12 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Stream Updates</h4>
            <span className="text-xs font-black">
              {streamUpdates.filter(s => s.status === "Verified").length} Verified
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {streamUpdates.map((stream) => (
              <motion.div 
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl flex flex-col gap-6"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm uppercase italic">Stream {stream.stream_number}</span>
                  <div className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest border rounded-full flex items-center gap-1 ${getStatusColor(stream.status)}`}>
                    {getStatusIcon(stream.status)}
                    {stream.status}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{stream.stream_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{stream.duration}</span>
                  </div>
                </div>

                {stream.status === "Upload Required" && (
                  <button 
                    onClick={() => {
                      setSelectedStream(stream);
                      setIsUploadModalOpen(true);
                    }}
                    className="w-full bg-[#1D1D1D] text-white p-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#389C9A] transition-all rounded-xl"
                  >
                    <Upload className="w-4 h-4 text-[#FEDB71]" /> Upload Stream Proof
                  </button>
                )}

                {stream.status === "Under Review" && (
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#FEDB71] bg-[#FEDB71]/10 p-3 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span>Under review - verification typically takes 24 hours</span>
                  </div>
                )}

                {stream.status === "Verified" && (
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#389C9A] bg-[#389C9A]/10 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified and approved! Payment processing</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="px-6 mb-24">
          <div className="bg-[#FEDB71]/10 p-8 border-2 border-dashed border-[#FEDB71] rounded-xl text-center">
            <HelpCircle className="w-8 h-8 text-[#389C9A] mx-auto mb-4" />
            <h4 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Need Help?</h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-8 italic">
              Contact the brand representative directly.
            </p>
            <button
              onClick={handleMessageBusiness}
              className="w-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border-2 border-[#1D1D1D] bg-white py-5 px-8 hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl"
            >
              <MessageSquare className="w-5 h-5 text-[#389C9A]" /> Message {campaign.business.business_name}
            </button>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && selectedStream && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsUploadModalOpen(false)} 
              className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] max-h-[95vh] overflow-y-auto rounded-t-3xl"
            >
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              
              <div className="px-8 pt-4 pb-12 flex flex-col gap-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-1">
                      Submit Proof
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">
                      Stream {selectedStream.stream_number}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)} 
                    className="p-3 bg-white border border-[#1D1D1D]/10 rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-8">
                  <div className="relative">
                    <input
                      type="file"
                      id="stream-proof"
                      accept="image/*,video/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="stream-proof"
                      className="block w-full aspect-video border-2 border-dashed border-[#1D1D1D] bg-[#F8F8F8] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-[#1D1D1D] hover:text-white transition-all group p-6 rounded-xl"
                    >
                      <Upload className="w-8 h-8 text-[#1D1D1D] group-hover:text-[#FEDB71]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-center">
                        {uploadFile ? uploadFile.name : "Tap to upload screenshot or video"}
                      </p>
                      <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">
                        PNG, JPG or MP4 (max 50MB)
                      </p>
                    </label>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="h-1 bg-[#1D1D1D]/10 w-full rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#389C9A] transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-center opacity-40">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={!uploadFile || uploadProgress > 0}
                    className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 hover:bg-[#389C9A] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  >
                    {uploadProgress > 0 ? 'UPLOADING...' : 'SUBMIT STREAM PROOF'}
                    {uploadProgress === 0 && <ArrowRight className="w-6 h-6 text-[#FEDB71]" />}
                  </button>
                </form>

                <div className="bg-[#F8F8F8] p-4 rounded-lg">
                  <h5 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Requirements
                  </h5>
                  <ul className="space-y-1 text-[8px] font-medium">
                    <li>• Screenshot must show viewer count</li>
                    <li>• Stream duration clearly visible</li>
                    <li>• Banner should be in frame</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}