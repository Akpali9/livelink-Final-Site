import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowUpRight,
  Inbox,
  Clock,
  CheckCircle2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Wallet,
  User,
  List,
  Monitor,
  RefreshCw,
  Star,
  Award,
  Users,
  AlertCircle,
  Briefcase,
  DollarSign,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  Megaphone,
  Building2,
  Eye
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget?: number;
  bid_amount?: number;
  pay_rate?: number;
  campaign_creators: CampaignCreator[];
  created_at: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface CampaignCreator {
  id: string;
  status: string;
  creator_id: string | null;
  streams_completed: number;
  streams_target: number;
}

interface PendingCreator {
  id: string;
  status: string;
  created_at: string;
  streams_target: number;
  creator_profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    payout_email: string | null;
    avg_viewers: number;
    niche: string[] | null;
  } | null;
  campaigns: {
    id: string;
    name: string;
    type: string;
    budget: number | null;
  } | null;
}

interface BusinessProfile {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
  logo_url: string | null;
  application_status: string | null;
  status: string | null;
}

interface DashboardStats {
  activeCampaigns: number;
  pendingCampaigns: number;
  completedCampaigns: number;
  totalCreators: number;
  totalSpent: number;
  pendingCreators: number;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BusinessDashboard() {
  const navigate = useNavigate();
  const earningsRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaignsExpanded, setCampaignsExpanded] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [showPendingBanner, setShowPendingBanner] = useState(false);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingCreators, setPendingCreators] = useState<PendingCreator[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<"LIVE" | "PENDING" | "COMPLETED">("LIVE");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    pendingCampaigns: 0,
    completedCampaigns: 0,
    totalCreators: 0,
    totalSpent: 0,
    pendingCreators: 0,
  });

  // ─── AUTH + BUSINESS PROFILE ───────────────────────────────────────────

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          toast.error("Please log in to access your dashboard");
          navigate("/login/portal", { replace: true });
          return;
        }

        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id, business_name, full_name, email, logo_url, application_status, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (businessError && businessError.code !== "PGRST116") {
          throw businessError;
        }

        if (!business) {
          console.log("No business profile found, redirecting to registration");
          navigate("/become-business", { replace: true });
          return;
        }

        if (business.status === "deleted") {
          await supabase.auth.signOut();
          navigate("/login/portal", { replace: true });
          return;
        }

        // Check if business is pending
        if (business.status === "pending_review" || business.application_status === "pending") {
          setShowPendingBanner(true);
        }

        setBusinessId(business.id);
        setBusinessProfile(business as BusinessProfile);
        setAuthChecked(true);
        
      } catch (error) {
        console.error("Error fetching business:", error);
        toast.error("Failed to load business profile");
        setAuthChecked(true);
      }
    };

    fetchBusiness();
  }, [navigate]);

  // ─── FETCH DASHBOARD DATA ──────────────────────────────────────────────

  useEffect(() => {
    if (!businessId || !authChecked) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchCampaigns(), fetchPendingCreators()]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const creatorsSubscription = supabase
      .channel("pending_creators_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "campaign_creators" }, () => fetchPendingCreators())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaign_creators" }, () => fetchPendingCreators())
      .subscribe();

    const campaignsSubscription = supabase
      .channel("campaigns_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns", filter: `business_id=eq.${businessId}` }, () => fetchCampaigns())
      .subscribe();

    return () => {
      creatorsSubscription.unsubscribe();
      campaignsSubscription.unsubscribe();
    };
  }, [businessId, authChecked]);

  // ─── FETCH HELPERS ────────────────────────────────────────────────────────

  const fetchCampaigns = async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        id, name, type, status, budget, bid_amount, pay_rate,
        created_at, start_date, end_date, description,
        campaign_creators (id, status, creator_id, streams_completed, streams_target)
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaigns:", error);
      return;
    }
    setCampaigns((data as Campaign[]) || []);

    // Update stats
    const active = (data || []).filter(c => ["active","ACTIVE","live","LIVE"].includes(c.status)).length;
    const pending = (data || []).filter(c => ["pending_review","PENDING_REVIEW","draft","DRAFT","pending","PENDING"].includes(c.status)).length;
    const completed = (data || []).filter(c => ["completed","COMPLETED"].includes(c.status)).length;
    const totalCreators = (data || []).reduce((sum, c) => sum + (c.campaign_creators?.length || 0), 0);
    const totalSpent = (data || []).reduce((sum, c) => { 
      const val = c.budget ?? c.bid_amount ?? c.pay_rate ?? 0; 
      return sum + (isNaN(val) ? 0 : val); 
    }, 0);

    setStats(prev => ({
      ...prev,
      activeCampaigns: active,
      pendingCampaigns: pending,
      completedCampaigns: completed,
      totalCreators,
      totalSpent,
    }));
  };

  const fetchPendingCreators = async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from("campaign_creators")
      .select(`
        id, status, created_at, streams_target,
        creator_profiles (id, full_name, avatar_url, payout_email, avg_viewers, niche),
        campaigns!inner (id, name, type, budget, business_id)
      `)
      .in("status", ["pending", "PENDING"])
      .eq("campaigns.business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) { 
      console.error("Error fetching pending creators:", error); 
      return;
    }

    const filtered = (data || []).filter((row: any) => row.campaigns !== null) as PendingCreator[];
    setPendingCreators(filtered);
    setStats(prev => ({ ...prev, pendingCreators: filtered.length }));
  };

  // ─── REFRESH ───────────────────────────────────────────────────────────

  const refreshData = async () => {
    if (!businessId) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchCampaigns(), fetchPendingCreators()]);
      toast.success("Dashboard updated");
    } catch { toast.error("Failed to refresh data"); }
    finally { setRefreshing(false); }
  };

  // ─── ACCEPT / DECLINE CREATOR ─────────────────────────────────────────

  const acceptCreator = async (row: PendingCreator) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ status: "ACTIVE", accepted_at: new Date().toISOString() })
        .eq("id", row.id);
      
      if (error) throw error;
      
      toast.success(`${row.creator_profiles?.full_name || "Creator"} accepted 🎉`);
      setPendingCreators(prev => prev.filter(r => r.id !== row.id));
      setStats(prev => ({ ...prev, pendingCreators: prev.pendingCreators - 1 }));
      fetchCampaigns();

      if (row.creator_profiles?.id) {
        await supabase.from("notifications").insert({
          user_id: row.creator_profiles.id,
          type: "offer_accepted",
          title: "Offer Accepted! 🎉",
          message: `Your offer for ${row.campaigns?.name} has been accepted!`,
          data: { campaign_id: row.campaigns?.id },
          created_at: new Date().toISOString()
        });
      }
    } catch (error) { 
      console.error(error); 
      toast.error("Failed to accept creator"); 
    }
  };

  const declineCreator = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ status: "DECLINED" })
        .eq("id", rowId);
      
      if (error) throw error;
      
      toast.success("Creator declined");
      setPendingCreators(prev => prev.filter(r => r.id !== rowId));
      setStats(prev => ({ ...prev, pendingCreators: prev.pendingCreators - 1 }));
    } catch (error) { 
      console.error(error); 
      toast.error("Failed to decline creator"); 
    }
  };

  // ─── FILTER CAMPAIGNS ─────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter(c => {
    const s = c.status?.toLowerCase();
    if (campaignFilter === "LIVE") return ["active","live","open"].includes(s);
    if (campaignFilter === "PENDING") return ["pending_review","pending","draft","review"].includes(s);
    return s === "completed";
  });

  const countFor = (tab: "LIVE" | "PENDING" | "COMPLETED") =>
    campaigns.filter(c => {
      const s = c.status?.toLowerCase();
      if (tab === "LIVE") return ["active","live","open"].includes(s);
      if (tab === "PENDING") return ["pending_review","pending","draft","review"].includes(s);
      return s === "completed";
    }).length;

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (["active", "live", "open"].includes(s)) return "bg-[#389C9A] text-white";
    if (["pending_review", "pending", "draft", "review"].includes(s)) return "bg-[#FEDB71] text-[#1D1D1D]";
    if (["completed"].includes(s)) return "bg-green-500 text-white";
    return "bg-gray-100 text-gray-500";
  };

  const spentRatio = stats.totalSpent > 0 ? Math.min(100, (stats.totalSpent / 100000) * 100) : 0;

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (loading && !authChecked) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showLogo userType="business" subtitle="Business Hub" />
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
      <AppHeader showLogo subtitle="Business Hub" userType="business" showHome={false} />
      <Toaster position="top-center" richColors />

      <main className="max-w-[480px] mx-auto w-full">

        {/* Welcome */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Welcome back,</h1>
            <p className="text-sm text-gray-500">{businessProfile?.business_name || businessProfile?.full_name || "Business"}!</p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* PENDING APPROVAL BANNER */}
        {showPendingBanner && (
          <div className="mx-6 mt-2 mb-2 p-5 bg-[#FEDB71]/20 border-2 border-[#FEDB71] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FEDB71] rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#1D1D1D]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-tight mb-1">Business Application Under Review</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Your business application is being reviewed by our team. You'll be notified at{' '}
                  <span className="font-bold underline">{businessProfile?.email}</span> once approved.
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
            <Award className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.activeCampaigns}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Active</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Users className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.totalCreators}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Creators</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-sm font-black">{stats.completedCampaigns}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Completed</p>
          </div>
        </div>

        {/* Spent Card */}
        <div className="p-6" ref={earningsRef}>
          <div className="bg-[#1D1D1D] p-8 text-white relative overflow-hidden border-2 border-[#1D1D1D] rounded-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Total Spent</span>
              <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <h2 className="text-4xl font-black tracking-tighter leading-none mb-8 text-center italic relative z-10">
              ₦{stats.totalSpent.toLocaleString()}
            </h2>

            <div className="h-[1px] bg-white/10 mb-8 relative z-10" />

            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Campaigns</span>
                <span className="text-xl font-black text-[#FEDB71]">{campaigns.length}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pending</span>
                <span className="text-xl font-black text-[#389C9A]">{stats.pendingCreators}</span>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#389C9A] rounded-full transition-all duration-1000"
                  style={{ width: `${spentRatio}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                {Math.round(spentRatio)}% of ₦100k budget utilized
              </p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-6 pb-6">
          <Link
            to="/browse-creators"
            className="w-full bg-[#1D1D1D] text-white py-8 px-8 text-xl font-black uppercase italic tracking-tighter flex items-center justify-between hover:bg-[#389C9A] transition-all rounded-xl"
          >
            Find Creators
            <ArrowUpRight className="w-6 h-6 text-[#FEDB71]" />
          </Link>
        </div>

        {/* Campaign Status Row - FIXED: Using business campaign routes */}
        <div className="px-6 pb-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Megaphone, count: stats.activeCampaigns, label: "Live", path: "/business/campaigns?status=active", color: "text-[#389C9A]" },
              { icon: Clock, count: stats.pendingCampaigns, label: "Pending", path: "/business/campaigns?status=pending", color: "text-[#FEDB71]" },
              { icon: CheckCircle2, count: stats.completedCampaigns, label: "Completed", path: "/business/campaigns?status=completed", color: "text-green-500" },
            ].map((card, i) => (
              <button
                key={i}
                onClick={() => navigate(card.path)}
                className="bg-white border-2 border-[#1D1D1D] p-4 flex flex-col items-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-all cursor-pointer rounded-xl group"
              >
                <card.icon className={`w-5 h-5 ${card.color} group-hover:text-white`} />
                <span className="text-xl font-black italic">{card.count}</span>
                <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight opacity-40 group-hover:opacity-100">
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle */}
        <div className="px-6 flex gap-4 mb-4">
          <button
            onClick={() => setShowPendingOnly(false)}
            className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors ${
              !showPendingOnly ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400"
            }`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setShowPendingOnly(true)}
            className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors relative ${
              showPendingOnly ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400"
            }`}
          >
            Pending Creators ({pendingCreators.length})
            {pendingCreators.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] text-xs flex items-center justify-center font-black rounded-full">
                {pendingCreators.length}
              </span>
            )}
          </button>
        </div>

        {/* Campaigns */}
        {!showPendingOnly ? (
          <div className="px-6 mt-4">
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {(["LIVE", "PENDING", "COMPLETED"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCampaignFilter(tab)}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                    campaignFilter === tab
                      ? "bg-[#1D1D1D] text-white rounded-lg"
                      : "text-gray-400 hover:text-[#1D1D1D]"
                  }`}
                >
                  {tab} ({countFor(tab)})
                </button>
              ))}
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
                <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No campaigns in this category</p>
                <button
                  onClick={() => navigate("/business/create-campaign")}
                  className="text-[#389C9A] font-black uppercase text-sm hover:underline"
                >
                  Create your first campaign →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {(campaignsExpanded ? filteredCampaigns : filteredCampaigns.slice(0, 3)).map(campaign => (
                    <motion.div
                      layout
                      key={campaign.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => navigate(`/business/campaign/overview/${campaign.id}`)}
                      className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-4 cursor-pointer hover:bg-[#1D1D1D] hover:text-white transition-colors group rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-black text-lg mb-1">{campaign.name}</h3>
                          <p className="text-sm opacity-60 mb-2">{campaign.type}</p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {campaign.campaign_creators?.length || 0} creators
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ₦{campaign.budget ?? campaign.bid_amount ?? campaign.pay_rate ?? "Negotiable"}
                            </span>
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </div>
                      </div>
                      {campaign.start_date && (
                        <div className="flex items-center gap-1 text-[9px] opacity-40">
                          <Calendar className="w-3 h-3" />
                          Starts: {new Date(campaign.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredCampaigns.length > 3 && (
                  <button
                    onClick={() => setCampaignsExpanded(!campaignsExpanded)}
                    className="w-full py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
                  >
                    {campaignsExpanded ? (
                      <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Show {filteredCampaigns.length - 3} more <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Pending Creators */
          <div className="px-6 mt-4">
            <h2 className="text-xl font-black uppercase tracking-tight italic mb-6">
              Pending Creators ({pendingCreators.length})
            </h2>

            {pendingCreators.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400">No pending creator requests</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {(pendingExpanded ? pendingCreators : pendingCreators.slice(0, 3)).map(row => {
                    const creator = row.creator_profiles;
                    const displayName = creator?.full_name || "Unknown Creator";
                    return (
                      <motion.div
                        layout
                        key={row.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="border-2 border-[#FEDB71] p-6 bg-yellow-50 rounded-xl"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            {creator?.avatar_url ? (
                              <img
                                src={creator.avatar_url}
                                alt={displayName}
                                className="w-12 h-12 rounded-full border-2 border-[#1D1D1D] object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-[#389C9A] flex items-center justify-center text-white font-black rounded-full">
                                {displayName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-black">{displayName}</h3>
                              <p className="text-xs opacity-60">
                                ~{creator?.avg_viewers?.toLocaleString() ?? 0} avg viewers
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="font-bold text-lg">{row.campaigns?.name ?? "Unknown Campaign"}</p>
                            <p className="text-sm opacity-60">Type: {row.campaigns?.type ?? "—"}</p>
                          </div>

                          {creator?.niche && creator.niche.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {creator.niche.map(tag => (
                                <span key={tag} className="text-[8px] bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); acceptCreator(row); }}
                              className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); declineCreator(row.id); }}
                              className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                            >
                              Decline
                            </button>
                          </div>

                          <p className="text-[7px] text-gray-400">
                            Applied {formatDate(row.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {pendingCreators.length > 3 && (
                  <button
                    onClick={() => setPendingExpanded(!pendingExpanded)}
                    className="w-full py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
                  >
                    {pendingExpanded ? (
                      <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Show {pendingCreators.length - 3} more <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions - FIXED: Using correct business routes */}
        <div className="px-6 pb-24">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/business/create-campaign")}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <Megaphone className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">New Campaign</span>
            </button>

            <button
              onClick={() => navigate("/business/settings")}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <Filter className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">Settings</span>
            </button>

            <button
              onClick={() => navigate(`/business/profile`)}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <Building2 className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">Profile</span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
