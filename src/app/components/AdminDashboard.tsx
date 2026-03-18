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
  CreditCard,
  PieChart,
  Zap,
  Heart,
  Share2,
  MessageCircle,
  Flag,
  Trash2,
  Edit,
  EyeOff,
  Check,
  AlertCircle,
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
  suspendedCreators: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  rejectedBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pendingCampaigns: number;
  totalRevenue: number;
  pendingPayouts: number;
  totalUsers: number;
  reportedContent: number;
  openSupportTickets: number;
  platformFee: number;
}

interface CreatorProfile {
  id: string;
  user_id?: string;
  full_name?: string;
  username?: string;
  email?: string;
  category?: string;
  niche?: string;
  platform?: string;
  followers?: number;
  avg_viewers?: number;
  city?: string;
  location?: string;
  country?: string;
  status: 'pending_review' | 'active' | 'suspended';
  created_at: string;
  bio?: string;
  avatar_url?: string;
  rate?: number;
  platforms?: CreatorPlatform[];
}

interface CreatorPlatform {
  id?: string;
  creator_id?: string;
  platform_type?: string;
  platform?: string;
  followers_count?: number;
  followers?: number;
  username?: string;
  verified?: boolean;
}

interface BusinessProfile {
  id: string;
  business_name?: string;   // ✅ real column
  name?: string;            // ✅ real column (alternate)
  full_name?: string;       // ✅ real column (contact person)
  job_title?: string;       // ✅ real column
  email?: string;           // ✅ real column (was contact_email)
  phone_number?: string;    // ✅ real column (was contact_phone)
  industry?: string;        // ✅ real column
  city?: string;            // ✅ real column
  country?: string;         // ✅ real column
  postcode?: string;        // ✅ real column
  logo_url?: string;        // ✅ real column
  logo?: string;            // ✅ real column (alternate)
  website?: string;         // ✅ real column
  description?: string;     // ✅ real column
  bio?: string;             // ✅ real column
  budget?: string;          // ✅ real column
  status: string;
  application_status?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name?: string;
  title?: string;
  type?: 'banner' | 'promo' | 'banner_promo' | string;
  status: 'pending_review' | 'active' | 'completed' | 'rejected' | string;
  budget?: number;
  pay_rate?: number;
  bid_amount?: number;
  created_at: string;
  admin_notes?: string;
  business_id?: string;
  businesses?: {
    id: string;
    business_name?: string;
    name?: string;
    logo_url?: string;
  };
}

