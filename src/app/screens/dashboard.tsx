import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Zap, DollarSign, Eye, Star, Bell, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, Play,
  TrendingUp, Users, Megaphone, MessageSquare,
  Calendar, Award, ArrowRight, Loader2, RefreshCw,
  Briefcase, MapPin, Video, BarChart2, Gift,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  niche?: string[];
  avg_viewers?: number;
  total_streams?: number;
  rating?: number;
  status: string;
}

interface CampaignOffer {
  id: string;
  campaign_id: string;
  status: string;
  streams_target: number;
  streams_completed: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
  campaign: {
    id: string;
    name?: string;
    title?: string;
    type?: string;
    pay_rate?: number;
    bid_amount?: number;
    business?: {
      business_name?: string;
      logo_url?: string;
    };
  };
}

interface EarningsSummary {
  totalEarned: number;
  pendingPayout: number;
  thisMonth: number;
  completedCampaigns: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatCurrency(amount: number) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n || 0);
}

function timeAgo(ts: string) {
  const diff  = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getStatusConfig(status: string) {
  switch (status) {
    case "active":
      return { label: "Active",       bg: "bg-green-100",  text: "text-green-700",  icon: <Play      className="w-3 h-3" /> };
    case "pending":
      return { label: "Pending",      bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock     className="w-3 h-3" /> };
    case "completed":
      return { label: "Completed",    bg: "bg-blue-100",   text: "text-blue-700",   icon: <CheckCircle2 className="w-3 h-3" /> };
    case "rejected":
      return { label: "Rejected",     bg: "bg-red-100",    text: "text-red-700",    icon: <XCircle   className="w-3 h-3" /> };
    default:
      return { label: status,         bg: "bg-gray-100",   text: "text-gray-600",   icon: <AlertCircle className="w-3 h-3" /> };
  }
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent = false,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border-2 ${accent ? "bg-[#1D1D1D] border-[#1D1D1D] text-white" : "bg-white border-[#1D1D1D]/10"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent ? "bg-white/10" : "bg-[#389C9A]/10"}`}>
        {icon}
      </div>
      <p className={`text-2xl font-black tracking-tight ${accent ? "text-white" : "text-[#1D1D1D]"}`}>{value}</p>
      <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${accent ? "text-white/50" : "opacity-40"}`}>{label}</p>
      {sub && <p className={`text-[8px] mt-1 ${accent ? "text-white/40" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGN CARD
// ─────────────────────────────────────────────

function CampaignCard({ offer, onClick }: { offer: CampaignOffer; onClick: () => void }) {
  const status   = getStatusConfig(offer.status);
  const campaign = offer.campaign;
  const name     = campaign?.name || campaign?.title || "Untitled Campaign";
  const biz      = campaign?.business?.business_name || "Unknown Business";
  const logo     = campaign?.business?.logo_url;
  const pending  = offer.total_earnings - offer.paid_out;
  const progress = offer.streams_target > 0
    ? Math.min(100, Math.round((offer.streams_completed / offer.streams_target) * 100))
    : 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] rounded-xl p-4 cursor-pointer transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl border-2 border-[#1D1D1D]/10 overflow-hidden bg-[#F8F8F8] shrink-0 flex items-center justify-center">
          {logo
            ? <img src={logo} alt={biz} className="w-full h-full object-cover" />
            : <Briefcase className="w-5 h-5 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-sm uppercase tracking-tight truncate">{name}</h3>
          <p className="text-[9px] text-gray-400 mt-0.5">{biz}</p>
        </div>
        <span className={`flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
          {status.icon} {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <p className="text-xs font-black text-[#389C9A]">{formatCurrency(offer.total_earnings)}</p>
          <p className="text-[6px] uppercase tracking-widest opacity-40">Earnings</p>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <p className="text-xs font-black">{offer.streams_completed}/{offer.streams_target}</p>
          <p className="text-[6px] uppercase tracking-widest opacity-40">Streams</p>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <p className="text-xs font-black text-[#FEDB71]">{formatCurrency(pending)}</p>
          <p className="text-[6px] uppercase tracking-widest opacity-40">Pending</p>
        </div>
      </div>

      {offer.status === "active" && offer.streams_target > 0 && (
        <div>
          <div className="flex justify-between text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#389C9A] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile,       setProfile]       = useState<CreatorProfile | null>(null);
  const [offers,        setOffers]        = useState<CampaignOffer[]>([]);
  const [earnings,      setEarnings]      = useState<EarningsSummary>({ totalEarned: 0, pendingPayout: 0, thisMonth: 0, completedCampaigns: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [activeFilter,  setActiveFilter]  = useState<"all" | "active" | "pending" | "completed">("all");

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // ── Fetch everything ────────────────────────────────────────────────────────

  const fetchAll = async () => {
    if (!user) return;
    try {
      await Promise.all([
        fetchProfile(),
        fetchOffers(),
        fetchNotifications(),
      ]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchOffers = async () => {
    if (!user) return;

    // Get creator profile id first
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cp) return;

    const { data, error } = await supabase
      .from("campaign_creators")
      .select(`
        id,
        campaign_id,
        status,
        streams_target,
        streams_completed,
        total_earnings,
        paid_out,
        created_at,
        campaign:campaigns (
          id,
          name,
          title,
          type,
          pay_rate,
          bid_amount,
          business:businesses (
            business_name,
            logo_url
          )
        )
      `)
      .eq("creator_id", cp.id)
      .order("created_at", { ascending: false });

    if (error) { console.error("Offers error:", error); return; }

    const offerData = (data || []) as CampaignOffer[];
    setOffers(offerData);

    // Calculate earnings
    const now       = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalEarned      = offerData.reduce((s, o) => s + (o.paid_out || 0), 0);
    const pendingPayout    = offerData.reduce((s, o) => s + Math.max(0, (o.total_earnings || 0) - (o.paid_out || 0)), 0);
    const completedCampaigns = offerData.filter(o => o.status === "completed").length;

    // This month earnings from completed/active offers
    const thisMonth = offerData
      .filter(o => new Date(o.created_at) >= monthStart)
      .reduce((s, o) => s + (o.total_earnings || 0), 0);

    setEarnings({ totalEarned, pendingPayout, thisMonth, completedCampaigns });
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    toast.success("Dashboard refreshed");
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── Filtered offers ────────────────────────────────────────────────────────

  const filteredOffers = activeFilter === "all"
    ? offers
    : offers.filter(o => o.status === activeFilter);

  const pendingOffers  = offers.filter(o => o.status === "pending");
  const activeOffers   = offers.filter(o => o.status === "active");

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8]">
        <AppHeader showLogo userType="creator" subtitle="Creator" />
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24">
      <AppHeader showLogo userType="creator" subtitle="Creator" />

      <div className="max-w-[480px] mx-auto px-4 pt-5 space-y-5">

        {/* ── WELCOME BANNER ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white rounded-xl p-5 relative overflow-hidden"
        >
          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#389C9A]/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-[#FEDB71]/10 rounded-full blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Welcome back</p>
                <h1 className="text-xl font-black uppercase tracking-tight italic mt-0.5">
                  {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Creator"}
                </h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 text-[8px] font-black px-3 py-1.5 rounded-full ${
                profile?.status === "active"
                  ? "bg-[#389C9A] text-white"
                  : profile?.status === "pending_review"
                  ? "bg-[#FEDB71] text-[#1D1D1D]"
                  : "bg-white/10 text-white/60"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  profile?.status === "active" ? "bg-white" :
                  profile?.status === "pending_review" ? "bg-[#1D1D1D]" : "bg-white/40"
                }`} />
                {profile?.status === "active" ? "Active & Visible" :
                 profile?.status === "pending_review" ? "Under Review" :
                 profile?.status || "Unknown"}
              </span>

              {pendingOffers.length > 0 && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-[#FEDB71] text-[#1D1D1D] px-3 py-1.5 rounded-full">
                  <Zap className="w-3 h-3" />
                  {pendingOffers.length} new offer{pendingOffers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Pending review message */}
            {profile?.status === "pending_review" && (
              <div className="mt-3 p-3 bg-[#FEDB71]/10 border border-[#FEDB71]/30 rounded-lg">
                <p className="text-[8px] text-[#FEDB71] leading-relaxed">
                  Your application is under review. You'll be notified once approved and can start receiving campaign offers.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── EARNINGS STATS ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">Earnings Overview</h2>
            <button
              onClick={() => navigate("/campaigns")}
              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<DollarSign className="w-4 h-4 text-[#389C9A]" />}
              label="Total Earned"
              value={formatCurrency(earnings.totalEarned)}
              sub="All time paid out"
              accent
            />
            <StatCard
              icon={<Clock className="w-4 h-4 text-[#FEDB71]" />}
              label="Pending Payout"
              value={formatCurrency(earnings.pendingPayout)}
              sub="Awaiting release"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-[#389C9A]" />}
              label="This Month"
              value={formatCurrency(earnings.thisMonth)}
              sub="Campaign earnings"
            />
            <StatCard
              icon={<Award className="w-4 h-4 text-[#FEDB71]" />}
              label="Completed"
              value={earnings.completedCampaigns}
              sub="Campaigns done"
            />
          </div>
        </div>

        {/* ── CHANNEL STATS ──────────────────────────────────────────── */}
        {profile && (
          <div className="bg-white border-2 border-[#1D1D1D]/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">Channel Stats</h2>
              <button onClick={() => navigate("/settings")}
                className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline">
                Edit <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Users    className="w-4 h-4 text-[#389C9A]" />, label: "Avg Viewers",    value: formatNumber(profile.avg_viewers  || 0) },
                { icon: <Video    className="w-4 h-4 text-[#389C9A]" />, label: "Total Streams",  value: profile.total_streams || 0 },
                { icon: <Star     className="w-4 h-4 text-[#FEDB71]" />, label: "Rating",         value: profile.rating        || "—" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 bg-[#F8F8F8] rounded-xl flex items-center justify-center mx-auto mb-2">
                    {s.icon}
                  </div>
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Niches */}
            {profile.niche && profile.niche.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#1D1D1D]/5">
                {profile.niche.map((n, i) => (
                  <span key={i} className="text-[7px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2.5 py-1 rounded-full border border-[#1D1D1D]/10">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PENDING OFFERS ─────────────────────────────────────────── */}
        {pendingOffers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">Pending Offers</h2>
                <span className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black flex items-center justify-center rounded-full">
                  {pendingOffers.length}
                </span>
              </div>
              <button onClick={() => navigate("/campaigns")}
                className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {pendingOffers.slice(0, 3).map(offer => (
                <CampaignCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => navigate(`/creator/campaign/${offer.campaign_id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── MY CAMPAIGNS ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">My Campaigns</h2>
            <button onClick={() => navigate("/campaigns")}
              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {(["all", "active", "pending", "completed"] as const).map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-colors ${
                  activeFilter === f
                    ? "bg-[#1D1D1D] text-white"
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/50 hover:text-[#1D1D1D]"
                }`}>
                {f}
                {f !== "all" && (
                  <span className="ml-1 opacity-60">
                    ({offers.filter(o => o.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredOffers.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#1D1D1D]/10 rounded-xl p-10 text-center">
              <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black uppercase text-sm mb-1">
                {activeFilter === "all" ? "No campaigns yet" : `No ${activeFilter} campaigns`}
              </p>
              <p className="text-[9px] text-gray-400 mb-5">
                {activeFilter === "all"
                  ? "Browse businesses to get discovered and receive campaign offers"
                  : `You don't have any ${activeFilter} campaigns right now`}
              </p>
              {activeFilter === "all" && (
                <button onClick={() => navigate("/browse")}
                  className="bg-[#1D1D1D] text-white px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors inline-flex items-center gap-2">
                  Browse Businesses <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOffers.slice(0, 5).map(offer => (
                <CampaignCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => navigate(`/creator/campaign/${offer.campaign_id}`)}
                />
              ))}
              {filteredOffers.length > 5 && (
                <button onClick={() => navigate("/campaigns")}
                  className="w-full py-3 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-[#1D1D1D] transition-colors text-[#1D1D1D]/50">
                  View {filteredOffers.length - 5} more campaigns
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Browse Businesses", icon: <Users     className="w-5 h-5 text-white" />, color: "bg-[#389C9A]",  action: () => navigate("/browse") },
              { label: "My Campaigns",      icon: <Megaphone className="w-5 h-5 text-white" />, color: "bg-[#1D1D1D]",  action: () => navigate("/campaigns") },
              { label: "Messages",          icon: <MessageSquare className="w-5 h-5 text-white" />, color: "bg-blue-500", action: () => navigate("/messages?role=creator") },
              { label: "Edit Profile",      icon: <Star      className="w-5 h-5 text-[#1D1D1D]" />, color: "bg-[#FEDB71]", action: () => navigate("/settings") },
            ].map((item, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.97 }}
                onClick={item.action}
                className="bg-white border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] rounded-xl p-4 flex items-center gap-3 transition-all text-left"
              >
                <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── RECENT NOTIFICATIONS ───────────────────────────────────── */}
        {notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-[#389C9A] text-white text-[8px] font-black flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={() => navigate("/notifications?role=creator")}
                className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden">
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => markNotifRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#F8F8F8] transition-colors ${
                    i < notifications.length - 1 ? "border-b border-[#1D1D1D]/5" : ""
                  } ${!n.is_read ? "bg-[#389C9A]/5" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.is_read ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-tight truncate ${!n.is_read ? "text-[#1D1D1D]" : "text-[#1D1D1D]/60"}`}>
                      {n.title}
                    </p>
                    <p className="text-[9px] text-gray-400 line-clamp-1 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-[7px] text-gray-300 whitespace-nowrap shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GET DISCOVERED CTA ─────────────────────────────────────── */}
        {offers.length === 0 && profile?.status === "active" && (
          <div className="bg-gradient-to-br from-[#389C9A] to-[#2d7f7d] text-white rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative">
              <Gift className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="text-lg font-black uppercase italic tracking-tight mb-1">Get Discovered</h3>
              <p className="text-[9px] text-white/70 mb-4 leading-relaxed">
                Complete your profile and browse businesses to start receiving campaign offers.
              </p>
              <div className="flex gap-2">
                <button onClick={() => navigate("/browse")}
                  className="flex-1 bg-white text-[#1D1D1D] py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#FEDB71] transition-colors">
                  Browse Businesses
                </button>
                <button onClick={() => navigate("/settings")}
                  className="px-4 bg-white/20 text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/30 transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>

      <BottomNav />
    </div>
  );
}
