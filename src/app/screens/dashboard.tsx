import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpRight, Inbox, Clock, CheckCircle2, Check, X,
  ChevronDown, ChevronUp, Wallet, User, List, Monitor,
  RefreshCw, Star, Award, Users, Calendar, Briefcase
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
// INTERFACES (unchanged)
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

  // ─── HELPERS (unchanged) ──────────────────────────────────────────────────

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

  // ─── FETCH FUNCTIONS (unchanged) ─────────────────────────────────────────

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
    const { data, error } = await supabase
      .from("campaign_creators")
      .select(`
        id, streams_completed, streams_target, total_earnings, status,
        campaigns (
          id, name, pay_rate, bid_amount,
          businesses ( id, name, logo_url )
        )
      `)
      .eq("creator_id", cid)
      .in("status", ["active", "ACTIVE", "Active"])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching live campaign:", error);
      return;
    }

    if (data && data.campaigns) {
      const camp = data.campaigns as any;
      const biz  = camp.businesses as any;

      if (!camp.id) {
        console.error("Live campaign has no campaign_id", camp);
        return;
      }

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

  // ─── BOOT (unchanged) ─────────────────────────────────────────────────────

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

  // ─── REALTIME (unchanged) ─────────────────────────────────────────────────

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

  // ─── ACCEPT / DECLINE (unchanged) ─────────────────────────────────────────

  const handleAcceptOffer = async (req: IncomingRequest) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ status: "active", accepted_at: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Offer accepted! 🎉");
      setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
      setStats(prev => ({
        ...prev,
        requestedCount: prev.requestedCount - 1,
        activeCount:    prev.activeCount + 1,
      }));

      await refreshLiveCampaign(creatorProfile.id);

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
        .update({ status: "declined" })
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

  // ─── RENDER (with improved UI) ────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showLogo subtitle="Creator Hub" />
      <Toaster position="top-center" richColors />

      <main className="max-w-[480px] mx-auto w-full">

        {/* Earnings Card (unchanged) */}
        <div className="p-6" ref={earningsRef}>
          <div className="bg-[#1D1D1D] p-8 text-white border-2 border-[#1D1D1D]">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Total Earnings
              </span>
              <ArrowUpRight className="w-4 h-4 text-white/40" />
            </div>

            <h2 className="text-4xl font-black italic text-center mb-8">
              ₦{stats.totalEarned.toFixed(2)}
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[10px] text-white/40">Pending</p>
                <p className="text-lg font-bold text-[#FEDB71]">
                  ₦{stats.pendingEarnings.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40">Paid</p>
                <p className="text-lg font-bold text-[#389C9A]">
                  ₦{stats.paidOut.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="h-1 bg-white/10">
              <div
                className="h-full bg-[#389C9A]"
                style={{ width: `${earningsRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <Link
            to="/browse-businesses"
            className="w-full bg-[#1D1D1D] text-white py-6 px-6 flex justify-between"
          >
            Browse Opportunities <ArrowUpRight />
          </Link>
        </div>

        {/* Status Cards (unchanged) */}
        <div className="px-6 pb-8 grid grid-cols-3 gap-2">
          {[
            { label: "Requests", value: stats.requestedCount },
            { label: "Active", value: stats.activeCount },
            { label: "Completed", value: stats.completedCount },
          ].map((s, i) => (
            <div key={i} className="border p-4 text-center">
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-[9px] uppercase opacity-40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── INCOMING REQUESTS (Redesigned) ── */}
        <div className="px-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">
              Incoming Requests
            </h3>
            {incomingRequests.length > 2 && (
              <button
                onClick={() => setRequestsExpanded(!requestsExpanded)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
              >
                {requestsExpanded ? "Show Less" : `Show All (${incomingRequests.length})`}
                {requestsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {incomingRequests.length === 0 ? (
            <div className="bg-white border-2 border-[#1D1D1D]/10 p-12 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[10px] text-gray-400">No incoming requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(requestsExpanded ? incomingRequests : incomingRequests.slice(0, 2)).map(req => (
                <div key={req.id} className="bg-white border-2 border-[#1D1D1D] p-5 flex flex-col gap-4 group transition-all hover:shadow-md">
                  {/* Header with logo and business name */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 bg-[#F8F8F8] rounded-lg overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={req.logo}
                        alt={req.business}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight leading-tight">
                        {req.business}
                      </h4>
                      <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mt-0.5">
                        {req.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-[#389C9A] tracking-tight">
                        ₦{req.price.toFixed(2)}
                      </p>
                      <p className="text-[8px] text-gray-400">
                        {req.streams} streams
                      </p>
                    </div>
                  </div>

                  {/* Campaign type and deadline */}
                  <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {req.type}
                    </span>
                    <span className="w-1 h-1 bg-[#1D1D1D]/20 rounded-full" />
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(req.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2 border-t border-[#1D1D1D]/10">
                    <button
                      onClick={() => handleAcceptOffer(req)}
                      className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-none flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineClick(req)}
                      className="flex-1 border-2 border-[#1D1D1D]/20 text-[#1D1D1D] py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-colors rounded-none flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── LIVE NOW (unchanged) ── */}
        <div className="px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">Live Now</h3>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#1D1D1D]">
              <span className="w-1.5 h-1.5 bg-[#389C9A] rounded-full animate-pulse" />
              Active
            </div>
          </div>

          {liveCampaign ? (
            <div className="bg-[#1D1D1D] p-6 flex flex-col gap-6 relative overflow-hidden border-2 border-[#1D1D1D]">
              <div className="flex items-center gap-6 relative z-10">
                <ImageWithFallback
                  src={liveCampaign.logo}
                  alt={liveCampaign.business}
                  className="w-12 h-12 border border-white/20 grayscale object-cover"
                />
                <div className="flex-1 text-white">
                  <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-1">
                    {liveCampaign.business}
                  </h4>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {liveCampaign.name}
                  </p>
                </div>
                <div className="text-right text-white">
                  <p className="text-xl font-black italic leading-none mb-1 text-[#FEDB71]">
                    ₦{liveCampaign.sessionEarnings.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-black text-[#389C9A] uppercase tracking-widest italic">
                    {liveCampaign.streamTime}
                  </p>
                </div>
              </div>
              <div className="space-y-2 relative z-10">
                <div className="h-1 bg-white/10 w-full overflow-hidden">
                  <div
                    className="h-full bg-[#389C9A]"
                    style={{ width: `${liveCampaign.progress}%` }}
                  />
                </div>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                  {liveCampaign.remainingMins} mins to qualify
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-end relative z-10">
                <Link
                  to={`/campaign/live-update/${liveCampaign.campaign_id}`}
                  className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 group hover:gap-3 transition-all italic"
                >
                  Update Campaign{" "}
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:scale-110 transition-all text-[#FEDB71]" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#1D1D1D] p-12 text-center">
              <p className="text-xs text-[#1D1D1D]/40 mb-4">
                No active campaign running right now. Start a stream with an active campaign banner to see it here.
              </p>
              <Link
                to="/campaigns"
                className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D] underline italic"
              >
                View Active Campaigns →
              </Link>
            </div>
          )}
        </div>

        {/* ── MY APPLICATIONS (Redesigned) ── */}
        <div className="px-6 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">
              My Applications
            </h3>
            {applications.length > 3 && (
              <button
                onClick={() => setApplicationsExpanded(!applicationsExpanded)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
              >
                {applicationsExpanded ? "Show Less" : `Show All (${applications.length})`}
                {applicationsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {applications.length === 0 ? (
            <div className="bg-white border-2 border-[#1D1D1D]/10 p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-[10px] text-gray-400">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(applicationsExpanded ? applications : applications.slice(0, 3)).map(app => {
                const statusClass = app.status === "active"
                  ? "bg-[#389C9A]/10 text-[#389C9A]"
                  : app.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700";
                return (
                  <div key={app.id} className="bg-white border-2 border-[#1D1D1D] p-5 flex flex-col gap-3 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 bg-[#F8F8F8] rounded-lg overflow-hidden shrink-0">
                        <ImageWithFallback
                          src={app.logo}
                          alt={app.business}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm uppercase tracking-tight leading-tight">
                          {app.business}
                        </h4>
                        <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mt-0.5">
                          {app.type}
                        </p>
                      </div>
                      <div className="text-right">
                        {app.amount && (
                          <p className="font-black text-lg text-[#389C9A] tracking-tight">
                            ₦{app.amount.toFixed(2)}
                          </p>
                        )}
                        <span className={`inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusClass}`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Applied {app.appliedAt}
                      </span>
                    </div>
                    {app.status === "pending" && (
                      <div className="pt-2 border-t border-[#1D1D1D]/10">
                        <p className="text-[8px] text-gray-400 italic">
                          Awaiting business decision
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      <BottomNav />

      <DeclineOfferModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleConfirmDecline}
        offerDetails={{
          partnerName: selectedRequest?.business || "",
          offerName: selectedRequest?.name || "",
          campaignType: selectedRequest?.type || "",
          amount: `₦${selectedRequest?.price || 0}`,
          logo: selectedRequest?.logo || "",
          partnerType: "Business"
        }}
      />
    </div>
  );
}

export default Dashboard;