interface SupportTicket {
  id: string;
  category?: string;
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | string;
  admin_reply?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

interface ReportedContent {
  id: string;
  content_type: 'campaign' | 'message' | 'profile' | string;
  content_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed' | string;
  created_at: string;
  reported_by: string;
  reported_user_email?: string;
  details?: any;
}

interface Transaction {
  id: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | string;
  type: 'payment' | 'withdrawal' | 'refund' | string;
  created_at: string;
  user_id?: string;
  business_id?: string;
  campaign_id?: string;
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
    "overview" | "creators" | "businesses" | "campaigns" | "support" | "reports" | "transactions" | "settings"
  >("overview");
  const [adminUser, setAdminUser] = useState<any>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0,
    pendingCreators: 0,
    activeCreators: 0,
    suspendedCreators: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    rejectedBusinesses: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    pendingCampaigns: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
    totalUsers: 0,
    reportedContent: 0,
    openSupportTickets: 0,
    platformFee: 10,
  });

  // ─── CHECK ADMIN ACCESS ──────────────────────────────────────────────

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Not authenticated");
          navigate("/login/portal");
          return;
        }

        setAdminUser(user);

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
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("Authentication error");
        navigate("/login/portal");
      }
    };

    checkAdminAccess();
  }, []);

  // ─── FETCH DASHBOARD STATS ───────────────────────────────────────────

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ── CREATORS (table confirmed exists) ───────────────────────────────
      let totalCreators = 0, pendingCreators = 0, activeCreators = 0, suspendedCreators = 0;
      try {
        const { count: total } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        totalCreators = total || 0;
        const { count: pending } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "pending_review");
        pendingCreators = pending || 0;
        const { count: active } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "active");
        activeCreators = active || 0;
        const { count: suspended } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "suspended");
        suspendedCreators = suspended || 0;
      } catch (e) { console.error("Creator stats error:", e); }

      // ── BUSINESSES (table confirmed exists) ─────────────────────────────
      let totalBusinesses = 0, pendingBusinesses = 0, approvedBusinesses = 0, rejectedBusinesses = 0;
      try {
        const { count: total } = await supabase.from("businesses").select("*", { count: "exact", head: true }).neq("status", "deleted");
        totalBusinesses = total || 0;
        const { count: pending } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("application_status", "pending");
        pendingBusinesses = pending || 0;
        const { count: approved } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("application_status", "approved");
        approvedBusinesses = approved || 0;
        const { count: rejected } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("application_status", "rejected");
        rejectedBusinesses = rejected || 0;
      } catch (e) { console.error("Business stats error:", e); }

      // ── CAMPAIGNS (table confirmed exists) ──────────────────────────────
      let totalCampaigns = 0, activeCampaigns = 0, completedCampaigns = 0, pendingCampaigns = 0;
      try {
        const { count: total } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
        totalCampaigns = total || 0;
        const { count: active } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active");
        activeCampaigns = active || 0;
        const { count: completed } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "completed");
        completedCampaigns = completed || 0;
        const { count: pending } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "pending_review");
        pendingCampaigns = pending || 0;
      } catch (e) { console.error("Campaign stats error:", e); }

      // ── REVENUE: business_transactions (403 = RLS blocks admin, skip gracefully) ──
      let totalRevenue = 0;
      try {
        const { data: txRows, error: txError } = await supabase
          .from("business_transactions")
          .select("amount")
          .eq("status", "completed")
          .eq("type", "payment");
        if (!txError) totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);
        // If 403: RLS policy needs UPDATE — add policy: admin can select business_transactions
      } catch (e) { console.error("Revenue fetch error (check RLS):", e); }

      // ── PAYOUTS: campaign_creators — only query columns that exist ───────
      // NOTE: total_earnings and paid_out don't exist in this schema
      // Use streams_completed * pay_rate as approximation if available
      let pendingPayouts = 0;
      try {
        const { data: ccRows, error: ccError } = await supabase
          .from("campaign_creators")
          .select("streams_completed, streams_target, status")
          .eq("status", "ACTIVE");
        // Real payout calc requires pay_rate join — show 0 until schema has earnings columns
        if (!ccError) pendingPayouts = 0;
      } catch (e) { console.error("Payout fetch error:", e); }

      // ── TOTAL USERS: auth.users is not accessible via REST API ──────────
      // Use creator_profiles + businesses count as proxy instead
      let totalUsers = 0;
      try {
        const { count: creatorCount } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
        totalUsers = (creatorCount || 0) + (bizCount || 0);
      } catch (e) { console.error("User count error:", e); }

      // ── REPORTED CONTENT: table may not exist yet ────────────────────────
      let reportedContent = 0;
      try {
        const { count, error: rcError } = await supabase
          .from("reported_content")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (!rcError) reportedContent = count || 0;
        // If 404: CREATE TABLE reported_content in Supabase to enable this feature
      } catch (e) { /* table doesn't exist yet — safe to ignore */ }

      // ── SUPPORT TICKETS: table may not exist yet ─────────────────────────
      let openSupportTickets = 0;
      try {
        const { count, error: stError } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]);
        if (!stError) openSupportTickets = count || 0;
        // If 404: CREATE TABLE support_tickets in Supabase to enable this feature
      } catch (e) { /* table doesn't exist yet — safe to ignore */ }

      setStats({
        totalCreators, pendingCreators, activeCreators, suspendedCreators,
        totalBusinesses, pendingBusinesses, approvedBusinesses, rejectedBusinesses,
        totalCampaigns, activeCampaigns, completedCampaigns, pendingCampaigns,
        totalRevenue, pendingPayouts, totalUsers, reportedContent, openSupportTickets,
        platformFee: 10,
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

  const navItems = [
    { icon: BarChart3, label: "Overview", tab: "overview", badge: 0 },
    { icon: Users, label: "Creators", tab: "creators", badge: stats.pendingCreators },
    { icon: Building2, label: "Businesses", tab: "businesses", badge: stats.pendingBusinesses },
    { icon: Megaphone, label: "Campaigns", tab: "campaigns", badge: stats.pendingCampaigns },
    { icon: MessageCircle, label: "Support", tab: "support", badge: stats.openSupportTickets },
    { icon: Flag, label: "Reports", tab: "reports", badge: stats.reportedContent },
    { icon: CreditCard, label: "Transactions", tab: "transactions", badge: 0 },
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
    <div className="min-h-screen bg-[#F0F0F0] lg:flex">
      <Toaster position="top-center" richColors />

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black uppercase tracking-tight text-lg">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={refreshing} className="p-2 hover:bg-[#F8F8F8] rounded-full">
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-8 h-8 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
            {adminUser?.email?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      {/* Mobile: fixed overlay. Desktop: sticky flex item. */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#1D1D1D]/10 z-50
          flex flex-col shrink-0
          transform transition-transform duration-200
          lg:sticky lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#1D1D1D]/10 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User chip */}
        <div className="px-4 py-4 border-b border-[#1D1D1D]/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-base shrink-0">
              {adminUser?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="font-black uppercase tracking-tight text-sm truncate">Admin User</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5
                  text-[9px] font-black uppercase tracking-widest transition-all rounded
                  ${activeTab === item.tab
                    ? "bg-[#1D1D1D] text-white"
                    : "hover:bg-[#F4F4F4] text-[#1D1D1D]/50 hover:text-[#1D1D1D]"}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-1.5 py-0.5 text-[7px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#1D1D1D]/10 shrink-0">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all rounded"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      {/* lg:ml-64 matches sidebar width; flex-1 fills remaining horizontal space */}
      <div className="flex-1 min-h-screen flex flex-col min-w-0">
        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between bg-white border-b border-[#1D1D1D]/10 px-8 py-4 sticky top-0 z-20">
          <div>
            <h2 className="font-black uppercase tracking-tight text-lg">
              {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
            </h2>
            <p className="text-[9px] opacity-40 uppercase tracking-widest mt-0.5">
              LiveLink Admin Panel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="w-9 h-9 bg-[#1D1D1D] text-white flex items-center justify-center font-black">
              {adminUser?.email?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Page content — max-w keeps it readable on ultra-wide */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === "overview" && <AdminOverview stats={stats} onTabChange={setActiveTab} />}
            {activeTab === "creators" && <AdminCreators />}
            {activeTab === "businesses" && <AdminBusinesses onStatsChange={fetchDashboardData} />}
            {activeTab === "campaigns" && <AdminCampaigns />}
            {activeTab === "support" && <AdminSupport />}
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "transactions" && <AdminTransactions />}
            {activeTab === "settings" && <AdminSettings stats={stats} setStats={setStats} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────

function AdminOverview({ stats, onTabChange }: { stats: DashboardStats; onTabChange: (tab: any) => void }) {
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1D1D1D] text-white px-8 py-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter italic mb-1">
            Admin Dashboard
          </h2>
          <p className="text-white/50 text-sm">Manage creators, businesses, and platform settings</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {stats.pendingCreators > 0 && (
            <button
              onClick={() => onTabChange("creators")}
              className="px-4 py-2 bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#ffd14d] transition-colors"
            >
              {stats.pendingCreators} Pending Creators
            </button>
          )}
          {stats.pendingBusinesses > 0 && (
            <button
              onClick={() => onTabChange("businesses")}
              className="px-4 py-2 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#2d7f7d] transition-colors"
            >
              {stats.pendingBusinesses} Pending Businesses
            </button>
          )}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500", sub: `${stats.pendingCreators} pending` },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-500", sub: `${stats.approvedBusinesses} approved` },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-violet-500", sub: `${stats.pendingCampaigns} pending` },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500", sub: "registered accounts" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border-2 border-[#1D1D1D] p-5 lg:p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-black uppercase tracking-tight mb-0.5">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
            <p className="text-[9px] text-gray-400">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-4 h-4 text-[#389C9A]" />
            <h3 className="font-black uppercase tracking-tight text-xs">Total Revenue</h3>
          </div>
          <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-[9px] opacity-40 mt-2">Completed payments</p>
        </div>
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-4 h-4 text-[#FEDB71]" />
            <h3 className="font-black uppercase tracking-tight text-xs">Pending Payouts</h3>
          </div>
          <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
          <p className="text-[9px] opacity-40 mt-2">Earnings not yet paid out</p>
        </div>
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-3 mb-3">
            <PieChart className="w-4 h-4 text-[#389C9A]" />
            <h3 className="font-black uppercase tracking-tight text-xs">Platform Fee</h3>
          </div>
          <p className="text-3xl font-black italic">{stats.platformFee}%</p>
          <p className="text-[9px] opacity-40 mt-2">Standard platform fee</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-xs mb-3 opacity-50">Action Required</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending Creator Reviews", value: stats.pendingCreators, action: () => onTabChange("creators"), accent: "border-[#FEDB71]", icon: Users },
            { label: "Pending Business Reviews", value: stats.pendingBusinesses, action: () => onTabChange("businesses"), accent: "border-[#389C9A]", icon: Building2 },
            { label: "Pending Campaigns", value: stats.pendingCampaigns, action: () => onTabChange("campaigns"), accent: "border-violet-400", icon: Megaphone },
            { label: "Reported Content", value: stats.reportedContent, action: () => onTabChange("reports"), accent: "border-red-400", icon: Flag },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`bg-white border-2 ${item.accent} p-5 text-left hover:shadow-md transition-all group`}
            >
              <item.icon className="w-5 h-5 text-gray-300 group-hover:text-[#1D1D1D] transition-colors mb-3" />
              <p className="text-3xl font-black italic mb-1">{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-tight">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-xs mb-3 opacity-50">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Review Creators", icon: Users, action: () => onTabChange("creators"), color: "bg-blue-50 text-blue-600" },
            { label: "Review Businesses", icon: Building2, action: () => onTabChange("businesses"), color: "bg-emerald-50 text-emerald-600" },
            { label: "Check Reports", icon: Flag, action: () => onTabChange("reports"), color: "bg-red-50 text-red-600" },
            { label: "View Transactions", icon: CreditCard, action: () => onTabChange("transactions"), color: "bg-violet-50 text-violet-600" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 text-left hover:shadow-md transition-all flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATORS TAB
// ─────────────────────────────────────────────

function AdminCreators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase.from("creator_profiles").select("*");
      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) { toast.error("Failed to load creators"); setCreators([]); return; }

      if (data && data.length > 0) {
        try {
          const creatorIds = data.map((c: any) => c.id || c.user_id).filter(Boolean);
          if (creatorIds.length > 0) {
            const { data: platforms } = await supabase.from("creator_platforms").select("*").in("creator_id", creatorIds);
            setCreators(data.map((creator: any) => ({
              ...creator,
              platforms: platforms?.filter((p: any) => p.creator_id === creator.id || p.creator_id === creator.user_id) || [],
            })));
            return;
          }
        } catch { /* table may not exist */ }
      }
      setCreators(data || []);
    } catch (error) {
      toast.error("Failed to load creators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreators(); }, [filter, searchTerm]);

  const updateCreatorStatus = async (id: string, newStatus: "active" | "suspended") => {
    const { error } = await supabase.from("creator_profiles").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update creator status"); return; }
    toast.success(`Creator ${newStatus === "active" ? "approved" : "suspended"}`);
    fetchCreators();
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("Delete this creator? This cannot be undone.")) return;
    const { error } = await supabase.from("creator_profiles").delete().eq("id", id);
    if (error) { toast.error("Failed to delete creator"); return; }
    toast.success("Creator deleted");
    fetchCreators();
  };

  const getCreatorName = (c: any) => c.full_name || c.username || c.email || "Unnamed Creator";
  const getCreatorEmail = (c: any) => c.email || `${c.username || "creator"}@example.com`;
  const getCreatorCategory = (c: any) => c.niche || c.category || c.industry || "General";
  const getCreatorFollowers = (c: any) => {
    if (c.platforms?.length) return c.platforms.reduce((s: number, p: any) => s + (p.followers_count || p.followers || 0), 0);
    return c.avg_viewers || c.followers || 0;
  };
  const getCreatorLocation = (c: any) => c.location || c.city || c.country || "";
  const getCreatorJoinDate = (c: any) => c.created_at ? new Date(c.created_at).toLocaleDateString() : "Unknown";

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
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Filter className="w-4 h-4" /></button>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab === "all" ? "All Creators" : tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : creators.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {creators.map((creator) => (
            <motion.div key={creator.id || creator.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={getCreatorName(creator)} onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0" />
                  ) : (
                    <div onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-base uppercase tracking-tight truncate">{getCreatorName(creator)}</h4>
                      {creator.verified && <Shield className="w-3.5 h-3.5 text-[#389C9A] shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-gray-500">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{getCreatorEmail(creator)}</span>
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" />{getCreatorCategory(creator)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{getCreatorFollowers(creator).toLocaleString()} followers</span>
                      {getCreatorLocation(creator) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{getCreatorLocation(creator)}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {getCreatorJoinDate(creator)}</span>
                    </div>
                    {creator.platforms?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {creator.platforms.map((p: any, idx: number) => (
                          <span key={idx} className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="w-2 h-2" />{p.platform_type || p.platform}: {(p.followers_count || p.followers)?.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}
                    {creator.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-1">{creator.bio}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                    creator.status === "active" ? "bg-green-100 text-green-700" :
                    creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{creator.status?.replace("_", " ") || "pending"}</span>
                  <span className="text-[8px] text-gray-400">ID: {(creator.id || creator.user_id)?.slice(0, 8)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                <button onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                  className="px-3 py-1.5 border-2 border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Details
                </button>
                {creator.status === "pending_review" && <>
                  <button onClick={() => updateCreatorStatus(creator.id, "active")}
                    className="flex-1 bg-[#1D1D1D] text-white py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="flex-1 border-2 border-[#1D1D1D] py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </>}
                {creator.status === "active" && (
                  <button onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="flex-1 border-2 border-red-500 text-red-500 py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                    Suspend
                  </button>
                )}
                {creator.status === "suspended" && (
                  <button onClick={() => updateCreatorStatus(creator.id, "active")}
                    className="flex-1 border-2 border-green-500 text-green-500 py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-colors">
                    Reinstate
                  </button>
                )}
                <button onClick={() => deleteCreator(creator.id)}
                  className="px-3 py-1.5 border-2 border-red-500 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showDetailModal && selectedCreator && (
        <CreatorDetailModal creator={selectedCreator} onClose={() => setShowDetailModal(false)}
          onUpdate={() => { setShowDetailModal(false); fetchCreators(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATOR DETAIL MODAL
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose, onUpdate }: { creator: any; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight">Creator Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F8F8F8]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-5">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.full_name} className="w-20 h-20 border-2 border-[#1D1D1D] object-cover" />
            ) : (
              <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                <User className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{creator.full_name || creator.username}</h2>
              <p className="text-sm text-gray-500">{creator.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>{creator.status}</span>
                {creator.verified && <span className="text-[8px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Verified</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Followers", value: creator.followers?.toLocaleString() || "0" },
              { label: "Avg Viewers", value: creator.avg_viewers?.toLocaleString() || "0" },
              { label: "Rate", value: creator.rate ? `₦${creator.rate}` : "—" },
            ].map((s, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 text-center">
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[8px] uppercase tracking-widest opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          {creator.platforms?.length > 0 && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">Connected Platforms</h4>
              <div className="space-y-2">
                {creator.platforms.map((p: any, idx: number) => (
                  <div key={idx} className="border-2 border-[#1D1D1D] px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="font-black text-sm">{p.platform_type || p.platform}</p>
                      <p className="text-[8px] text-gray-500">@{p.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{(p.followers_count || p.followers)?.toLocaleString()}</p>
                      <p className="text-[8px] opacity-60">followers</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {creator.bio && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">Bio</h4>
              <p className="text-sm text-gray-700">{creator.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Location", value: creator.location || creator.city || "Not specified" },
              { label: "Joined", value: new Date(creator.created_at).toLocaleDateString() },
              { label: "Category", value: creator.niche || creator.category || "General" },
              { label: "User ID", value: creator.user_id || creator.id, mono: true },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-0.5">{item.label}</p>
                <p className={item.mono ? "text-[9px] font-mono" : ""}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#1D1D1D]/10">
            <button onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors">
              Close
            </button>
            <button onClick={() => toast.info("Messaging feature coming soon")}
              className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors">
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB
// ─────────────────────────────────────────────

function AdminBusinesses({ onStatsChange }: { onStatsChange?: () => void }) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase.from("businesses").select("*").order("created_at", { ascending: false }).neq("status", "deleted");
      if (filter === "pending") query = query.or(`application_status.eq.pending,status.eq.pending_review`);
      else if (filter === "approved") query = query.or(`application_status.eq.approved,status.eq.active`);
      else if (filter === "rejected") query = query.or(`application_status.eq.rejected,status.eq.rejected`);
      if (searchTerm) query = query.or(`business_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load businesses"); } else { setBusinesses(data || []); }
    } catch { toast.error("Failed to load businesses"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBusinesses(); }, [filter, searchTerm]);

  const updateBusinessStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const updates: any = newStatus === "approved"
      ? { application_status: "approved", status: "active", verification_status: "verified" }
      : { application_status: "rejected", status: "rejected", verification_status: "rejected" };
    const { error } = await supabase.from("businesses").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update business status"); return; }
    toast.success(`Business ${newStatus}`);
    fetchBusinesses(); onStatsChange?.();
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm("Delete this business?")) return;
    const { error } = await supabase.from("businesses").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Failed to delete business"); return; }
    toast.success("Business deleted"); fetchBusinesses(); onStatsChange?.();
  };

  const getBusinessName = (b: any) => b.business_name || b.name || "Unnamed Business";
  const getContactName = (b: any) => b.full_name || "Unknown";
  const getContactEmail = (b: any) => b.email || "No email";
  const getStatusDisplay = (b: any) => b.application_status || b.status || "pending";

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Business Applications</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search businesses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm" />
          </div>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Filter className="w-4 h-4" /></button>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending", "approved", "rejected", "all"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >{tab === "all" ? "All Businesses" : tab}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : businesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((biz) => {
            const status = getStatusDisplay(biz);
            const verificationStatus = biz.verification_status || "pending";
            return (
              <motion.div key={biz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0" />
                    ) : (
                      <div onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight truncate mb-1">{getBusinessName(biz)}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-gray-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{getContactName(biz)}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{getContactEmail(biz)}</span>
                        {biz.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{biz.phone_number}</span>}
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{biz.industry || biz.sector || "—"}</span>
                        {(biz.city || biz.location) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{biz.city || biz.location}</span>}
                      </div>
                      {biz.description && <p className="text-xs text-gray-500 mt-2 line-clamp-1">{biz.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                      status === "approved" || status === "active" ? "bg-green-100 text-green-700" :
                      status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{status}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                      verificationStatus === "verified" ? "bg-blue-100 text-blue-700" :
                      verificationStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                    }`}>{verificationStatus}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                  <button onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                    className="px-3 py-1.5 border-2 border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Details
                  </button>
                  {filter === "pending" && <>
                    <button onClick={() => updateBusinessStatus(biz.id, "approved")}
                      className="flex-1 bg-[#1D1D1D] text-white py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateBusinessStatus(biz.id, "rejected")}
                      className="flex-1 border-2 border-[#1D1D1D] py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>}
                  <button onClick={() => deleteBusiness(biz.id)}
                    className="px-3 py-1.5 border-2 border-red-500 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showDetailModal && selectedBusiness && (
        <BusinessDetailModal business={selectedBusiness} onClose={() => setShowDetailModal(false)}
          onUpdate={() => { setShowDetailModal(false); fetchBusinesses(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS DETAIL MODAL
// ─────────────────────────────────────────────

function BusinessDetailModal({ business, onClose, onUpdate }: { business: any; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight">Business Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F8F8F8]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-5">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.business_name} className="w-20 h-20 border-2 border-[#1D1D1D] object-cover" />
            ) : (
              <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                <Building2 className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{business.business_name || business.name}</h2>
              <p className="text-sm text-gray-500">{business.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                  (business.application_status === "approved" || business.status === "active") ? "bg-green-100 text-green-700" :
                  (business.application_status === "rejected" || business.status === "rejected") ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>{business.application_status || business.status}</span>
                <span className={`text-[8px] px-2 py-1 rounded-full ${
                  business.verification_status === "verified" ? "bg-blue-100 text-blue-700" :
                  business.verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                }`}>{business.verification_status || "pending"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Contact Person", value: business.full_name || "—" },
              { label: "Phone", value: business.phone_number || "—" },
              { label: "Industry", value: business.industry || business.sector || "—" },
              { label: "Location", value: `${business.city || business.location || "—"}${business.country ? `, ${business.country}` : ""}` },
              { label: "Joined", value: new Date(business.created_at).toLocaleDateString() },
            ].map((item, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">{item.label}</p>
                <p className="font-black text-sm">{item.value}</p>
              </div>
            ))}
            {business.website && (
              <div className="border-2 border-[#1D1D1D] p-3">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Website</p>
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-black truncate block">
                  {business.website}
                </a>
              </div>
            )}
          </div>

          {business.description && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">About</h4>
              <p className="text-sm text-gray-700">{business.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Campaigns", value: "0" }, { label: "Spent", value: "₦0" }, { label: "Reviews", value: "0" }].map((s, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 text-center">
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[8px] uppercase tracking-widest opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#1D1D1D]/10">
            <button onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors">
              Close
            </button>
            <button onClick={() => toast.info("Messaging feature coming soon")}
              className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors">
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGNS TAB
// ─────────────────────────────────────────────

function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "completed" | "rejected" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      let query = supabase.from("campaigns").select(`*, businesses (id, business_name, logo_url)`).order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load campaigns"); } else { setCampaigns(data || []); }
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, [filter, searchTerm]);

  const updateCampaignStatus = async (id: string, newStatus: "active" | "rejected" | "completed", notes?: string) => {
    const { error } = await supabase.from("campaigns").update({ status: newStatus, admin_notes: notes || null }).eq("id", id);
    if (error) { toast.error("Failed to update campaign"); return; }
    toast.success(`Campaign ${newStatus}`); fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) { toast.error("Failed to delete campaign"); return; }
    toast.success("Campaign deleted"); fetchCampaigns();
  };

  const getCampaignName = (c: any) => c.name || c.title || "Unnamed Campaign";
  const getBusinessName = (b: any) => b?.business_name || b?.name || "Unknown Business";
  const getPrice = (c: any) => c.pay_rate ?? c.bid_amount ?? c.budget ?? 0;

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Campaigns</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search campaigns..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm" />
          </div>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Filter className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending_review", "active", "completed", "rejected", "all"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}>{tab.replace("_", " ")}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((camp) => {
            const biz = camp.businesses;
            const price = getPrice(camp);
            return (
              <motion.div key={camp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-11 h-11 border-2 border-[#1D1D1D] object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight truncate">{getCampaignName(camp)}</h4>
                      <div className="flex flex-wrap gap-2 text-[9px] text-gray-500 mt-0.5">
                        <span>{getBusinessName(biz)}</span>
                        <span>•</span>
                        <span className="capitalize">{camp.type?.replace("_", " ") || "Standard"}</span>
                        <span>•</span>
                        <span>ID: {camp.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                    <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${
                      camp.status === "active" ? "bg-green-100 text-green-700" :
                      camp.status === "completed" ? "bg-blue-100 text-blue-700" :
                      camp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{camp.status?.replace("_", " ")}</span>
                  </div>
                </div>
                {camp.admin_notes && (
                  <div className="mb-3 p-2 bg-gray-50 border border-gray-200">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-0.5">Admin Notes:</p>
                    <p className="text-xs text-gray-700">{camp.admin_notes}</p>
                  </div>
                )}
                {filter === "pending_review" && (
                  <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                    <button onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="flex-1 border-2 border-[#1D1D1D] py-2 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button onClick={() => deleteCampaign(camp.id)}
                      className="px-3 py-2 border-2 border-red-500 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {filter === "active" && (
                  <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                    <button onClick={() => updateCampaignStatus(camp.id, "completed")}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors">
                      Mark Completed
                    </button>
                    <button onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="flex-1 border-2 border-red-500 text-red-500 py-2 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                      Reject Campaign
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
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "all">("open");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load tickets"); } else { setTickets(data || []); }
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const updateTicketStatus = async (id: string, status: "resolved" | "in_progress", reply?: string) => {
    const updates: any = { status };
    if (reply) updates.admin_reply = reply;
    const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update ticket"); return; }
    toast.success(`Ticket ${status}`); fetchTickets();
    setReplyText(prev => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Support Tickets</h3>
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["open", "in_progress", "resolved", "all"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}>{tab === "all" ? "All Tickets" : tab.replace("_", " ")}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all">
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-[#F4F4F4] px-2 py-0.5 rounded-full">
                      {ticket.category || "General"}
                    </span>
                    <span className="text-[8px] text-gray-400">#{ticket.id.slice(0, 8)}</span>
                  </div>
                  {ticket.subject && <h4 className="font-black text-sm mb-1">{ticket.subject}</h4>}
                  <p className="text-sm text-[#1D1D1D] mb-2 line-clamp-3">{ticket.message}</p>
                  <p className="text-[8px] text-gray-400">
                    From: {ticket.user_email || ticket.user_id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  ticket.status === "open" ? "bg-yellow-100 text-yellow-700" :
                  ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                }`}>{ticket.status.replace("_", " ")}</span>
              </div>

              {ticket.admin_reply && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1">Admin Reply:</p>
                  <p className="text-xs text-gray-700">{ticket.admin_reply}</p>
                </div>
              )}

              {filter !== "resolved" && (
                <div className="mt-3">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText[ticket.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm mb-2"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    {filter === "open" && (
                      <button onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                        className="px-4 py-2 border-2 border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors">
                        In Progress
                      </button>
                    )}
                    <button onClick={() => updateTicketStatus(ticket.id, "resolved", replyText[ticket.id])}
                      disabled={!replyText[ticket.id]?.trim()}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase.from("reported_content").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load reports"); } else { setReports(data || []); }
    } catch { toast.error("Failed to load reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const updateReportStatus = async (id: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase.from("reported_content").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update report"); return; }
    toast.success(`Report ${status}`); fetchReports();
  };

  const deleteReportedContent = async (contentType: string, contentId: string, reportId: string) => {
    if (!confirm(`Delete this ${contentType}?`)) return;
    let error;
    if (contentType === "campaign") ({ error } = await supabase.from("campaigns").delete().eq("id", contentId));
    else if (contentType === "message") ({ error } = await supabase.from("messages").delete().eq("id", contentId));
    else if (contentType === "profile") ({ error } = await supabase.from("creator_profiles").delete().eq("id", contentId));
    if (error) { toast.error("Failed to delete content"); return; }
    await updateReportStatus(reportId, "resolved");
    toast.success("Content deleted and report resolved");
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Reported Content</h3>
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending", "resolved", "dismissed", "all"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}>{tab}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all">
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {report.content_type}
                    </span>
                    <span className="text-[8px] text-gray-400">#{report.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">Reason: {report.reason}</p>
                  <p className="text-xs text-gray-500 mb-2">Content ID: {report.content_id}</p>
                  {report.details && (
                    <pre className="text-[8px] bg-gray-50 p-2 rounded mb-2 overflow-x-auto max-h-24">
                      {JSON.stringify(report.details, null, 2)}
                    </pre>
                  )}
                  <p className="text-[8px] text-gray-400">
                    Reported by: {report.reported_by} · {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  report.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  report.status === "resolved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                }`}>{report.status}</span>
              </div>
              {filter === "pending" && (
                <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                  <button onClick={() => deleteReportedContent(report.content_type, report.content_id, report.id)}
                    className="flex-1 bg-red-500 text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete Content
                  </button>
                  <button onClick={() => updateReportStatus(report.id, "resolved")}
                    className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Keep & Resolve
                  </button>
                  <button onClick={() => updateReportStatus(report.id, "dismissed")}
                    className="flex-1 border-2 border-[#1D1D1D] py-2 text-[8px] font-black uppercase tracking-widest hover:bg-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" /> Dismiss
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
// TRANSACTIONS TAB
// ─────────────────────────────────────────────

function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "payment" | "withdrawal" | "refund">("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase.from("business_transactions").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("type", filter);
      const now = new Date();
      if (dateRange === "today") query = query.gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString());
      else if (dateRange === "week") query = query.gte("created_at", new Date(now.setDate(now.getDate() - 7)).toISOString());
      else if (dateRange === "month") query = query.gte("created_at", new Date(now.setMonth(now.getMonth() - 1)).toISOString());
      const { data, error } = await query;
      if (error) { toast.error("Failed to load transactions"); } else { setTransactions(data || []); }
    } catch { toast.error("Failed to load transactions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, [filter, dateRange]);

  const getTotalAmount = () => transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const getCompletedCount = () => transactions.filter(t => t.status === "completed").length;

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Transactions</h3>
        <div className="flex gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-[9px] font-black uppercase tracking-widest">
            <option value="all">All Types</option>
            <option value="payment">Payments</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="refund">Refunds</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-[9px] font-black uppercase tracking-widest">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1D1D1D] text-white p-5">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Total Volume</p>
          <p className="text-2xl font-black">₦{getTotalAmount().toLocaleString()}</p>
        </div>
        <div className="border-2 border-[#1D1D1D] p-5">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Transactions</p>
          <p className="text-2xl font-black">{transactions.length}</p>
        </div>
        <div className="border-2 border-[#1D1D1D] p-5">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Completed</p>
          <p className="text-2xl font-black">{getCompletedCount()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No transactions found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#1D1D1D]">
                {["ID", "Date", "Type", "Amount", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-2 text-[8px] font-black uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8]">
                  <td className="py-3 px-2 text-[9px] font-mono text-gray-500">{tx.id.slice(0, 8)}</td>
                  <td className="py-3 px-2 text-[9px]">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      tx.type === "payment" ? "bg-green-100 text-green-700" :
                      tx.type === "withdrawal" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{tx.type}</span>
                  </td>
                  <td className="py-3 px-2 font-black text-sm">₦{tx.amount?.toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      tx.status === "completed" ? "bg-green-100 text-green-700" :
                      tx.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{tx.status}</span>
                  </td>
                  <td className="py-3 px-2">
                    <button className="text-[8px] font-black underline hover:no-underline uppercase tracking-widest">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────

function AdminSettings({ stats, setStats }: { stats: DashboardStats; setStats: any }) {
  const [platformSettings, setPlatformSettings] = useState({
    platformFee: stats.platformFee,
    minPayout: 1000,
    maxCampaignDuration: 30,
    autoApproveCreators: false,
    requireBusinessVerification: true,
    allowGuestBrowsing: true,
    maintenanceMode: false,
    requireEmailVerification: true,
  });

  const handleSaveSettings = () => {
    setStats((prev: DashboardStats) => ({ ...prev, platformFee: platformSettings.platformFee }));
    toast.success("Settings saved successfully");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings panels */}
      <div className="lg:col-span-2 space-y-5">
        {/* Fee Settings */}
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm uppercase tracking-tight mb-4">Fee Settings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5">Platform Fee (%)</label>
              <input type="number" value={platformSettings.platformFee}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, platformFee: parseInt(e.target.value) }))}
                className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors" min="0" max="100" />
              <p className="text-[9px] text-gray-500 mt-1">% taken from each transaction</p>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5">Minimum Payout (₦)</label>
              <input type="number" value={platformSettings.minPayout}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, minPayout: parseInt(e.target.value) }))}
                className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors" min="0" />
            </div>
          </div>
        </div>

        {/* Campaign Settings */}
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm uppercase tracking-tight mb-4">Campaign Settings</h4>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5">Max Campaign Duration (days)</label>
            <input type="number" value={platformSettings.maxCampaignDuration}
              onChange={(e) => setPlatformSettings(prev => ({ ...prev, maxCampaignDuration: parseInt(e.target.value) }))}
              className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors" min="1" />
          </div>
        </div>

        {/* Approval & System Settings */}
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm uppercase tracking-tight mb-4">Approval & System Settings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "autoApproveCreators", label: "Auto-approve creators" },
              { key: "requireBusinessVerification", label: "Require business verification" },
              { key: "requireEmailVerification", label: "Require email verification" },
              { key: "allowGuestBrowsing", label: "Allow guest browsing" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
                <input type="checkbox" checked={(platformSettings as any)[key]}
                  onChange={(e) => setPlatformSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-red-200 hover:border-red-500 transition-colors bg-red-50">
              <input type="checkbox" checked={platformSettings.maintenanceMode}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Maintenance Mode</span>
            </label>
          </div>
        </div>

        <button onClick={handleSaveSettings}
          className="bg-[#1D1D1D] text-white px-8 py-4 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors w-full sm:w-auto">
          Save Settings
        </button>
      </div>

      {/* Right column: info summary */}
      <div className="space-y-4">
        <div className="bg-white border-2 border-[#1D1D1D] p-5">
          <h4 className="font-black text-xs uppercase tracking-tight mb-4">Current Config</h4>
          <div className="space-y-3">
            {[
              { label: "Platform Fee", value: `${platformSettings.platformFee}%` },
              { label: "Min Payout", value: `₦${platformSettings.minPayout.toLocaleString()}` },
              { label: "Max Campaign", value: `${platformSettings.maxCampaignDuration} days` },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-[#1D1D1D]/5 last:border-0">
                <span className="text-[9px] uppercase tracking-widest opacity-50">{item.label}</span>
                <span className="font-black text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1D1D1D] text-white p-5">
          <h4 className="font-black text-xs uppercase tracking-tight mb-3 opacity-60">Platform Health</h4>
          <div className="space-y-2">
            {[
              { label: "Total Users", value: "—" },
              { label: "Active Campaigns", value: "—" },
              { label: "Pending Reviews", value: "—" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-[9px] opacity-50 uppercase tracking-widest">{item.label}</span>
                <span className="font-black">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AdminDashboard as AdminDashboardScreen };
export default AdminDashboard;
