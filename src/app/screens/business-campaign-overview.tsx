import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Calendar,
  Tag,
  Tv,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Shield,
  Users,
  Download,
  Star,
  Lock,
  Flag,
  Repeat,
  MessageSquare,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// ─────────────────────────────────────────────
// CONFIRM TOAST HELPER
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// TYPES
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
  creator_id: string;
  status: string;
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  creator?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    user_id: string;
  };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function BusinessCampaignOverview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null);

  const campaignChannelRef = useRef<any>(null);
  const creatorsChannelRef = useRef<any>(null);

  // ─── FETCH DATA ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch creators with their profile info (including user_id for notifications)
      const { data: creatorsData, error: creatorsError } = await supabase
        .from("campaign_creators")
        .select(`
          *,
          creator:creator_id (
            id,
            name:full_name,
            username,
            avatar_url,
            user_id
          )
        `)
        .eq("campaign_id", id);
      if (creatorsError) throw creatorsError;
      setCreators(creatorsData || []);

      setLastUpdated(new Date());
      if (silent) toast.success("Data refreshed");
    } catch (error) {
      console.error("Error fetching campaign overview:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // ─── REAL‑TIME SUBSCRIPTIONS ───────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    fetchData();

    const subscribe = () => {
      campaignChannelRef.current = supabase
        .channel(`campaign-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "campaigns",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            setCampaign((prev) => (prev ? { ...prev, ...payload.new } : prev));
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setIsRealtimeConnected(true);
          else if (status === "CHANNEL_ERROR") setIsRealtimeConnected(false);
        });

      creatorsChannelRef.current = supabase
        .channel(`campaign-creators-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_creators",
            filter: `campaign_id=eq.${id}`,
          },
          () => {
            fetchData(true);
          }
        )
        .subscribe();
    };

    subscribe();

    const pollInterval = setInterval(() => {
      if (!isRealtimeConnected) fetchData(true);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      campaignChannelRef.current?.unsubscribe();
      creatorsChannelRef.current?.unsubscribe();
    };
  }, [id, fetchData, isRealtimeConnected]);

  // ─── UPDATE CREATOR STATUS (APPROVE / REJECT) ──────────────────────────

  const updateCreatorStatus = async (
    campaignCreatorId: string,
    newStatus: "active" | "declined",
    creatorUserId?: string,
    creatorName?: string
  ) => {
    const ok = await confirmToast(`${newStatus === "active" ? "Approve" : "Reject"} ${creatorName || "this creator"}?`);
    if (!ok) return;

    setUpdatingCreatorId(campaignCreatorId);
    try {
      const targetStatus = newStatus === "active" ? "active" : "declined";
      const updates: any = {
        status: targetStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "active") {
        updates.accepted_at = new Date().toISOString();
        updates.streams_target = campaign?.streams_required;
      }

      console.log(`[Update] Updating campaign_creator ${campaignCreatorId} to status: ${targetStatus}`);
      const { data, error } = await supabase
        .from("campaign_creators")
        .update(updates)
        .eq("id", campaignCreatorId)
        .select();

      if (error) {
        console.error("[Update] Supabase error:", error);
        throw error;
      }
      console.log("[Update] Success:", data);

      // Optimistic UI update: change the creator's status locally
      setCreators(prev => prev.map(c => 
        c.id === campaignCreatorId 
          ? { 
              ...c, 
              status: targetStatus,
              streams_target: targetStatus === "active" ? (campaign?.streams_required || c.streams_target) : c.streams_target
            }
          : c
      ));

      // Notify the creator (non‑blocking)
      if (creatorUserId) {
        try {
          await supabase.from("notifications").insert({
            user_id: creatorUserId,
            type: newStatus === "active" ? "campaign_accepted" : "campaign_rejected",
            title: newStatus === "active" ? "Campaign Invitation Accepted ✅" : "Campaign Application Rejected",
            message: newStatus === "active"
              ? `Your application for campaign "${campaign?.name}" has been approved!`
              : `Your application for campaign "${campaign?.name}" was not accepted.`,
            data: { campaign_id: campaign?.id },
            created_at: new Date().toISOString(),
          });
        } catch (notifErr) {
          console.warn("[Update] Notification failed:", notifErr);
        }
      }

      toast.success(`Creator ${newStatus === "active" ? "approved" : "rejected"}!`);
      // Background refresh to ensure consistency
      await fetchData(true);
    } catch (err: any) {
      console.error("[Update] Error:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingCreatorId(null);
    }
  };

  // ─── LOADING & ERROR STATES ────────────────────────────────────────────

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

  // ─── DERIVED DATA ───────────────────────────────────────────────────────

  const totalBudget = campaign.budget || 0;
  const totalCreators = creators.length;
  const activeCreators = creators.filter(c => c.status === "active").length;
  const notStartedCreators = creators.filter(c => c.status === "not_started" || c.status === "pending").length;
  const completedStreams = creators.reduce((sum, c) => sum + c.streams_completed, 0);
  const totalStreams = campaign.streams_required || 0;
  const streamProgress = totalStreams > 0 ? (completedStreams / totalStreams) * 100 : 0;

  // For the main card, pick the first creator if available
  const primaryCreator = creators[0]?.creator;
  const creatorAvatar = primaryCreator?.avatar_url || "https://via.placeholder.com/100?text=Creator";
  const creatorName = primaryCreator?.name || (creators.length > 0 ? "Creator" : "Your Campaign");
  const creatorUsername = primaryCreator?.username || "";

  const payoutAmount = totalBudget / (creators.length || 1) / 4; // per stream group
  const payoutSchedule = Array.from({ length: Math.ceil(totalStreams / 4) }, (_, i) => ({
    label: `After Streams ${i * 4 + 1}–${Math.min((i + 1) * 4, totalStreams)} verified`,
    amount: `₦${payoutAmount.toFixed(2)}`,
    status: i * 4 < completedStreams ? "Released" : "Upcoming",
  }));

  const streamLog = Array.from({ length: Math.min(totalStreams, 10) }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    date: i < completedStreams ? "Completed" : "Scheduled",
    status: i < completedStreams ? "Verified" : "Upcoming",
  }));

  const bannerUrl = campaign.banner_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=400&fit=crop";

  const promoCode = {
    code: "WELCOME20",
    totalUses: 0,
    usesThisWeek: 0,
    estRevenue: "₦0",
  };

  const isCampaignUpcoming = campaign.status === "pending_review" || (campaign.start_date && new Date(campaign.start_date) > new Date());
  const startDate = campaign.start_date ? new Date(campaign.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBC";
  const endDate = campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBC";

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      {/* Header with back button and title */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-[#1D1D1D] px-8 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-center flex-1">Campaign Overview</h1>
        <button onClick={() => fetchData(true)} disabled={refreshing} className="p-1">
          {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
        </button>
      </div>

      {/* Realtime status bar */}
      <div className="px-8 py-2.5 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
          <span className="text-[8px] text-[#1D1D1D]/30">· Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      <main className="flex-1">
        {/* Campaign Status Banner */}
        <div className="w-full bg-[#FFF8DC] border-b-2 border-[#1D1D1D] px-8 py-4 flex items-center justify-between italic">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#D2691E]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">
              {isCampaignUpcoming ? "Upcoming" : campaign.status === "active" ? "Active" : "Completed"}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">
            {isCampaignUpcoming && campaign.start_date
              ? `Starts in ${Math.ceil((new Date(campaign.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
              : campaign.status === "active"
              ? "Live now"
              : "Ended"}
          </p>
        </div>

        {/* ALL CREATORS LIST - with Approve/Reject buttons for pending creators */}
        {creators.length > 0 && (
          <div className="px-8 py-8 border-b border-[#1D1D1D]/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 italic mb-6">
              All Creators ({creators.length})
            </h3>

            <div className="flex flex-col gap-4">
              {creators.map((creator) => {
                // Case‑insensitive pending detection
                const statusLower = creator.status?.toLowerCase() || "";
                const isPending = statusLower.includes('pending') || statusLower === 'not_started' || statusLower === 'not started';
                // Determine display text for badge
                let displayStatus = "PENDING";
                if (creator.status === "active") displayStatus = "ACTIVE";
                else if (creator.status === "not_started") displayStatus = "NOT STARTED";
                else if (creator.status === "declined") displayStatus = "DECLINED";
                else if (statusLower.includes('pending')) displayStatus = "PENDING";

                return (
                  <div
                    key={creator.id}
                    className="bg-white border-2 border-[#1D1D1D] p-5 flex flex-col gap-4 cursor-pointer active:scale-[0.98] transition-all group"
                    onClick={() => navigate(`/business/campaign/${campaign.id}/creator/${creator.creator_id}`)}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 border-2 border-[#1D1D1D] overflow-hidden shrink-0">
                        <ImageWithFallback
                          src={creator.creator?.avatar_url || "https://via.placeholder.com/100"}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black uppercase tracking-tight text-lg italic leading-none truncate">
                          {creator.creator?.name || "Creator"}
                        </h4>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic mb-2">
                          {creator.creator?.username || "@creator"}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Tv className="w-3 h-3 text-[#389C9A]" />
                            <span className="text-[9px] font-black uppercase tracking-tight italic">
                              Streams: {creator.streams_completed}/{creator.streams_target}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest italic border ${
                          displayStatus === "ACTIVE" ? "bg-[#389C9A] text-white border-[#389C9A]" :
                          displayStatus === "NOT STARTED" ? "bg-gray-100 text-gray-400 border-gray-200" :
                          displayStatus === "DECLINED" ? "bg-red-100 text-red-400 border-red-200" :
                          "bg-[#FEDB71] text-[#1D1D1D] border-[#FEDB71]"
                        }`}>
                          {displayStatus}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/business/messages/${campaign.id}/creator/${creator.creator_id}`);
                          }}
                          className="p-1 hover:bg-[#F8F8F8] rounded transition-colors"
                          title="Message this creator"
                        >
                          <MessageSquare className="w-4 h-4 text-[#389C9A]" />
                        </button>
                      </div>
                    </div>

                    {/* Approve/Reject buttons for pending creators */}
                    {isPending && (
                      <div className="flex gap-2 pt-2 border-t border-[#1D1D1D]/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCreatorStatus(
                              creator.id,
                              "active",
                              creator.creator?.user_id,
                              creator.creator?.name
                            );
                          }}
                          disabled={updatingCreatorId === creator.id}
                          className="flex-1 py-2 bg-green-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {updatingCreatorId === creator.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCreatorStatus(
                              creator.id,
                              "declined",
                              creator.creator?.user_id,
                              creator.creator?.name
                            );
                          }}
                          disabled={updatingCreatorId === creator.id}
                          className="flex-1 py-2 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {updatingCreatorId === creator.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Creator Summary Card (unchanged) */}
        <div className="px-8 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ImageWithFallback
                  src={creatorAvatar}
                  className="w-16 h-16 border-2 border-[#1D1D1D] object-cover rounded-none"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">{creatorName}</h2>
                    {primaryCreator && <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />}
                  </div>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                    {creatorUsername || campaign.name}
                  </p>
                </div>
              </div>

              <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />

              <div className="space-y-4">
                <div className="flex items-start gap-4 italic">
                  <Star className="w-4 h-4 text-[#FEDB71] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Package</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{totalStreams} Streams</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Tag className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Campaign Type</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{campaign.type || "Banner Only"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Calendar className="w-4 h-4 text-[#D2691E] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Start Date</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{startDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Clock className="w-4 h-4 text-[#D2691E] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">End Date</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{endDate}</p>
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

        {/* Quick Stats: Creators Summary */}
        <div className="px-8 py-8 grid grid-cols-3 gap-3 border-b border-[#1D1D1D]/10">
          {[
            { label: "Total Creators", value: totalCreators, icon: Users },
            { label: "Active", value: activeCreators, icon: CheckCircle2 },
            { label: "Not Started", value: notStartedCreators, icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#F8F8F8] rounded-xl p-4 text-center border border-[#1D1D1D]/5">
              <stat.icon className="w-5 h-5 mx-auto mb-2 text-[#389C9A]" />
              <p className="text-xl font-black">{stat.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Campaign Progress */}
        <div className="px-8 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Campaign Progress</h3>

          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-end mb-4 italic">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Streams Completed</p>
                <h4 className="text-2xl font-black tracking-tighter text-[#1D1D1D]/20">{completedStreams} of {totalStreams}</h4>
              </div>
              <p className="text-[12px] font-black uppercase italic tracking-widest text-[#1D1D1D]/20">{Math.round(streamProgress)}% Complete</p>
            </div>

            <div className="h-4 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-8 border border-[#1D1D1D]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${streamProgress}%` }}
                className="h-full bg-[#389C9A]"
              />
            </div>

            <div className="h-[1px] bg-[#1D1D1D]/10 mb-8" />

            <div className="grid grid-cols-3 gap-4 italic text-center">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Verified Streams</p>
                <p className="text-xl font-black tracking-tighter">{completedStreams}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Awaiting Verification</p>
                <p className="text-xl font-black tracking-tighter text-[#D2691E]">0</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Remaining</p>
                <p className="text-xl font-black tracking-tighter">{totalStreams - completedStreams}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="px-8 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Financial Summary</h3>

          <div className="bg-white border-2 border-[#1D1D1D] mb-12">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Total Campaign Value</span>
                <span className="text-lg font-black tracking-tighter">₦{totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Released to Creators So Far</span>
                <span className="text-lg font-black tracking-tighter text-[#1D1D1D]/20">₦0.00</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Remaining Held</span>
                <span className="text-lg font-black tracking-tighter">₦{totalBudget.toLocaleString()}</span>
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
                  <p className="text-lg font-black tracking-tighter">{row.amount}</p>
                </div>
                <div className={`px-3 py-1 border text-[8px] font-black uppercase tracking-widest italic ${row.status === "Released" ? "bg-[#389C9A] text-white border-[#389C9A]" : "bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10"}`}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stream Log */}
        <div className="px-8 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Stream Log</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
            Every stream completed for this campaign.
          </p>

          <div className="flex flex-col gap-4 mb-8">
            {streamLog.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-6 flex items-center justify-between italic">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight leading-none">Stream {stream.number}</p>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{stream.date}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className={`px-2 py-0.5 border text-[7px] font-black uppercase tracking-widest italic ${stream.status === "Verified" ? "bg-[#389C9A] text-white border-[#389C9A]" : "bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10"}`}>
                    {stream.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 underline italic">
            Show All Streams →
          </button>
        </div>

        {/* Your Active Banner */}
        <div className="px-8 py-12 border-b-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Your Active Banner</h3>

          <div className="bg-black border-2 border-[#1D1D1D] overflow-hidden mb-6 opacity-40 grayscale">
            <ImageWithFallback src={bannerUrl} className="w-full h-auto grayscale opacity-80" />
          </div>

          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic text-center mb-8">
            This banner is scheduled to go live on creator streams from {startDate}.
          </p>

          <button className="w-full bg-white border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-[#F8F8F8] transition-all italic">
            <Download className="w-4 h-4 text-[#D2691E]" /> Download Banner
          </button>
        </div>

        {/* Promo Code Performance (if applicable) */}
        {(campaign.type?.includes("Promo") || campaign.type?.includes("Code")) && (
          <div className="px-8 py-12 bg-[#FFF8DC]/30 border-b-2 border-[#1D1D1D]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Promo Code Performance</h3>

            <div className="bg-white border-2 border-[#1D1D1D] p-8">
              <div className="flex justify-between items-center mb-6 italic">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Active Code</span>
                <span className="text-3xl font-black tracking-tighter text-[#1D1D1D]/20">{promoCode.code}</span>
              </div>

              <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />

              <div className="space-y-4 italic">
                <div className="flex justify-between items-center opacity-40">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Total Uses</span>
                  <span className="text-lg font-black tracking-tighter">{promoCode.totalUses}</span>
                </div>
                <div className="flex justify-between items-center opacity-40">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Uses This Week</span>
                  <span className="text-lg font-black tracking-tighter">{promoCode.usesThisWeek}</span>
                </div>
                <div className="flex justify-between items-center opacity-40">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Est. Revenue Generated</span>
                  <span className="text-lg font-black tracking-tighter">{promoCode.estRevenue}</span>
                </div>
              </div>

              <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mt-8 italic text-center">
                Performance data will appear here once the campaign goes live.
              </p>
            </div>
          </div>
        )}

        {/* Communication policy warning */}
        <div className="px-8 py-12">
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

        {/* Campaign Actions */}
        <div className="px-8 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D] mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Actions</h3>

          <div className="flex flex-col gap-1 border border-[#1D1D1D]/10 bg-[#1D1D1D]/10">
            {[
              { icon: Download, label: "Download Campaign Report", subtext: "Export a full PDF summary of this campaign", color: "#389C9A" },
              { icon: Flag, label: "Report a Campaign Issue", subtext: "Raise a dispute or report a problem", color: "#D2691E" },
              { icon: Repeat, label: "Rebook This Campaign", subtext: "Start a new campaign with the same terms", color: "#1D1D1D" },
            ].map((action, i) => (
              <button
                key={i}
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
