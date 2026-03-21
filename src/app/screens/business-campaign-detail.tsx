import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Tag, 
  Tv, 
  PoundSterling as Pound, 
  Info, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle, 
  ChevronRight, 
  RefreshCcw,
  X,
  FileText,
  Flag,
  Share2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  type: string;
  description?: string;
  budget?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  streams_required: number;
  business_id: string;
  created_at: string;
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
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

interface CreatorProfile {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  email: string;
  avg_viewers?: number;
}

// ─────────────────────────────────────────────
// HELPER: Build stream log from streams_target and streams_completed
// ─────────────────────────────────────────────

type StreamStatus = "Verified" | "Awaiting Proof" | "Upcoming";

function buildStreamLog(streamsTarget: number, streamsCompleted: number) {
  const log = [];
  for (let i = 1; i <= streamsTarget; i++) {
    let status: StreamStatus = "Upcoming";
    let date: string | null = null;
    let duration: string | null = null;

    if (i <= streamsCompleted) {
      status = "Verified";
      // For completed streams we could show a placeholder date
      date = "Completed";
      duration = "45 mins";
    } else if (i === streamsCompleted + 1 && streamsCompleted < streamsTarget) {
      status = "Awaiting Proof";
      date = "Pending";
    }

    log.push({ id: i, num: i, date, duration, status });
  }
  return log;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BusinessCampaignDetail() {
  const navigate = useNavigate();
  const { campaignId, creatorId } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignCreator, setCampaignCreator] = useState<CampaignCreator | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedProof, setSelectedProof] = useState<number | null>(null);

  // Refs for subscription cleanup
  const campaignCreatorChannelRef = useRef<any>(null);
  const campaignChannelRef = useRef<any>(null);

  // ─── FETCH DATA ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!campaignId || !creatorId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // 2. Fetch campaign_creator row
      const { data: ccData, error: ccError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("creator_id", creatorId)
        .maybeSingle();

      if (ccError) throw ccError;
      if (!ccData) {
        toast.error("Creator not found in this campaign");
        navigate(`/business/campaign/${campaignId}`);
        return;
      }
      setCampaignCreator(ccData);

      // 3. Fetch creator profile
      const { data: profileData, error: profileError } = await supabase
        .from("creator_profiles")
        .select("id, full_name, username, avatar_url, email, avg_viewers")
        .eq("id", creatorId)
        .single();

      if (profileError) throw profileError;
      setCreatorProfile(profileData);

      setLastUpdated(new Date());
      if (silent) toast.success("Data refreshed");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId, creatorId, navigate]);

  // ─── REALTIME SUBSCRIPTIONS ────────────────────────────────────────────

  useEffect(() => {
    if (!campaignId || !creatorId) return;

    fetchData();

    let retryTimeout: NodeJS.Timeout;

    const subscribe = () => {
      // Subscribe to campaign_creators changes for this specific row
      campaignCreatorChannelRef.current = supabase
        .channel(`campaign-creator-${campaignId}-${creatorId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "campaign_creators",
            filter: `campaign_id=eq.${campaignId},creator_id=eq.${creatorId}`,
          },
          (payload) => {
            const updated = payload.new as CampaignCreator;
            setCampaignCreator((prev) => (prev ? { ...prev, ...updated } : updated));
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsRealtimeConnected(true);
            console.log(`[Realtime] Connected to campaign-creator-${campaignId}-${creatorId}`);
          } else if (status === "CHANNEL_ERROR") {
            setIsRealtimeConnected(false);
            console.warn(`[Realtime] Error on campaign-creator-${campaignId}-${creatorId}, reconnecting...`);
            if (retryTimeout) clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => {
              campaignCreatorChannelRef.current?.unsubscribe();
              subscribe();
            }, 3000);
          }
        });

      // Subscribe to campaign changes (optional)
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
            setLastUpdated(new Date());
          }
        )
        .subscribe();
    };

    subscribe();

    // Polling fallback: if realtime disconnected, refresh every 30 seconds
    const pollInterval = setInterval(() => {
      if (!isRealtimeConnected) {
        fetchData(true);
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
      campaignCreatorChannelRef.current?.unsubscribe();
      campaignChannelRef.current?.unsubscribe();
    };
  }, [campaignId, creatorId, fetchData, isRealtimeConnected]);

  // ─── ACTIONS (optional: mark stream as completed) ───────────────────────

  const markStreamCompleted = async () => {
    if (!campaignCreator) return;

    const newCompleted = campaignCreator.streams_completed + 1;
    // Optimistic update
    setCampaignCreator({ ...campaignCreator, streams_completed: newCompleted });
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ streams_completed: newCompleted })
        .eq("id", campaignCreator.id);
      if (error) throw error;
      toast.success(`Stream ${newCompleted} marked as completed`);
    } catch (error) {
      // Rollback
      setCampaignCreator({ ...campaignCreator, streams_completed: campaignCreator.streams_completed });
      toast.error("Failed to mark stream");
    }
  };

  // ─── RENDER LOGIC ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath={`/business/campaign/${campaignId}`} title="Creator Breakdown" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-gray-400">Loading campaign details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign || !campaignCreator || !creatorProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath={`/business/campaign/${campaignId}`} title="Creator Breakdown" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Not Found</h2>
          <p className="text-gray-400 mb-8">The campaign or creator does not exist.</p>
          <button
            onClick={() => navigate(`/business/campaign/${campaignId}`)}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }

  const progress = (campaignCreator.streams_completed / campaignCreator.streams_target) * 100;
  const streams = buildStreamLog(campaignCreator.streams_target, campaignCreator.streams_completed);

  // Total budget may be from campaign.budget or campaignCreator.total_earnings
  const totalBudget = campaign.budget || 0;
  const releasedSoFar = campaignCreator.paid_out || 0;
  const remainingHeld = totalBudget - releasedSoFar;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      <AppHeader showBack backPath={`/business/campaign/${campaignId}`} title="Creator Breakdown" />

      {/* Realtime Status Bar */}
      <div className="px-6 py-2.5 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
          <span className="text-[8px] text-[#1D1D1D]/30">
            · Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1 px-2.5 py-1 hover:bg-[#F8F8F8] rounded-lg transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCcw className="w-3 h-3" />
          )}
          <span className="text-[8px] font-black uppercase tracking-widest">
            {refreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>

      <main className="flex-1">
        {/* Header */}
        <section className="px-6 py-8 border-b-2 border-[#1D1D1D]">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden rounded-full">
                <ImageWithFallback
                  src={creatorProfile.avatar_url || "https://via.placeholder.com/100"}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-1">{campaign.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] italic">{creatorProfile.full_name}</p>
              </div>
            </div>
            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 italic ${
              campaign.status?.toLowerCase() === "active"
                ? "bg-[#389C9A] text-white"
                : "bg-gray-200 text-gray-600"
            }`}>
              {campaign.status}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-1 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-[#389C9A]"
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest italic opacity-40">
              <span>Stream {campaignCreator.streams_completed} of {campaignCreator.streams_target} completed</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </section>

        {/* Campaign Overview */}
        <section className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Campaign Overview</h3>
          <div className="grid grid-cols-2 gap-[2px] bg-[#1D1D1D]/10 border border-[#1D1D1D]/10">
            {[
              { icon: Calendar, label: "Start Date", val: campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "TBC" },
              { icon: Calendar, label: "End Date", val: campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "TBC" },
              { icon: Tag, label: "Package", val: `${campaignCreator.streams_target} Streams` },
              { icon: Tv, label: "Campaign Type", val: campaign.type },
              { icon: Pound, label: "Total Budget", val: `£${totalBudget.toFixed(2)}` },
              { icon: Pound, label: "Released So Far", val: `£${releasedSoFar.toFixed(2)}` },
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
        </section>

        {/* Stream Log */}
        <section className="px-6 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Stream Log</h3>
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {streams.map((stream) => (
                <motion.div
                  key={stream.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border-2 border-[#1D1D1D] p-5 flex items-center justify-between group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase italic tracking-tight">Stream {stream.num}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">{stream.date || "TBC"}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                      stream.status === "Verified" ? "bg-[#389C9A] text-white border-[#389C9A]" :
                      stream.status === "Awaiting Proof" ? "bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10" :
                      "bg-white text-[#1D1D1D]/20 border-[#1D1D1D]/10"
                    }`}>
                      {stream.status === "Verified" ? "✓ Verified" : stream.status === "Awaiting Proof" ? "⏳ Awaiting Proof" : "Upcoming"}
                    </div>
                    {stream.status === "Verified" && (
                      <button
                        onClick={() => setSelectedProof(stream.num)}
                        className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline italic"
                      >
                        View Proof
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Communication */}
        <section className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Communication</h3>
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <Link
              to={`/messages?userId=${creatorProfile.id}&role=business`}
              className="w-full flex items-center justify-center gap-3 p-5 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[10px] font-black uppercase tracking-widest italic hover:bg-[#1D1D1D] hover:text-white transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#389C9A]" />
              Message {creatorProfile.full_name}
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />

      {/* Proof Modal */}
      <AnimatePresence>
        {selectedProof && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProof(null)}
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
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Stream Proof — Stream {selectedProof}</h3>
                <div className="mb-8 border-2 border-[#1D1D1D] aspect-video bg-black overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop"
                    className="w-full h-full object-cover grayscale opacity-80"
                  />
                </div>
                <button
                  onClick={() => setSelectedProof(null)}
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
