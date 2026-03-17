import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  Building2,
  Megaphone,
  DollarSign,
  Clock,
  Eye,
  Search,
  Filter,
  Download,
  LogOut,
  Bell,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  Shield,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  User,
  RefreshCw,
  Video,
  Star,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  Award,
  Briefcase,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface DashboardStats {
  totalCreators: number;
  pendingCreators: number;
  activeCreators: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalRevenue: number;
  pendingPayouts: number;
  totalUsers: number;
  reportedContent: number;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  category: string;
  platform: string;
  followers: number;
  city: string;
  country: string;
  status: 'pending_review' | 'active' | 'suspended';
  created_at: string;
  bio?: string;
  avatar_url?: string;
  rate?: number;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  industry: string;
  city: string;
  country: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'deleted';
  application_status: 'pending' | 'approved' | 'rejected';
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  website?: string;
}

interface Campaign {
  id: string;
  name: string;
  type: 'banner' | 'promo' | 'banner_promo';
  status: 'pending_review' | 'active' | 'completed' | 'rejected';
  budget: number;
  pay_rate?: number;
  bid_amount?: number;
  created_at: string;
  admin_notes?: string;
  businesses: {
    id: string;
    business_name: string;
    logo_url?: string;
  };
}

interface SupportTicket {
  id: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_reply?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string;
}

