import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Star,
  Tag,
  Calendar,
  Clock,
  TrendingUp,
  Shield,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Lock,
  Flag,
  Repeat,
  X,
  Eye,
  Loader2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
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
  verified?: boolean;
}

// ─────────────────────────────────────────────
// HELPER: Build stream log from streams_target and streams_completed
// ─────────────────────────────────────────────

function buildStreamLog(streamsTarget: number, streamsCompleted: number) {
  const log = [];
  for (let i = 1; i <= streamsTarget; i++) {
    let status: "Verified" | "Awaiting Proof" | "Upcoming" = "Upcoming";
    let date: string | null = null;
    let duration: string | null = null;

    if (i <= streamsCompleted) {
      status = "Verified";
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

export function BusinessCampaignOverview() {
  const navigate = useNavigate();
  const { id: campaignId } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [campaignCreators, setCampaignCreators] = useState<CampaignCreator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<CampaignCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refs for subscriptions
  const campaignChannelRef = useRef<any>(null);
  const creatorsChannelRef = useRef<any>(null);
  const profileChannelRef = useRef<any>(null);

  // ─── FETCH DATA ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!campaignId) return;
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

      // 2. Fetch campaign_creators for this campaign
      const { data: ccData, error: ccError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (ccError) throw ccError;
      setCampaignCreators(ccData || []);

      // If there is at least one creator, pick the first one for the overview.
      // (In a real campaign there might be many; you could let the user pick.)
      if (ccData && ccData.length > 0) {
        setSelectedCreator(ccData[0]);

        // 3. Fetch creator profile
        const { data: profileData, error: profileError } = await supabase
          .from("creator_profiles")
          .select("id, full_name, username, avatar_url, email, avg_viewers, verified")
          .eq("id", ccData[0].creator_id)
          .single();

        if (!profileError) setCreatorProfile(profileData);
      }

      setLastUpdated(new Date());
      if (silent) toast.success("Data refreshed");
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  // ─── REALTIME SUBSCRIPTIONS ────────────────────────────────────────────

  useEffect(() => {
    if (!campaignId) return;

    fetchData();

    let retryTimeout: NodeJS.Timeout;

    const subscribe = () => {
      // Campaign updates
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

      // Campaign creators updates
      creatorsChannelRef.current = supabase
        .channel(`campaign-creators-${campaignId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_creators",
            filter: `campaign_id=eq.${campaignId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setCampaignCreators((prev) => [...prev, payload.new]);
            } else if (payload.eventType === "UPDATE") {
              setCampaignCreators((prev) =>
                prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
              );
            } else if (payload.eventType === "DELETE") {
              setCampaignCreators((prev) => prev.filter((c) => c.id !== payload.old.id));
            }
            // If the current selected creator is updated, refresh
            if (selectedCreator && selectedCreator.id === payload.new?.id) {
              setSelectedCreator((prev) => (prev ? { ...prev, ...payload.new } : prev));
            }
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsRealtimeConnected(true);
            console.log(`[Realtime] Connected to campaign-creators-${campaignId}`);
          } else if (status === "CHANNEL_ERROR") {
            setIsRealtimeConnected(false);
            if (retryTimeout) clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => {
              creatorsChannelRef.current?.unsubscribe();
              subscribe();
            }, 3000);
          }
        });

      // Profile updates for the selected creator
      if (selectedCreator) {
        profileChannelRef.current = supabase
          .channel(`creator-profile-${selectedCreator.creator_id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "creator_profiles",
              filter: `id=eq.${selectedCreator.creator_id}`,
            },
            (payload) => {
              setCreatorProfile((prev) => (prev ? { ...prev, ...payload.new } : prev));
              setLastUpdated(new Date());
            }
          )
          .subscribe();
      }
    };

    subscribe();

    // Polling fallback
    const pollInterval = setInterval(() => {
      if (!isRealtimeConnected) {
        fetchData(true);
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
      campaignChannelRef.current?.unsubscribe();
      creatorsChannelRef.current?.unsubscribe();
      profileChannelRef.current?.unsubscribe();
    };
  }, [campaignId, fetchData, isRealtimeConnected, selectedCreator]);

  // ─── HELPER: get creator data for selected creator ───────────────────

  const getCurrentCreator = useCallback(() => {
    if (!selectedCreator) return null;
    return {
      ...selectedCreator,
      profile: creatorProfile,
    };
  }, [selectedCreator, creatorProfile]);

  // ─── RENDER LOGIC ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-gray-400">Loading campaign overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 mb-8">This campaign doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/business/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentCreator = getCurrentCreator();
  const streamLog = currentCreator ? buildStreamLog(currentCreator.streams_target, currentCreator.streams_completed) : [];
  const progressPercent = currentCreator
    ? (currentCreator.streams_completed / currentCreator.streams_target) * 100
    : 0;

  const totalBudget = campaign.budget || 0;
  const releasedSoFar = currentCreator?.paid_out || 0;
  const remainingHeld = totalBudget - releasedSoFar;

  // Placeholder payout schedule (could be fetched from campaign terms)
  const payoutSchedule = [
    { label: "After Streams 1–4 verified", amount: (totalBudget * 0.25).toFixed(2), status: currentCreator?.streams_completed >= 4 ? "Paid" : "Upcoming" },
    { label: "After Streams 5–8 verified", amount: (totalBudget * 0.25).toFixed(2), status: currentCreator?.streams_completed >= 8 ? "Paid" : "Upcoming" },
    { label: "After Streams 9–12 verified", amount: (totalBudget * 0.25).toFixed(2), status: currentCreator?.streams_completed >= 12 ? "Paid" : "Upcoming" },
    { label: "After Streams 13–16 verified", amount: (totalBudget * 0.25).toFixed(2), status: currentCreator?.streams_completed >= 16 ? "Paid" : "Upcoming" },
  ];

  const daysUntilStart = campaign.start_date
    ? Math.ceil((new Date(campaign.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isUpcoming = campaign.status?.toLowerCase() === "upcoming" || (campaign.start_date && new Date(campaign.start_date) > new Date());

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />

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
            <RefreshCw className="w-3 h-3" />
          )}
          <span className="text-[8px] font-black uppercase tracking-widest">
            {refreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>

      <main className="flex-1">
        {/* SECTION 1 — CAMPAIGN STATUS BANNER */}
        <div className={`w-full px-6 py-4 flex items-center justify-between italic ${
          isUpcoming ? "bg-[#FFF8DC]" : campaign.status?.toLowerCase() === "active" ? "bg-[#E6F4F0]" : "bg-gray-100"
        } border-b-2 border-[#1D1D1D]`}>
          <div className="flex items-center gap-2">
            {isUpcoming ? (
              <>
                <Clock className="w-3.5 h-3.5 text-[#D2691E]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">Upcoming</span>
              </>
            ) : campaign.status?.toLowerCase() === "active" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#389C9A]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">Active</span>
              </>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{campaign.status}</span>
            )}
          </div>
          {isUpcoming && daysUntilStart !== null && daysUntilStart > 0 && (
            <p className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">
              Starts in {daysUntilStart} day{daysUntilStart !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* SECTION 2 — CREATOR SUMMARY CARD */}
        {currentCreator && creatorProfile && (
          <div className="px-6 py-8">
            <div className="bg-white border-2 border-[#1D1D1D] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <ImageWithFallback
                    src={creatorProfile.avatar_url || "https://via.placeholder.com/100"}
                    className="w-16 h-16 border-2 border-[#1D1D1D] grayscale object-cover rounded-none"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic">{creatorProfile.full_name}</h2>
                      {creatorProfile.verified && <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />}
                    </div>
                    <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                      {creatorProfile.username || `@${creatorProfile.full_name.toLowerCase().replace(/\s/g, "")}`}
                    </p>
                  </div>
                </div>

                <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />

                <div className="space-y-4">
                  <div className="flex items-start gap-4 italic">
                    <Star className="w-4 h-4 text-[#FEDB71] mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Package</p>
                      <p className="text-[11px] font-black uppercase tracking-tight">{currentCreator.streams_target} Streams</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 italic">
                    <Tag className="w-4 h-4 text-[#389C9A] mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Campaign Type</p>
                      <p className="text-[11px] font-black uppercase tracking-tight">{campaign.type}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 italic">
                    <Calendar className="w-4 h-4 text-[#D2691E] mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Start Date</p>
                      <p className="text-[11px] font-black uppercase tracking-tight">
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "TBC"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 italic">
                    <Clock className="w-4 h-4 text-[#D2691E] mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Stream Deadline</p>
                      <p className="text-[11px] font-black uppercase tracking-tight">
                        Complete all streams by {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "TBC"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-[#1D1D1D]/10 my-6" />

                <div className="flex items-center justify-between italic">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Campaign Value</p>
                    <p className="text-3xl font-black tracking-tighter text-[#1D1D1D]">₦{totalBudget.toLocaleString()}</p>
                  </div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 text-right max-w-[120px]">
                    Released per verified stream cycle
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3 — CAMPAIGN PROGRESS */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Campaign Progress</h3>
          
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-end mb-4 italic">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Streams Completed</p>
                <h4 className="text-2xl font-black tracking-tighter">
                  {currentCreator?.streams_completed || 0} of {currentCreator?.streams_target || 0}
                </h4>
              </div>
              <p className="text-[12px] font-black uppercase italic tracking-widest text-[#1D1D1D]/20">
                {Math.round(progressPercent)}% Complete
              </p>
            </div>

            <div className="h-4 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-8 border border-[#1D1D1D]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-[#389C9A]"
              />
            </div>

            <div className="h-[1px] bg-[#1D1D1D]/10 mb-8" />

            <div className="grid grid-cols-3 gap-4 italic text-center">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Verified Streams</p>
                <p className="text-xl font-black tracking-tighter">{currentCreator?.streams_completed || 0}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Awaiting Verification</p>
                <p className="text-xl font-black tracking-tighter text-[#D2691E]">
                  {currentCreator && currentCreator.streams_completed < currentCreator.streams_target ? 1 : 0}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Remaining</p>
                <p className="text-xl font-black tracking-tighter">
                  {(currentCreator?.streams_target || 0) - (currentCreator?.streams_completed || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4 — FINANCIAL SUMMARY */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Financial Summary</h3>
          
          <div className="bg-white border-2 border-[#1D1D1D] mb-12">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Total Campaign Value</span>
                <span className="text-lg font-black tracking-tighter">₦{totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Released to Creator So Far</span>
                <span className="text-lg font-black tracking-tighter">₦{releasedSoFar.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Remaining Held</span>
                <span className="text-lg font-black tracking-tighter">₦{remainingHeld.toLocaleString()}</span>
              </div>
              
              <div className="h-[1px] bg-[#1D1D1D]/10 my-4" />
              
              <div className="flex items-start gap-3 bg-[#F8F8F8] p-4 border border-[#1D1D1D]/5 italic">
                <Shield className="w-4 h-4 text-[#D2691E] flex-shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-tight leading-relaxed text-[#1D1D1D]/60">
                  Any unverified streams will be refunded to your original payment method within 3 to 5 business days.
                </p>
              </div>
            </div>
          </div>

          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-40 italic">Payout Release Schedule</h4>
          <div className="flex flex-col gap-3">
            {payoutSchedule.map((row, i) => (
              <div key={i} className="bg-white border border-[#1D1D1D]/10 p-5 flex items-center justify-between italic">
                <div>
                  <p className="text-[10px] font-black uppercase mb-1">{row.label}</p>
                  <p className="text-lg font-black tracking-tighter">₦{Number(row.amount).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1 border text-[8px] font-black uppercase tracking-widest italic ${
                  row.status === "Paid" ? "bg-[#389C9A] text-white border-[#389C9A]" : "bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10"
                }`}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5 — STREAM LOG */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Stream Log</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
            Every stream {creatorProfile?.full_name || "the creator"} has completed for this campaign.
          </p>

          <div className="flex flex-col gap-4 mb-8">
            {streamLog.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-6 flex items-center justify-between italic">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight leading-none">Stream {stream.num}</p>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{stream.date || "TBC"}</p>
                  {stream.duration && (
                    <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic opacity-40">{stream.duration}</p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className={`px-2 py-0.5 border text-[7px] font-black uppercase tracking-widest italic ${
                    stream.status === "Verified" ? "bg-[#389C9A] text-white border-[#389C9A]" :
                    stream.status === "Awaiting Proof" ? "bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10" :
                    "bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10"
                  }`}>
                    {stream.status === "Verified" ? "✓ Verified" : stream.status === "Awaiting Proof" ? "⏳ Awaiting Proof" : "Upcoming"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {streamLog.length < (currentCreator?.streams_target || 0) && (
            <button className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 underline italic">
              Show All Streams →
            </button>
          )}
        </div>

        {/* SECTION 6 — BANNER (if exists) */}
        {campaign.banner_url && (
          <div className="px-6 py-12 border-b-2 border-[#1D1D1D]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Your Active Banner</h3>
            <div className="bg-black border-2 border-[#1D1D1D] overflow-hidden mb-6 opacity-40 grayscale">
              <ImageWithFallback src={campaign.banner_url} className="w-full h-auto grayscale opacity-80" />
            </div>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic text-center mb-8">
              This banner is scheduled to go live on the creator's streams.
            </p>
            <button className="w-full bg-white border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-[#F8F8F8] transition-all italic">
              <Download className="w-4 h-4 text-[#D2691E]" /> Download Banner
            </button>
          </div>
        )}

        {/* SECTION 7 — PROMO CODE PERFORMANCE (placeholder) */}
        <div className="px-6 py-12 bg-[#FFF8DC]/30 border-b-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Promo Code Performance</h3>
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-center mb-6 italic">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Active Code</span>
              <span className="text-3xl font-black tracking-tighter text-[#1D1D1D]/20">Coming Soon</span>
            </div>
            <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />
            <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic text-center">
              Performance data will appear here once the campaign goes live.
            </p>
          </div>
        </div>

        {/* SECTION 8 — COMMUNICATION */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Communication</h3>
          
          {creatorProfile && (
            <div
              onClick={() => navigate(`/messages?userId=${creatorProfile.id}&role=business`)}
              className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 flex items-center gap-4 mb-6 cursor-pointer active:bg-[#1D1D1D]/5 transition-colors"
            >
              <ImageWithFallback src={creatorProfile.avatar_url || "https://via.placeholder.com/100"} className="w-10 h-10 border border-[#1D1D1D]/10 grayscale object-cover rounded-none" />
              <div className="flex-1 min-w-0 italic">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-black uppercase">{creatorProfile.full_name}</h4>
                  <span className="text-[8px] font-bold text-[#1D1D1D]/30 uppercase tracking-widest">Now</span>
                </div>
                <p className="text-[10px] font-medium text-[#1D1D1D]/60 truncate uppercase tracking-tight">
                  Ready to start the campaign?
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => creatorProfile && navigate(`/messages?userId=${creatorProfile.id}&role=business`)}
            className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all mb-6"
          >
            <MessageSquare className="w-6 h-6 text-[#FEDB71]" /> Message {creatorProfile?.full_name || "Creator"}
          </button>
          
          <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-4 mb-4 italic">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-tight">
              All communication must remain within LiveLink. Moving conversations outside the platform will result in immediate account closure and forfeiture of all funds.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 opacity-30 italic">
            <Lock className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Secured Messaging Active</span>
          </div>
        </div>

        {/* SECTION 9 — CAMPAIGN ACTIONS */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D] mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Actions</h3>
          
          <div className="flex flex-col gap-1 border border-[#1D1D1D]/10 bg-[#1D1D1D]/10">
            {[
              { icon: Download, label: "Download Campaign Report", subtext: "Export a full PDF summary of this campaign", color: "#389C9A" },
              { icon: Flag, label: "Report a Campaign Issue", subtext: "Raise a dispute or report a problem", color: "#D2691E" },
              { icon: Repeat, label: "Rebook This Creator", subtext: "Start a new campaign with the same creator", color: "#1D1D1D" }
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.label === "Download Campaign Report") toast.info("Report generation coming soon");
                  else if (action.label === "Report a Campaign Issue") navigate(`/report/campaign/${campaignId}`);
                  else if (action.label === "Rebook This Creator") navigate(`/business/create-campaign?creator=${currentCreator?.creator_id}`);
                }}
                className="w-full bg-white p-6 flex items-center gap-4 text-left active:bg-[#F8F8F8] transition-all italic"
              >
                <div className="w-10 h-10 flex items-center justify-center border border-[#1D1D1D]/10 bg-[#F8F8F8]">
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{action.label}</h4>
                  <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{action.subtext}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
