import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpRight, Inbox, Clock, CheckCircle2, Check, X,
  ChevronDown, ChevronUp, Wallet, User, List, Monitor,
  RefreshCw, Star, Award, Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { DeclineOfferModal } from "../components/decline-offer-modal";

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface IncomingRequest {
  id: string;
  campaign_id: string;
  business_id: string;
  business: string;
  logo: string;
  name: string;
  type: string;
  streams: number;
  price: number;
  status: "pending" | "active" | "completed" | "declined";
  created_at: string;
}

interface Application {
  id: string;
  campaign_id: string;
  business_id: string;
  business: string;
  logo: string;
  type: string;
  amount: number | null;
  status: string;
  appliedAt: string;
}

interface LiveCampaign {
  id: string;
  campaign_id: string;
  business_id: string;
  business: string;
  name: string;
  logo: string;
  sessionEarnings: number;
  streamTime: string;
  progress: number;
  remainingMins: number;
  streams_completed: number;
  streams_target: number;
}

interface DashboardStats {
  totalEarned: number;
  pendingEarnings: number;
  paidOut: number;
  requestedCount: number;
  activeCount: number;
  completedCount: number;
  averageRating: number;
  avgViewers: number;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const earningsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [requestsExpanded, setRequestsExpanded]     = useState(false);
  const [applicationsExpanded, setApplicationsExpanded] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest]       = useState<IncomingRequest | null>(null);
  const [showPendingBanner, setShowPendingBanner]   = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalEarned: 0, pendingEarnings: 0, paidOut: 0,
    requestedCount: 0, activeCount: 0, completedCount: 0,
    averageRating: 0, avgViewers: 0,
  });

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [liveCampaign, setLiveCampaign]         = useState<LiveCampaign | null>(null);
  const [applications, setApplications]         = useState<Application[]>([]);
  const [creatorProfile, setCreatorProfile]     = useState<any>(null);

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const formatStreamTime = (completed: number): string => {
    const totalMins = completed * 45;
    const hours = Math.floor(totalMins / 60);
    const mins  = totalMins % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7)  return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // ─── FETCH FUNCTIONS (all accept cid so they never rely on stale state) ───

  const fetchDashboardStats = async (cid: string) => {
    try {
      const { data: earningsRows } = await supabase
        .from("campaign_creators")
        .select("total_earnings, paid_out")
        .eq("creator_id", cid);

      if (earningsRows) {
        const totalEarned     = earningsRows.reduce((s, r) => s + (r.total_earnings || 0), 0);
        const paidOut         = earningsRows.reduce((s, r) => s + (r.paid_out || 0), 0);
        const pendingEarnings = totalEarned - paidOut;
        setStats(prev => ({ ...prev, totalEarned, paidOut, pendingEarnings }));
      }

      const { data: allRows } = await supabase
        .from("campaign_creators")
        .select("status")
        .eq("creator_id", cid);

      if (allRows) {
        const n = (s: string) => s?.toLowerCase();
        setStats(prev => ({
          ...prev,
          requestedCount: allRows.filter(r => ["pending", "not_started", "not started"].includes(n(r.status))).length,
          activeCount:    allRows.filter(r => n(r.status) === "active").length,
          completedCount: allRows.filter(r => n(r.status) === "completed").length,
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const fetchIncomingRequests = async (cid: string) => {
    const { data, error } = await supabase
      .from("campaign_creators")
      .select(`
        id, status, streams_target, created_at,
        campaigns (
          id, name, type, pay_rate, bid_amount, budget,
          businesses ( id, name, logo_url )
        )
      `)
      .eq("creator_id", cid)
      .in("status", ["NOT STARTED", "pending", "PENDING"])
      .order("created_at", { ascending: false });

    if (error) { console.error(error); return; }

    const formatted: IncomingRequest[] = (data || [])
      .filter((r: any) => r.campaigns !== null)
      .map((r: any) => ({
        id:          r.id,
        campaign_id: r.campaigns.id,
        business_id: r.campaigns.businesses?.id || "",
        business:    r.campaigns.businesses?.name || "Unknown Business",
        logo:        r.campaigns.businesses?.logo_url || "",
        name:        r.campaigns.name,
        type:        r.campaigns.type,
        streams:     r.streams_target || 4,
        price:       r.campaigns.pay_rate ?? r.campaigns.bid_amount ?? r.campaigns.budget ?? 0,
        status:      r.status.toLowerCase() as IncomingRequest["status"],
        created_at:  r.created_at,
      }));

    setIncomingRequests(formatted);
  };

  const refreshLiveCampaign = async (cid: string) => {
    const { data } = await supabase
      .from("campaign_creators")
      .select(`
        id, streams_completed, streams_target, total_earnings, status,
        campaigns (
          id, name, pay_rate, bid_amount,
          businesses ( id, name, logo_url )
        )
      `)
      .eq("creator_id", cid)
      .in("status", ["active", "ACTIVE"])
      .maybeSingle();

    if (data && data.campaigns) {
      const camp = data.campaigns as any;
      const biz  = camp.businesses as any;
      const progress = data.streams_target > 0
        ? (data.streams_completed / data.streams_target) * 100 : 0;

      setLiveCampaign({
        id:                 data.id,
        campaign_id:        camp.id,
        business_id:        biz?.id || "",
        business:           biz?.name || "Unknown",
        name:               camp.name,
        logo:               biz?.logo_url || "",
        sessionEarnings:    data.total_earnings || 0,
        streamTime:         formatStreamTime(data.streams_completed),
        progress,
        remainingMins:      (data.streams_target - data.streams_completed) * 45,
        streams_completed:  data.streams_completed,
        streams_target:     data.streams_target,
      });
    } else {
      setLiveCampaign(null);
    }
  };

  const fetchApplications = async (cid: string) => {
    const { data } = await supabase
      .from("campaign_creators")
      .select(`
        id, status, total_earnings, created_at,
        campaigns (
          id, name, type, pay_rate, bid_amount,
          businesses ( id, name, logo_url )
        )
      `)
      .eq("creator_id", cid)
      .not("status", "in", '("active","ACTIVE")')
      .order("created_at", { ascending: false });

    if (data) {
      const formatted: Application[] = (data as any[])
        .filter(r => r.campaigns !== null)
        .map(r => ({
          id:          r.id,
          campaign_id: r.campaigns.id,
          business_id: r.campaigns.businesses?.id || "",
          business:    r.campaigns.businesses?.name || "Unknown",
          logo:        r.campaigns.businesses?.logo_url || "",
          type:        r.campaigns.type,
          amount:      r.campaigns.pay_rate ?? r.campaigns.bid_amount ?? null,
          status:      r.status,
          appliedAt:   formatDate(r.created_at),
        }));
      setApplications(formatted);
    }
  };

  // ─── BOOT: fetch profile then everything else ─────────────────────────────

  useEffect(() => {
    if (!user) return;

    const boot = async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("id, full_name, avatar_url, bio, avg_viewers, rating, status, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      setCreatorProfile(profile);
      setStats(prev => ({
        ...prev,
        averageRating: profile.rating    || 0,
        avgViewers:    profile.avg_viewers || 0,
      }));

      if (profile.status === "pending_review") setShowPendingBanner(true);

      const cid = profile.id;

      // Run all fetches in parallel now that we have the real cid
      await Promise.all([
        fetchDashboardStats(cid),
        fetchIncomingRequests(cid),
        refreshLiveCampaign(cid),
        fetchApplications(cid),
      ]);

      setLoading(false);
    };

    boot();
  }, [user]);

  // ─── REALTIME ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!creatorProfile?.id) return;
    const cid = creatorProfile.id;

    const sub = supabase
      .channel("creator_campaign_creators")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "campaign_creators",
        filter: `creator_id=eq.${cid}`,
      }, () => {
        fetchIncomingRequests(cid);
        refreshLiveCampaign(cid);
        fetchDashboardStats(cid);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [creatorProfile?.id]);

  // ─── ACCEPT / DECLINE ─────────────────────────────────────────────────────

  const handleAcceptOffer = async (req: IncomingRequest) => {
    try {
      const { error } = await supabase
  .from("campaign_creators")
  .update({ status: "ACTIVE", accepted_at: new Date().toISOString() })
  .eq("id", req.id);
      if (error) throw error;

      toast.success("Offer accepted! 🎉");
      setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
      setStats(prev => ({
        ...prev,
        requestedCount: prev.requestedCount - 1,
        activeCount:    prev.activeCount + 1,
      }));
      
    } catch (error) {
      console.error("Accept error:", error);
      toast.error("Failed to accept offer");
    }
  };

  const handleDeclineClick = (req: IncomingRequest) => {
    setSelectedRequest(req);
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = async (reason: string) => {
    if (!selectedRequest) return;
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ status: "DECLINED" })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      setIsDeclineModalOpen(false);
      toast.success("Offer declined");
      setIncomingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setStats(prev => ({ ...prev, requestedCount: prev.requestedCount - 1 }));
      setSelectedRequest(null);
    } catch {
      toast.error("Failed to decline offer");
    }
  };

  // ─── REFRESH ALL ──────────────────────────────────────────────────────────

  const refreshData = async () => {
    if (!creatorProfile?.id) return;
    setRefreshing(true);
    const cid = creatorProfile.id;
    await Promise.all([
      fetchDashboardStats(cid),
      fetchIncomingRequests(cid),
      refreshLiveCampaign(cid),
      fetchApplications(cid),
    ]);
    setRefreshing(false);
    toast.success("Dashboard updated");
  };

  const earningsRatio = stats.totalEarned > 0
    ? (stats.paidOut / stats.totalEarned) * 100 : 0;

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showLogo subtitle="Creator Hub" userType="creator" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <Toaster position="top-center" richColors />

      <main className="max-w-[480px] mx-auto w-full">
        <AppHeader showLogo subtitle="Creator Hub" userType="creator" showHome={false} />

        {/* Welcome */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Welcome back,</h1>
            <p className="text-sm text-gray-500">{creatorProfile?.full_name || "Creator"}!</p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Pending Approval Banner */}
        {showPendingBanner && (
          <div className="mx-6 mt-2 mb-2 p-5 bg-[#FEDB71]/20 border-2 border-[#FEDB71] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FEDB71] rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#1D1D1D]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-tight mb-1">Application Under Review</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Your creator application is being reviewed by our team. You'll be notified at{" "}
                  <span className="font-bold underline">{creatorProfile?.email || "your email"}</span> once approved.
                </p>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                  <span className="w-2 h-2 bg-[#FEDB71] rounded-full animate-pulse" />
                  <span>Estimated review time: 24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-2">
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Star className="w-4 h-4 text-[#FEDB71] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.averageRating || "—"}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Rating</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Users className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.avgViewers.toLocaleString()}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Avg Viewers</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Award className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.completedCount}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Completed</p>
          </div>
        </div>

        {/* Earnings Card */}
        <div className="p-6" ref={earningsRef}>
          <div className="bg-[#1D1D1D] p-8 text-white relative overflow-hidden border-2 border-[#1D1D1D] rounded-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Total Earnings</span>
              <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-none mb-8 text-center italic relative z-10">
              ₦{stats.totalEarned.toFixed(2)}
            </h2>
            <div className="h-[1px] bg-white/10 mb-8 relative z-10" />
            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pending</span>
                <span className="text-xl font-black text-[#FEDB71]">₦{stats.pendingEarnings.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Paid Out</span>
                <span className="text-xl font-black text-[#389C9A]">₦{stats.paidOut.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
                <div className="h-full bg-[#389C9A] rounded-full transition-all duration-1000"
                  style={{ width: `${earningsRatio}%` }} />
              </div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                {Math.round(earningsRatio)}% of earnings paid out
              </p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-6 pb-6">
          <Link to="/browse-businesses"
            className="w-full bg-[#1D1D1D] text-white py-8 px-8 text-xl font-black uppercase italic tracking-tighter flex items-center justify-between hover:bg-[#389C9A] transition-all rounded-xl">
            Browse Opportunities
            <ArrowUpRight className="w-6 h-6 text-[#FEDB71]" />
          </Link>
        </div>

        {/* Campaign Status Row */}
        <div className="px-6 pb-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Inbox,       count: stats.requestedCount, label: "Requests",  path: "/browse-businesses",       color: "text-[#389C9A]" },
              { icon: Clock,       count: stats.activeCount,    label: "Active",    path: "/campaigns?status=active",  color: "text-[#FEDB71]" },
              { icon: CheckCircle2,count: stats.completedCount, label: "Completed", path: "/campaigns?status=completed", color: "text-green-500" },
            ].map((card, i) => (
              <button key={i} onClick={() => navigate(card.path)}
                className="bg-white border-2 border-[#1D1D1D] p-4 flex flex-col items-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-all cursor-pointer rounded-xl group">
                <card.icon className={`w-5 h-5 ${card.color} group-hover:text-white`} />
                <span className="text-xl font-black italic">{card.count}</span>
                <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight opacity-40 group-hover:opacity-100">
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">Incoming Requests</h3>
              <span className="bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black uppercase px-3 py-1 tracking-widest italic rounded-full">
                {incomingRequests.length} new
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {(requestsExpanded ? incomingRequests : incomingRequests.slice(0, 2)).map(req => (
                  <motion.div layout key={req.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}
                    className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-6 rounded-xl hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden">
                          <ImageWithFallback src={req.logo} className="w-full h-full object-cover grayscale" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-1">{req.business}</h4>
                          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{req.type}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-black italic leading-none text-[#389C9A]">₦{req.price}</p>
                    </div>
                    <p className="text-[9px] font-medium text-[#1D1D1D]/60 italic">
                      {req.name} — {req.streams} streams required
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleAcceptOffer(req)}
                        className="bg-[#1D1D1D] text-white py-4 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#389C9A] transition-all rounded-xl">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleDeclineClick(req)}
                        className="border-2 py-4 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-xl">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {incomingRequests.length > 2 && (
                <button onClick={() => setRequestsExpanded(!requestsExpanded)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors">
                  {requestsExpanded
                    ? <><span>Show less</span> <ChevronUp className="w-4 h-4" /></>
                    : <><span>Show {incomingRequests.length - 2} more requests</span> <ChevronDown className="w-4 h-4" /></>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Now */}
        <div className="px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">Live Now</h3>
            {liveCampaign && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#1D1D1D]">
                <span className="w-1.5 h-1.5 bg-[#389C9A] rounded-full animate-pulse" />
                Active
              </div>
            )}
          </div>
{applications.length > 0 && (
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">My Applications</h3>
              <span className="text-[9px] font-black uppercase text-[#1D1D1D]/40">{applications.length} total</span>
            </div>
            <div className="flex flex-col gap-3">
              {(applicationsExpanded ? applications : applications.slice(0, 3)).map(app => (
                <div key={app.id} onClick={() => navigate(`/campaign/${app.campaign_id}/summary`)}
                  className="bg-white border-2 border-[#1D1D1D] p-4 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer rounded-xl">
                  <div className="flex items-center gap-3">
                    <div clasName="bg-gray-100/10 rounded-lg overflow-hidden">
                      <ImageWithFallback src={app.logo} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight mb-1">{app.business}</h4>
                      <span className="text-[7px] font-black uppercase tracking-widest bg-[#1D1D1D]/5 px-2 py-0.5 rounded-full">
                        {app.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {app.amount != null && (
                      <p className="text-sm font-black italic mb-1 text-[#389C9A]">₦{app.amount}</p>
                    )}
                    <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      app.status.toLowerCase() === "pending"       ? "bg-[#FEDB71] text-[#1D1D1D]" :
                      app.status.toLowerCase() === "not_started"   ? "bg-[#FEDB71] text-[#1D1D1D]" :
                      app.status.toLowerCase() === "active"        ? "bg-[#389C9A] text-white" :
                      app.status.toLowerCase() === "completed"     ? "bg-green-500 text-white" :
                      app.status.toLowerCase() === "declined"      ? "bg-red-100 text-red-600" :
                      "bg-gray-200 text-gray-500"
                    }`}>
                      {app.status}
                    </div>
                    <p className="text-[6px] font-medium text-[#1D1D1D]/20 uppercase tracking-widest mt-1">
                      {app.appliedAt}
                    </p>
                  </div>
                </div>
              ) : (
            <div className="bg-white border-2 border-[#1D1D1D] p-12 text-center rounded-xl">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-xs text-[#1D1D1D]/40 mb-4">No active campaign right now</p>
              <Link to="/browse-businesses" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                Find Opportunities →
              </Link>
            </div>
          )}
        </div>

        {/* My Applications */}
        {applications.length > 0 && (
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">My Applications</h3>
              <span className="text-[9px] font-black uppercase text-[#1D1D1D]/40">{applications.length} total</span>
            </div>
            <div className="flex flex-col gap-3">
              {(applicationsExpanded ? applications : applications.slice(0, 3)).map(app => (
                <div key={app.id} onClick={() => navigate(`/campaign/${app.campaign_id}/summary`)}
                  className="bg-white border-2 border-[#1D1D1D] p-4 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer rounded-xl">
                  <div className="flex items-center gap-3">
                    <div clasName="bg-gray-100/10 rounded-lg overflow-hidden">
                      <ImageWithFallback src={app.logo} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight mb-1">{app.business}</h4>
                      <span className="text-[7px] font-black uppercase tracking-widest bg-[#1D1D1D]/5 px-2 py-0.5 rounded-full">
                        {app.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {app.amount != null && (
                      <p className="text-sm font-black italic mb-1 text-[#389C9A]">₦{app.amount}</p>
                    )}
                    <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      app.status.toLowerCase() === "pending"       ? "bg-[#FEDB71] text-[#1D1D1D]" :
                      app.status.toLowerCase() === "not_started"   ? "bg-[#FEDB71] text-[#1D1D1D]" :
                      app.status.toLowerCase() === "active"        ? "bg-[#389C9A] text-white" :
                      app.status.toLowerCase() === "completed"     ? "bg-green-500 text-white" :
                      app.status.toLowerCase() === "declined"      ? "bg-red-100 text-red-600" :
                      "bg-gray-200 text-gray-500"
                    }`}>
                      {app.status}
                    </div>
                    <p className="text-[6px] font-medium text-[#1D1D1D]/20 uppercase tracking-widest mt-1">
                      {app.appliedAt}
                    </p>
                  </div>
                </div>
              ))}
              {applications.length > 3 && (
                <button onClick={() => setApplicationsExpanded(!applicationsExpanded)}
                  className="w-full py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/30 hover:text-[#1D1D1D] transition-colors">
                  {applicationsExpanded
                    ? <><span>Show less</span> <ChevronUp className="w-3 h-3" /></>
                    : <><span>Show {applications.length - 3} more</span> <ChevronDown className="w-3 h-3" /></>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-6 pb-24">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => navigate("/campaigns")}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl">
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <List className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">My Campaigns</span>
            </button>
            <button onClick={() => earningsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl">
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <Wallet className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">Earnings</span>
            </button>
            <button onClick={() => navigate(`/profile/${creatorProfile?.id || "me"}`)}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl">
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <User className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">My Profile</span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav />

      <DeclineOfferModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleConfirmDecline}
        offerDetails={selectedRequest ? {
          partnerName:  selectedRequest.business,
          offerName:    selectedRequest.name,
          campaignType: selectedRequest.type,
          amount:       `₦${selectedRequest.price}`,
          logo:         selectedRequest.logo,
          partnerType:  "Business",
        } : { partnerName: "", offerName: "", campaignType: "", amount: "", logo: "", partnerType: "" }}
      />
    </div>
  );
}

export default Dashboard;