interface ReportedContent {
  id: string;
  content_type: 'campaign' | 'message' | 'profile';
  content_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reported_by: string;
  reported_user_email?: string;
  details?: any;
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD MAIN COMPONENT
// ─────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "creators" | "businesses" | "campaigns" | "support" | "reports" | "settings"
  >("overview");
  const [adminUser, setAdminUser] = useState<any>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0,
    pendingCreators: 0,
    activeCreators: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
    totalUsers: 0,
    reportedContent: 0,
  });

  // ─── CHECK ADMIN ACCESS ──────────────────────────────────────────────

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Not authenticated");
        navigate("/login/portal");
        return;
      }

      setAdminUser(user);

      // Check if user has admin privileges
      const isAdmin = user.user_metadata?.role === "admin" || 
                      user.user_metadata?.user_type === "admin" ||
                      user.user_metadata?.is_admin === true ||
                      user.email === "admin@livelink.com";

      if (!isAdmin) {
        toast.error("Unauthorized access");
        await supabase.auth.signOut();
        navigate("/login/portal");
        return;
      }

      await fetchDashboardData();
    };

    checkAdminAccess();
  }, []);

  // ─── FETCH DASHBOARD STATS ───────────────────────────────────────────

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get creator stats
      const [
        { count: totalCreators },
        { count: pendingCreators },
        { count: activeCreators },
      ] = await Promise.all([
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }),
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // Get business stats - handle both column names
      let pendingBusinesses = 0;
      let approvedBusinesses = 0;
      
      // Try with application_status first
      const { count: pendingCount, error: pendingError } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("application_status", "pending");
      
      if (!pendingError) {
        pendingBusinesses = pendingCount || 0;
      } else {
        // Fall back to status
        const { count } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_review");
        pendingBusinesses = count || 0;
      }

      const { count: approvedCount, error: approvedError } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("application_status", "approved");
      
      if (!approvedError) {
        approvedBusinesses = approvedCount || 0;
      } else {
        const { count } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        approvedBusinesses = count || 0;
      }

      const { count: totalBusinesses } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .neq("status", "deleted");

      // Get campaign stats
      const [
        { count: totalCampaigns },
        { count: activeCampaigns },
      ] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // Get revenue from transactions
      const { data: txRows } = await supabase
        .from("business_transactions")
        .select("amount")
        .eq("status", "completed")
        .eq("type", "payment");

      const totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);

      // Get pending payouts
      const { data: earningsRows } = await supabase
        .from("campaign_creators")
        .select("total_earnings, paid_out");

      const pendingPayouts = (earningsRows || []).reduce(
        (s, r) => s + Math.max(0, (r.total_earnings || 0) - (r.paid_out || 0)),
        0
      );

      // Get total users
      const { count: totalUsers } = await supabase
        .from("auth.users")
        .select("*", { count: "exact", head: true });

      // Get reported content
      const { count: reportedContent } = await supabase
        .from("reported_content")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalCreators: totalCreators || 0,
        pendingCreators: pendingCreators || 0,
        activeCreators: activeCreators || 0,
        totalBusinesses: totalBusinesses || 0,
        pendingBusinesses,
        approvedBusinesses,
        totalCampaigns: totalCampaigns || 0,
        activeCampaigns: activeCampaigns || 0,
        totalRevenue,
        pendingPayouts,
        totalUsers: totalUsers || 0,
        reportedContent: reportedContent || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login/portal");
  };

  // ─── NAV ITEMS ───────────────────────────────────────────────────────

  const navItems = [
    { icon: BarChart3, label: "Overview", tab: "overview", badge: 0 },
    { icon: Users, label: "Creators", tab: "creators", badge: stats.pendingCreators },
    { icon: Building2, label: "Businesses", tab: "businesses", badge: stats.pendingBusinesses },
    { icon: Megaphone, label: "Campaigns", tab: "campaigns", badge: 0 },
    { icon: Shield, label: "Support", tab: "support", badge: 0 },
    { icon: AlertTriangle, label: "Reports", tab: "reports", badge: stats.reportedContent },
    { icon: Settings, label: "Settings", tab: "settings", badge: 0 },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Toaster position="top-center" richColors />

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-[#1D1D1D]/10 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black uppercase tracking-tight text-lg">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2 hover:bg-[#F8F8F8] rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-8 h-8 bg-[#1D1D1D] text-white flex items-center justify-center font-black">
            {adminUser?.email?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-[#1D1D1D]/10 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#1D1D1D]/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-lg">
              {adminUser?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">Admin User</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === item.tab
                    ? "bg-[#1D1D1D] text-white"
                    : "hover:bg-[#F8F8F8] text-[#1D1D1D]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-1.5 py-0.5 text-[8px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1D1D1D]/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 p-4 lg:p-8">

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-8 mb-8 flex justify-between items-center"
        >
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Admin Dashboard</h2>
            <p className="text-white/60 text-sm">Manage creators, businesses, and platform settings</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-3 border border-white/20 hover:border-white text-white transition-colors disabled:opacity-50 hidden lg:block"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <AdminOverview stats={stats} onTabChange={setActiveTab} />
        )}

        {/* ── CREATORS TAB ── */}
        {activeTab === "creators" && (
          <AdminCreators />
        )}

        {/* ── BUSINESSES TAB ── */}
        {activeTab === "businesses" && (
          <AdminBusinesses onStatsChange={fetchDashboardData} />
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <AdminCampaigns />
        )}

        {/* ── SUPPORT TAB ── */}
        {activeTab === "support" && (
          <AdminSupport />
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === "reports" && (
          <AdminReports />
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <AdminSettings />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────

function AdminOverview({ stats, onTabChange }: { stats: DashboardStats; onTabChange: (tab: any) => void }) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500" },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-green-500" },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-purple-500" },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border-2 border-[#1D1D1D] p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black uppercase tracking-tight mb-1">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-medium uppercase tracking-widest opacity-40">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-4 mb-4">
            <DollarSign className="w-5 h-5 text-[#389C9A]" />
            <h3 className="font-black uppercase tracking-tight">Total Revenue</h3>
          </div>
          <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-[9px] opacity-40 mt-2">Completed payments</p>
        </div>
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-4 mb-4">
            <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
            <h3 className="font-black uppercase tracking-tight">Pending Payouts</h3>
          </div>
          <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
          <p className="text-[9px] opacity-40 mt-2">Earnings not yet paid out</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            label: "Pending Creator Reviews", 
            value: stats.pendingCreators, 
            action: () => onTabChange("creators"), 
            color: "border-[#FEDB71]" 
          },
          { 
            label: "Pending Business Reviews", 
            value: stats.pendingBusinesses, 
            action: () => onTabChange("businesses"), 
            color: "border-[#389C9A]" 
          },
          { 
            label: "Reported Content", 
            value: stats.reportedContent, 
            action: () => onTabChange("reports"), 
            color: "border-red-500" 
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className={`bg-white border-2 ${item.color} p-6 text-left hover:shadow-lg transition-shadow`}
          >
            <p className="text-3xl font-black italic mb-2">{item.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.label}</p>
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// CREATORS TAB
// ─────────────────────────────────────────────

function AdminCreators() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCreators = async () => {
    setLoading(true);
    
    let query = supabase
      .from("creator_profiles")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Failed to load creators");
    } else {
      setCreators(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCreators();
  }, [filter, searchTerm]);

  const updateCreatorStatus = async (id: string, newStatus: "active" | "suspended") => {
    const { error } = await supabase
      .from("creator_profiles")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update creator status");
      return;
    }

    toast.success(`Creator ${newStatus === "active" ? "approved" : "suspended"}`);
    fetchCreators();
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Creator Applications</h3>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm"
            />
          </div>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["pending_review", "active", "suspended"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : creators.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter.replace("_", " ")} creators</p>
        </div>
      ) : (
        <div className="space-y-4">
          {creators.map((creator) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.full_name} className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-tight mb-1">{creator.full_name}</h4>
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {creator.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> {creator.category || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {creator.followers?.toLocaleString() || 0} followers
                      </span>
                      {creator.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {creator.city}{creator.country ? `, ${creator.country}` : ""}
                        </span>
                      )}
                    </div>
                    {creator.bio && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{creator.bio}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {creator.status.replace("_", " ")}
                </span>
              </div>

              {filter === "pending_review" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => updateCreatorStatus(creator.id, "active")}
                    className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve Creator
                  </button>
                  <button
                    onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject / Suspend
                  </button>
                </div>
              )}

              {filter === "active" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="w-full border-2 border-red-500 text-red-500 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Suspend Creator
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB
// ─────────────────────────────────────────────

function AdminBusinesses({ onStatsChange }: { onStatsChange?: () => void }) {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBusinesses = async () => {
    setLoading(true);
    
    let query = supabase
      .from("businesses")
      .select("*")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    // Handle filter with both possible column names
    if (filter === "pending") {
      query = query.or(`application_status.eq.pending,status.eq.pending_review`);
    } else if (filter === "approved") {
      query = query.or(`application_status.eq.approved,status.eq.active`);
    } else if (filter === "rejected") {
      query = query.or(`application_status.eq.rejected,status.eq.rejected`);
    }

    if (searchTerm) {
      query = query.or(`business_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Failed to load businesses");
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, [filter, searchTerm]);

  const updateBusinessStatus = async (id: string, newStatus: "approved" | "rejected") => {
    // Try updating with both column names to be safe
    const updates: any = {};
    
    if (newStatus === "approved") {
      updates.application_status = "approved";
      updates.status = "active";
      updates.verification_status = "verified";
    } else {
      updates.application_status = "rejected";
      updates.status = "rejected";
      updates.verification_status = "rejected";
    }

    const { error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update business status");
      return;
    }

    toast.success(`Business ${newStatus}`);
    fetchBusinesses();
    onStatsChange?.();
  };

  const getStatusDisplay = (business: BusinessProfile) => {
    return business.application_status || business.status || "unknown";
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Business Applications</h3>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm"
            />
          </div>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["pending", "approved", "rejected"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter} business applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((biz) => {
            const status = getStatusDisplay(biz);
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt={biz.business_name} className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-lg uppercase tracking-tight mb-1">{biz.business_name}</h4>
                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {biz.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {biz.contact_email}
                        </span>
                        {biz.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {biz.contact_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {biz.industry}
                        </span>
                        {biz.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {biz.city}{biz.country ? `, ${biz.country}` : ""}
                          </span>
                        )}
                      </div>
                      {biz.website && (
                        <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">
                          {biz.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      status === "approved" || status === "active" ? "bg-green-100 text-green-700" :
                      status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {status}
                    </span>
                    <span className="text-[8px] text-gray-400">
                      {new Date(biz.created_at).toLocaleDateString()}
                    </span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                      biz.verification_status === "verified" ? "bg-blue-100 text-blue-700" :
                      biz.verification_status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {biz.verification_status || "pending"}
                    </span>
                  </div>
                </div>

                {(filter === "pending") && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => updateBusinessStatus(biz.id, "approved")}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve Business
                    </button>
                    <button
                      onClick={() => updateBusinessStatus(biz.id, "rejected")}
                      className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGNS TAB
// ─────────────────────────────────────────────

function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "completed" | "rejected">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCampaigns = async () => {
    setLoading(true);
    
    let query = supabase
      .from("campaigns")
      .select(`
        *,
        businesses (
          id,
          business_name,
          logo_url
        )
      `)
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (searchTerm) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Failed to load campaigns");
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter, searchTerm]);

  const updateCampaignStatus = async (id: string, newStatus: "active" | "rejected", notes?: string) => {
    const { error } = await supabase
      .from("campaigns")
      .update({
        status: newStatus,
        admin_notes: notes || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update campaign");
      return;
    }

    toast.success(`Campaign ${newStatus}`);
    fetchCampaigns();
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Campaigns</h3>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending_review", "active", "completed", "rejected"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter.replace("_", " ")} campaigns</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((camp) => {
            const biz = camp.businesses;
            const price = camp.pay_rate ?? camp.bid_amount ?? camp.budget ?? 0;
            
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={biz.business_name} className="w-12 h-12 rounded-lg border-2 border-[#1D1D1D] object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-base uppercase tracking-tight">{camp.name}</h4>
                      <div className="flex gap-2 text-[9px] text-gray-500 mt-1">
                        <span>{biz?.business_name}</span>
                        <span>•</span>
                        <span className="capitalize">{camp.type?.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                    <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {filter === "pending_review" && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve Campaign
                    </button>
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPORT TAB
// ─────────────────────────────────────────────

function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved">("open");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const fetchTickets = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load tickets");
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const updateTicketStatus = async (id: string, status: "resolved" | "in_progress", reply?: string) => {
    const updates: any = { status };
    if (reply) {
      updates.admin_reply = reply;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update ticket");
      return;
    }

    toast.success(`Ticket ${status}`);
    fetchTickets();
    setReplyText(prev => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Support Tickets</h3>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["open", "in_progress", "resolved"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter.replace("_", " ")} tickets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5 rounded-full">
                      {ticket.category || "General"}
                    </span>
                    <span className="text-[8px] text-gray-400">
                      Ticket #{ticket.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1D1D1D] mb-2">{ticket.message}</p>
                  <p className="text-[8px] text-gray-400">
                    Submitted: {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap ${
                  ticket.status === "open" ? "bg-yellow-100 text-yellow-700" :
                  ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              {ticket.admin_reply && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Admin Reply:</p>
                  <p className="text-xs text-gray-700">{ticket.admin_reply}</p>
                </div>
              )}

              {filter !== "resolved" && (
                <div className="mt-4">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText[ticket.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm mb-3"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    {filter === "open" && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                        className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      onClick={() => updateTicketStatus(ticket.id, "resolved", replyText[ticket.id])}
                      disabled={!replyText[ticket.id]?.trim()}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reply & Resolve
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────

function AdminReports() {
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed">("pending");

  const fetchReports = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("reported_content")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const updateReportStatus = async (id: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase
      .from("reported_content")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update report");
      return;
    }

    toast.success(`Report ${status}`);
    fetchReports();
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Reported Content</h3>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["pending", "resolved", "dismissed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {report.content_type}
                    </span>
                    <span className="text-[8px] text-gray-400">
                      Report #{report.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">Reason: {report.reason}</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Content ID: {report.content_id}
                  </p>
                  <p className="text-[8px] text-gray-400">
                    Reported: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {filter === "pending" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => updateReportStatus(report.id, "resolved")}
                    className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, "dismissed")}
                    className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────

function AdminSettings() {
  const [platformSettings, setPlatformSettings] = useState({
    platformFee: 10,
    minPayout: 1000,
    maxCampaignDuration: 30,
    autoApproveCreators: false,
    requireBusinessVerification: true,
  });

  const handleSaveSettings = () => {
    // Save settings to database
    toast.success("Settings saved successfully");
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Platform Settings</h3>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">
            Platform Fee (%)
          </label>
          <input
            type="number"
            value={platformSettings.platformFee}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, platformFee: parseInt(e.target.value) }))}
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors"
            min="0"
            max="100"
          />
          <p className="text-[9px] text-gray-500 mt-1">Percentage taken from each transaction</p>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">
            Minimum Payout (₦)
          </label>
          <input
            type="number"
            value={platformSettings.minPayout}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, minPayout: parseInt(e.target.value) }))}
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors"
            min="0"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">
            Max Campaign Duration (days)
          </label>
          <input
            type="number"
            value={platformSettings.maxCampaignDuration}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, maxCampaignDuration: parseInt(e.target.value) }))}
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors"
            min="1"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoApprove"
            checked={platformSettings.autoApproveCreators}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, autoApproveCreators: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="autoApprove" className="text-[10px] font-black uppercase tracking-widest">
            Auto-approve creators
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="requireVerification"
            checked={platformSettings.requireBusinessVerification}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, requireBusinessVerification: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="requireVerification" className="text-[10px] font-black uppercase tracking-widest">
            Require business verification
          </label>
        </div>

        <button
          onClick={handleSaveSettings}
          className="bg-[#1D1D1D] text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
