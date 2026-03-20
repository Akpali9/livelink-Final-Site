import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronRight,
  Star,
  Tv,
  Users,
  DollarSign,
  Search,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  rating: number;
  email: string;
  avg_concurrent: number;
  categories: string[];
  niche: string[];
  country: string;
  location: string;
}

interface CampaignCreator {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: "pending" | "active" | "completed" | "rejected";
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
  creator: Creator;
}

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
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  totalStreams: number;
  completedStreams: number;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-[#389C9A] text-white",
  pending:   "bg-[#FEDB71] text-[#1D1D1D]",
  completed: "bg-green-500 text-white",
  rejected:  "bg-red-500 text-white",
};

function getProgress(completed: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

function calcStats(list: CampaignCreator[]): Stats {
  return {
    total:            list.length,
    active:           list.filter((c) => c.status === "active").length,
    pending:          list.filter((c) => c.status === "pending").length,
    completed:        list.filter((c) => c.status === "completed").length,
    totalStreams:     list.reduce((s, c) => s + c.streams_target, 0),
    completedStreams: list.reduce((s, c) => s + c.streams_completed, 0),
  };
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BusinessCampaignCreators() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [creators, setCreators]     = useState<CampaignCreator[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdated, setLastUpdated]   = useState<Date>(new Date());
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, pending: 0, completed: 0,
    totalStreams: 0, completedStreams: 0,
  });

  // Keep a ref to profileMap so realtime handlers can enrich new rows
  const profileMapRef = useRef<Record<string, any>>({});

  // ─── FETCH ─────────────────────────────────────────────────────────────

  const fetchCampaignData = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // 2. campaign_creators rows
      const { data: ccRows, error: ccError } = await supabase
        .from("campaign_creators")
        .select(`
          id,
          campaign_id,
          creator_id,
          status,
          streams_completed,
          streams_target,
          total_earnings,
          paid_out,
          created_at
        `)
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      if (ccError) throw ccError;
      if (!ccRows || ccRows.length === 0) {
        setCreators([]);
        setStats(calcStats([]));
        return;
      }

      // 3. Fetch creator_profiles for all creator_ids
      const creatorIds = [...new Set(ccRows.map((r) => r.creator_id).filter(Boolean))];

      const { data: profileRows, error: profileError } = await supabase
        .from("creator_profiles")
        .select(`
          id, full_name, username, email,
          avatar_url, rating, avg_concurrent,
          avg_viewers, categories, niche, country, location
        `)
        .in("id", creatorIds);

      if (profileError) throw profileError;

      // 4. Build lookup map and store in ref for realtime use
      const pMap: Record<string, any> = {};
      (profileRows || []).forEach((p) => { pMap[p.id] = p; });
      profileMapRef.current = pMap;

      // 5. Merge
      const merged = buildMerged(ccRows, pMap);
      setCreators(merged);
      setStats(calcStats(merged));
      setLastUpdated(new Date());

      if (silent) toast.success("Campaign data refreshed");
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // ─── REALTIME ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    fetchCampaignData();

    // Subscribe to campaign_creators changes for this campaign
    const channel = supabase
      .channel(`campaign-creators-${id}`)

      // New creator added to campaign
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_creators",
          filter: `campaign_id=eq.${id}`,
        },
        async (payload) => {
          const row = payload.new;

          // Fetch their profile if not already cached
          let profile = profileMapRef.current[row.creator_id];
          if (!profile) {
            const { data } = await supabase
              .from("creator_profiles")
              .select(`
                id, full_name, username, email,
                avatar_url, rating, avg_concurrent,
                avg_viewers, categories, niche, country, location
              `)
              .eq("id", row.creator_id)
              .maybeSingle();
            if (data) {
              profileMapRef.current[data.id] = data;
              profile = data;
            }
          }

          const newEntry = buildSingleEntry(row, profile || {});

          setCreators((prev) => {
            // Avoid duplicates
            if (prev.find((c) => c.id === row.id)) return prev;
            const updated = [newEntry, ...prev];
            setStats(calcStats(updated));
            return updated;
          });

          toast.success(`New creator joined: ${newEntry.creator.name}`);
          setLastUpdated(new Date());
        }
      )

      // Status / streams updated
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_creators",
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new;

          setCreators((prev) => {
            const updated = prev.map((c) => {
              if (c.id !== row.id) return c;
              return {
                ...c,
                status:            (row.status || c.status).toLowerCase() as any,
                streams_completed: row.streams_completed ?? c.streams_completed,
                streams_target:    row.streams_target ?? c.streams_target,
                total_earnings:    row.total_earnings ?? c.total_earnings,
                paid_out:          row.paid_out ?? c.paid_out,
              };
            });
            setStats(calcStats(updated));
            return updated;
          });

          setLastUpdated(new Date());
        }
      )

      // Creator removed
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "campaign_creators",
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          setCreators((prev) => {
            const updated = prev.filter((c) => c.id !== payload.old.id);
            setStats(calcStats(updated));
            return updated;
          });
          setLastUpdated(new Date());
        }
      )

      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to campaign-creators-${id}`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  // ─── MERGE HELPERS ─────────────────────────────────────────────────────

  function buildSingleEntry(row: any, p: any): CampaignCreator {
    return {
      id:                row.id,
      campaign_id:       row.campaign_id,
      creator_id:        row.creator_id,
      status:            (row.status || "pending").toLowerCase() as any,
      streams_completed: row.streams_completed || 0,
      streams_target:    row.streams_target || 4,
      total_earnings:    row.total_earnings || 0,
      paid_out:          row.paid_out || 0,
      created_at:        row.created_at,
      creator: {
        id:             p.id || row.creator_id,
        name:           p.full_name || "Unknown Creator",
        username:       p.username ? `@${p.username}` : "@creator",
        avatar:         p.avatar_url || "",
        rating:         p.rating || 0,
        email:          p.email || "",
        avg_concurrent: p.avg_concurrent || p.avg_viewers || 0,
        categories:     p.categories || p.niche || [],
        niche:          p.niche || p.categories || [],
        country:        p.country || "",
        location:       p.location || "",
      },
    };
  }

  function buildMerged(ccRows: any[], pMap: Record<string, any>): CampaignCreator[] {
    return ccRows.map((row) => buildSingleEntry(row, pMap[row.creator_id] || {}));
  }

  // ─── ACTIONS ───────────────────────────────────────────────────────────

  const updateStatus = async (ccId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({
          status: newStatus,
          ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === "active"    ? { accepted_at:  new Date().toISOString() } : {}),
        })
        .eq("id", ccId);

      if (error) throw error;
      // Realtime UPDATE will update local state automatically
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const markPaid = async (ccId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ paid_out: amount })
        .eq("id", ccId);

      if (error) throw error;
      // Realtime UPDATE handles local state
      toast.success("Marked as paid");
    } catch (error) {
      console.error("Error marking paid:", error);
      toast.error("Failed to mark as paid");
    }
  };

  const openMessage = async (creatorProfileId: string) => {
    if (!user) return;

    try {
      // Get user_id from creator_profiles
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("id", creatorProfileId)
        .maybeSingle();

      if (!profile?.user_id) { toast.error("Cannot find creator account"); return; }
      const creatorUserId = profile.user_id;

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorUserId}),` +
          `and(participant1_id.eq.${creatorUserId},participant2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        navigate(`/messages/${existing.id}?role=business`);
        return;
      }

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant1_id:   user.id,
          participant2_id:   creatorUserId,
          participant1_type: "business",
          participant2_type: "creator",
          last_message_at:   new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/messages/${newConv.id}?role=business`);
    } catch (error) {
      console.error("Error opening message:", error);
      toast.error("Failed to open conversation");
    }
  };

  // ─── FILTER ────────────────────────────────────────────────────────────

  const filtered = creators.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      c.creator.name.toLowerCase().includes(q) ||
      c.creator.username.toLowerCase().includes(q) ||
      c.creator.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── LOADING ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" userType="business" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-gray-400">Loading creators...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" userType="business" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-200 mb-4" />
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

  // ─── RENDER ────────────────────────────────────────────────────────────

  const streamProgress = stats.totalStreams > 0
    ? Math.round((stats.completedStreams / stats.totalStreams) * 100)
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-20 max-w-[480px] mx-auto w-full">
      <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" userType="business" />

      <main className="flex-1">

        {/* ── Campaign Header ── */}
        <section className="px-6 py-8 bg-gradient-to-br from-[#1D1D1D] to-gray-800 text-white">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-tight mb-1">
                {campaign.name}
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-widest">{campaign.type}</p>
            </div>
            <span className={`ml-3 shrink-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${
              campaign.status?.toLowerCase() === "active"
                ? "bg-[#389C9A] text-white"
                : "bg-gray-600 text-gray-200"
            }`}>
              {campaign.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Budget</p>
              <p className="text-xl font-black">₦{Number(campaign.budget || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Streams Required</p>
              <p className="text-xl font-black">{campaign.streams_required || "—"}</p>
            </div>
          </div>
        </section>

        {/* ── Realtime Status Bar ── */}
        <div className="px-6 py-2.5 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
            <span className="text-[8px] text-[#1D1D1D]/30">
              · Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <button
            onClick={() => fetchCampaignData(true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-[#F8F8F8] rounded-lg transition-colors disabled:opacity-50"
          >
            {refreshing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            <span className="text-[8px] font-black uppercase tracking-widest">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>

        {/* ── Progress Stats ── */}
        <section className="px-6 py-6 border-b border-[#1D1D1D]/10">
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 opacity-40">Campaign Progress</h2>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: "Total",   value: stats.total,     color: "text-[#1D1D1D]" },
              { label: "Active",  value: stats.active,    color: "text-[#389C9A]" },
              { label: "Pending", value: stats.pending,   color: "text-[#FEDB71]" },
              { label: "Done",    value: stats.completed, color: "text-green-500" },
            ].map((s) => (
              <div key={s.label} className="text-center bg-[#F8F8F8] rounded-xl py-3">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1.5">
              <span>Stream Progress</span>
              <span>{stats.completedStreams} / {stats.totalStreams}</span>
            </div>
            <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#389C9A] rounded-full"
                animate={{ width: `${streamProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-right text-[8px] font-black opacity-40 mt-1">{streamProgress}%</p>
          </div>
        </section>

        {/* ── Search & Filter ── */}
        <section className="px-6 py-4 border-b border-[#1D1D1D]/10">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#E8E8E8] focus:border-[#1D1D1D] outline-none text-sm rounded-xl transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border-2 border-[#E8E8E8] focus:border-[#1D1D1D] outline-none text-[10px] font-black uppercase rounded-xl"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </section>

        {/* ── Creators List ── */}
        <section className="px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Creators</h3>
            <span className="text-[9px] font-black bg-[#F8F8F8] px-3 py-1 rounded-full">
              {filtered.length} of {creators.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-[#E8E8E8] rounded-2xl">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-black uppercase tracking-wide opacity-30">No creators found</p>
              <p className="text-xs opacity-20 mt-1">
                {creators.length === 0 ? "No creators have joined yet" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="flex flex-col gap-4">
                {filtered.map((item) => {
                  const c = item.creator;
                  const progress = getProgress(item.streams_completed, item.streams_target);
                  const isPaid = item.paid_out >= item.total_earnings && item.total_earnings > 0;
                  const tags = (c.categories?.length ? c.categories : c.niche) || [];

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="relative bg-white border-2 border-[#1D1D1D] rounded-2xl p-5 group"
                    >
                      {/* Status badge */}
                      <div className={`absolute -top-3 right-5 px-3 py-1 text-[7px] font-black uppercase tracking-widest rounded-full ${
                        STATUS_STYLES[item.status] || "bg-gray-200 text-gray-600"
                      }`}>
                        {item.status}
                      </div>

                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div
                          className="w-14 h-14 border-2 border-[#1D1D1D]/10 overflow-hidden rounded-xl shrink-0 bg-[#F8F8F8] cursor-pointer"
                          onClick={() => navigate(`/profile/${c.id}`)}
                        >
                          <ImageWithFallback
                            src={c.avatar}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4
                              className="font-black text-sm uppercase tracking-tight truncate cursor-pointer hover:text-[#389C9A] transition-colors"
                              onClick={() => navigate(`/profile/${c.id}`)}
                            >
                              {c.name}
                            </h4>
                            {c.rating > 0 && (
                              <span className="flex items-center gap-0.5 text-[7px] font-black bg-[#FEDB71] px-1.5 py-0.5 rounded shrink-0">
                                <Star className="w-2 h-2" />
                                {Number(c.rating).toFixed(1)}
                              </span>
                            )}
                          </div>

                          <p className="text-[9px] text-gray-400 mb-2">{c.username}</p>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-1 text-[8px] text-gray-500">
                              <Tv className="w-3 h-3 text-[#389C9A]" />
                              <span>{c.avg_concurrent || 0} avg viewers</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-gray-500">
                              <DollarSign className="w-3 h-3 text-[#389C9A]" />
                              <span>₦{Number(item.total_earnings).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Stream Progress */}
                          <div>
                            <div className="flex justify-between text-[7px] font-black uppercase tracking-widest mb-1">
                              <span>Streams</span>
                              <span>{item.streams_completed}/{item.streams_target}</span>
                            </div>
                            <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-[#389C9A] rounded-full"
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right — paid status */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isPaid ? (
                            <span className="text-[7px] font-black uppercase text-green-500 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : item.total_earnings > 0 ? (
                            <span className="text-[7px] font-black uppercase text-[#FEDB71]">Unpaid</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Category tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1D1D1D]/10">
                          {tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[7px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action row */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#1D1D1D]/10">
                        <button
                          onClick={() => openMessage(c.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-[#1D1D1D]/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white hover:border-[#1D1D1D] transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Message
                        </button>

                        {item.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(item.id, "active")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#389C9A] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#2d7a78] transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(item.id, "rejected")}
                              className="px-3 py-2 border-2 border-red-200 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {item.status === "completed" && !isPaid && (
                          <button
                            onClick={() => markPaid(item.id, item.total_earnings)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-600 transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/profile/${c.id}`)}
                          className="px-3 py-2 border-2 border-[#1D1D1D]/10 rounded-xl hover:bg-[#F8F8F8] transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 opacity-40" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </section>

        {/* ── Browse CTA ── */}
        <section className="px-6 pb-8">
          <div className="bg-gradient-to-br from-[#1D1D1D] to-gray-800 text-white p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
            <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Need more creators?</p>
            <p className="text-xl font-black uppercase tracking-tight italic mb-5">Browse the marketplace</p>
            <button
              onClick={() => navigate("/browse")}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FEDB71] hover:gap-3 transition-all"
            >
              Find Creators <ChevronRight className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/10">
              {[
                { val: "150+", label: "Available" },
                { val: "4.8",  label: "Avg Rating" },
                { val: "24h",  label: "Response" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-black text-[#389C9A]">{s.val}</p>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
