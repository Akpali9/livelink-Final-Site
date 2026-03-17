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
  business_name?: string;
  company_name?: string;
  contact_name?: string;
  owner_name?: string;
  representative?: string;
  contact_email?: string;
  email?: string;
  contact_phone?: string;
  phone?: string;
  industry?: string;
  sector?: string;
  city?: string;
  location?: string;
  country?: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'deleted';
  application_status?: 'pending' | 'approved' | 'rejected';
  verification_status?: 'pending' | 'verified' | 'rejected';
  created_at: string;
  website?: string;
  description?: string;
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
    company_name?: string;
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
      // Get creator stats with flexible field names
      let totalCreators = 0;
      let pendingCreators = 0;
      let activeCreators = 0;
      let suspendedCreators = 0;

      try {
        const { count: total } = await supabase
          .from("creator_profiles")
          .select("*", { count: "exact", head: true });
        totalCreators = total || 0;

        const { count: pending } = await supabase
          .from("creator_profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_review");
        pendingCreators = pending || 0;

        const { count: active } = await supabase
          .from("creator_profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        activeCreators = active || 0;

        const { count: suspended } = await supabase
          .from("creator_profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "suspended");
        suspendedCreators = suspended || 0;
      } catch (error) {
        console.error("Error fetching creator stats:", error);
      }

      // Get business stats with flexible field names
      let totalBusinesses = 0;
      let pendingBusinesses = 0;
      let approvedBusinesses = 0;
      let rejectedBusinesses = 0;

      try {
        const { count: total } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .neq("status", "deleted");
        totalBusinesses = total || 0;

        // Try with application_status first, then fall back to status
        const { count: pending, error: pendingError } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("application_status", "pending");
        
        if (!pendingError) {
          pendingBusinesses = pending || 0;
        } else {
          const { count } = await supabase
            .from("businesses")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_review");
          pendingBusinesses = count || 0;
        }

        const { count: approved, error: approvedError } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("application_status", "approved");
        
        if (!approvedError) {
          approvedBusinesses = approved || 0;
        } else {
          const { count } = await supabase
            .from("businesses")
            .select("*", { count: "exact", head: true })
            .eq("status", "active");
          approvedBusinesses = count || 0;
        }

        const { count: rejected, error: rejectedError } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .eq("application_status", "rejected");
        
        if (!rejectedError) {
          rejectedBusinesses = rejected || 0;
        } else {
          const { count } = await supabase
            .from("businesses")
            .select("*", { count: "exact", head: true })
            .eq("status", "rejected");
          rejectedBusinesses = count || 0;
        }
      } catch (error) {
        console.error("Error fetching business stats:", error);
      }

      // Get campaign stats
      let totalCampaigns = 0;
      let activeCampaigns = 0;
      let completedCampaigns = 0;
      let pendingCampaigns = 0;

      try {
        const { count: total } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true });
        totalCampaigns = total || 0;

        const { count: active } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        activeCampaigns = active || 0;

        const { count: completed } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed");
        completedCampaigns = completed || 0;

        const { count: pending } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_review");
        pendingCampaigns = pending || 0;
      } catch (error) {
        console.error("Error fetching campaign stats:", error);
      }

      // Get revenue from transactions
      let totalRevenue = 0;
      try {
        const { data: txRows } = await supabase
          .from("business_transactions")
          .select("amount")
          .eq("status", "completed")
          .eq("type", "payment");

        totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);
      } catch (error) {
        console.error("Error fetching revenue:", error);
      }

      // Get pending payouts
      let pendingPayouts = 0;
      try {
        const { data: earningsRows } = await supabase
          .from("campaign_creators")
          .select("total_earnings, paid_out");

        pendingPayouts = (earningsRows || []).reduce(
          (s, r) => s + Math.max(0, (r.total_earnings || 0) - (r.paid_out || 0)),
          0
        );
      } catch (error) {
        console.error("Error fetching payouts:", error);
      }

      // Get total users
      let totalUsers = 0;
      try {
        const { count } = await supabase
          .from("auth.users")
          .select("*", { count: "exact", head: true });
        totalUsers = count || 0;
      } catch (error) {
        console.error("Error fetching user count:", error);
      }

      // Get reported content
      let reportedContent = 0;
      try {
        const { count } = await supabase
          .from("reported_content")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        reportedContent = count || 0;
      } catch (error) {
        console.error("Error fetching reports:", error);
      }

      // Get open support tickets
      let openSupportTickets = 0;
      try {
        const { count } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]);
        openSupportTickets = count || 0;
      } catch (error) {
        console.error("Error fetching tickets:", error);
      }

      setStats({
        totalCreators,
        pendingCreators,
        activeCreators,
        suspendedCreators,
        totalBusinesses,
        pendingBusinesses,
        approvedBusinesses,
        rejectedBusinesses,
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        pendingCampaigns,
        totalRevenue,
        pendingPayouts,
        totalUsers,
        reportedContent,
        openSupportTickets,
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

  // ─── NAV ITEMS ───────────────────────────────────────────────────────

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

        {/* Render active tab */}
        {activeTab === "overview" && <AdminOverview stats={stats} onTabChange={setActiveTab} />}
        {activeTab === "creators" && <AdminCreators />}
        {activeTab === "businesses" && <AdminBusinesses onStatsChange={fetchDashboardData} />}
        {activeTab === "campaigns" && <AdminCampaigns />}
        {activeTab === "support" && <AdminSupport />}
        {activeTab === "reports" && <AdminReports />}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "settings" && <AdminSettings stats={stats} setStats={setStats} />}
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
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500", change: "+12%" },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-green-500", change: "+8%" },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-purple-500", change: "+23%" },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500", change: "+15%" },
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
              <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-black uppercase tracking-tight mb-1">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-medium uppercase tracking-widest opacity-40">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center gap-4 mb-4">
            <PieChart className="w-5 h-5 text-[#389C9A]" />
            <h3 className="font-black uppercase tracking-tight">Platform Fee</h3>
          </div>
          <p className="text-3xl font-black italic">{stats.platformFee}%</p>
          <p className="text-[9px] opacity-40 mt-2">Standard platform fee</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Pending Creator Reviews", 
            value: stats.pendingCreators, 
            action: () => onTabChange("creators"), 
            color: "border-[#FEDB71]",
            icon: Users
          },
          { 
            label: "Pending Business Reviews", 
            value: stats.pendingBusinesses, 
            action: () => onTabChange("businesses"), 
            color: "border-[#389C9A]",
            icon: Building2
          },
          { 
            label: "Pending Campaigns", 
            value: stats.pendingCampaigns, 
            action: () => onTabChange("campaigns"), 
            color: "border-purple-500",
            icon: Megaphone
          },
          { 
            label: "Reported Content", 
            value: stats.reportedContent, 
            action: () => onTabChange("reports"), 
            color: "border-red-500",
            icon: Flag
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className={`bg-white border-2 ${item.color} p-6 text-left hover:shadow-lg transition-shadow group`}
          >
            <div className="flex justify-between items-start mb-4">
              <item.icon className="w-5 h-5 text-gray-400 group-hover:text-[#1D1D1D] transition-colors" />
            </div>
            <p className="text-3xl font-black italic mb-2">{item.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="font-black uppercase tracking-tight mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Review Creators", icon: Users, action: () => onTabChange("creators"), color: "bg-blue-50 text-blue-600" },
            { label: "Review Businesses", icon: Building2, action: () => onTabChange("businesses"), color: "bg-green-50 text-green-600" },
            { label: "Check Reports", icon: Flag, action: () => onTabChange("reports"), color: "bg-red-50 text-red-600" },
            { label: "View Transactions", icon: CreditCard, action: () => onTabChange("transactions"), color: "bg-purple-50 text-purple-600" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 text-left hover:shadow-lg transition-shadow flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// CREATORS TAB - FLEXIBLE SCHEMA
// ─────────────────────────────────────────────

function AdminCreators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchCreators = async () => {
    setLoading(true);
    
    try {
      // Fetch creators with basic info
      let query = supabase
        .from("creator_profiles")
        .select("*");

      if (filter) {
        query = query.eq("status", filter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching creators:", error);
        toast.error("Failed to load creators");
      } else {
        // Try to fetch platform data separately if the table exists
        if (data && data.length > 0) {
          try {
            const creatorIds = data.map(c => c.id || c.user_id).filter(Boolean);
            
            if (creatorIds.length > 0) {
              const { data: platforms } = await supabase
                .from("creator_platforms")
                .select("*")
                .in("creator_id", creatorIds);
              
              // Merge platform data with creators
              const creatorsWithPlatforms = data.map(creator => ({
                ...creator,
                platforms: platforms?.filter(p => 
                  p.creator_id === creator.id || p.creator_id === creator.user_id
                ) || []
              }));
              
              setCreators(creatorsWithPlatforms);
            } else {
              setCreators(data);
            }
          } catch (platformError) {
            // Platform table might not exist, just use creator data
            console.log("Platform table not available:", platformError);
            setCreators(data);
          }
        } else {
          setCreators(data || []);
        }
      }
    } catch (error) {
      console.error("Error in fetchCreators:", error);
      toast.error("Failed to load creators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [filter, searchTerm]);

  const updateCreatorStatus = async (id: string, newStatus: "active" | "suspended") => {
    try {
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
    } catch (error) {
      console.error("Error updating creator:", error);
      toast.error("Failed to update creator");
    }
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("Are you sure you want to delete this creator? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("creator_profiles")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete creator");
        return;
      }

      toast.success("Creator deleted");
      fetchCreators();
    } catch (error) {
      console.error("Error deleting creator:", error);
      toast.error("Failed to delete creator");
    }
  };

  const viewCreatorDetails = (creator: any) => {
    setSelectedCreator(creator);
    setShowDetailModal(true);
  };

  const getCreatorName = (creator: any) => {
    return creator.full_name || creator.username || creator.email || "Unnamed Creator";
  };

  const getCreatorEmail = (creator: any) => {
    return creator.email || `${creator.username || "creator"}@example.com`;
  };

  const getCreatorCategory = (creator: any) => {
    return creator.niche || creator.category || creator.industry || "General";
  };

  const getCreatorFollowers = (creator: any) => {
    // Try to get followers from platforms
    if (creator.platforms && creator.platforms.length > 0) {
      const total = creator.platforms.reduce((sum: number, p: any) => 
        sum + (p.followers_count || p.followers || 0), 0);
      return total;
    }
    return creator.avg_viewers || creator.followers || 0;
  };

  const getCreatorLocation = (creator: any) => {
    return creator.location || creator.city || creator.country || "";
  };

  const getCreatorJoinDate = (creator: any) => {
    return creator.created_at ? new Date(creator.created_at).toLocaleDateString() : "Unknown";
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
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab === "all" ? null : tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              (tab === "all" && !filter) || filter === tab
                ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab === "all" ? "All Creators" : tab.replace("_", " ")}
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
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {creators.map((creator) => (
            <motion.div
              key={creator.id || creator.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 flex-1">
                  {creator.avatar_url ? (
                    <img 
                      src={creator.avatar_url} 
                      alt={getCreatorName(creator)} 
                      className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80"
                      onClick={() => viewCreatorDetails(creator)}
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200"
                      onClick={() => viewCreatorDetails(creator)}
                    >
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-lg uppercase tracking-tight mb-1">{getCreatorName(creator)}</h4>
                      {creator.verified && (
                        <Shield className="w-4 h-4 text-[#389C9A]" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {getCreatorEmail(creator)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> {getCreatorCategory(creator)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {getCreatorFollowers(creator).toLocaleString()} followers
                      </span>
                      {getCreatorLocation(creator) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {getCreatorLocation(creator)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Joined {getCreatorJoinDate(creator)}
                      </span>
                    </div>
                    
                    {/* Platforms */}
                    {creator.platforms && creator.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {creator.platforms.map((p: any, idx: number) => (
                          <span key={idx} className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="w-2 h-2" />
                            {p.platform_type || p.platform}: {p.followers_count || p.followers?.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {creator.bio && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{creator.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                    creator.status === "active" ? "bg-green-100 text-green-700" :
                    creator.status === "suspended" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {creator.status?.replace("_", " ") || "pending"}
                  </span>
                  <span className="text-[8px] text-gray-400">
                    ID: {(creator.id || creator.user_id)?.slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => viewCreatorDetails(creator)}
                  className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> View Details
                </button>
                
                {creator.status === "pending_review" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "active")}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "suspended")}
                      className="flex-1 border-2 border-[#1D1D1D] py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                
                {creator.status === "active" && (
                  <button
                    onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="flex-1 border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Suspend
                  </button>
                )}
                
                {creator.status === "suspended" && (
                  <button
                    onClick={() => updateCreatorStatus(creator.id, "active")}
                    className="flex-1 border-2 border-green-500 text-green-500 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Reinstate
                  </button>
                )}
                
                <button
                  onClick={() => deleteCreator(creator.id)}
                  className="px-4 py-2 border-2 border-red-500 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCreator && (
        <CreatorDetailModal
          creator={selectedCreator}
          onClose={() => setShowDetailModal(false)}
          onUpdate={() => {
            setShowDetailModal(false);
            fetchCreators();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATOR DETAIL MODAL
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose, onUpdate }: { creator: any; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-[#1D1D1D] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 p-6 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight">Creator Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-6">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.full_name} className="w-24 h-24 rounded-xl border-2 border-[#1D1D1D] object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{creator.full_name || creator.username}</h2>
              <p className="text-sm text-gray-500">{creator.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {creator.status}
                </span>
                {creator.verified && (
                  <span className="text-[8px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">{creator.followers?.toLocaleString() || "0"}</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Followers</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">{creator.avg_viewers?.toLocaleString() || "0"}</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Avg Viewers</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">{creator.rate ? `₦${creator.rate}` : "—"}</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Rate</p>
            </div>
          </div>

          {/* Platforms */}
          {creator.platforms && creator.platforms.length > 0 && (
            <div>
              <h4 className="font-black text-sm mb-3">Connected Platforms</h4>
              <div className="space-y-2">
                {creator.platforms.map((p: any, idx: number) => (
                  <div key={idx} className="border-2 border-[#1D1D1D] p-3 flex justify-between items-center">
                    <div>
                      <p className="font-black text-sm">{p.platform_type || p.platform}</p>
                      <p className="text-[8px] text-gray-500">@{p.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{p.followers_count?.toLocaleString() || p.followers?.toLocaleString()}</p>
                      <p className="text-[8px] opacity-60">followers</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {creator.bio && (
            <div>
              <h4 className="font-black text-sm mb-2">Bio</h4>
              <p className="text-sm text-gray-700">{creator.bio}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Location</p>
              <p>{creator.location || creator.city || "Not specified"}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Joined</p>
              <p>{new Date(creator.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Category</p>
              <p>{creator.niche || creator.category || "General"}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">User ID</p>
              <p className="text-[10px]">{creator.user_id || creator.id}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#1D1D1D]/10">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Send message functionality
                toast.info("Messaging feature coming soon");
              }}
              className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors"
            >
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB - FLEXIBLE SCHEMA
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
      let query = supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      // Handle filter
      if (filter !== "all") {
        if (filter === "pending") {
          query = query.or(`application_status.eq.pending,status.eq.pending_review`);
        } else if (filter === "approved") {
          query = query.or(`application_status.eq.approved,status.eq.active`);
        } else if (filter === "rejected") {
          query = query.or(`application_status.eq.rejected,status.eq.rejected`);
        }
      }

      // Don't show deleted businesses
      query = query.neq("status", "deleted");

      if (searchTerm) {
        query = query.or(`business_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        toast.error("Failed to load businesses");
      } else {
        setBusinesses(data || []);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [filter, searchTerm]);

  const updateBusinessStatus = async (id: string, newStatus: "approved" | "rejected") => {
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

  const deleteBusiness = async (id: string) => {
    if (!confirm("Are you sure you want to delete this business? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("businesses")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete business");
      return;
    }

    toast.success("Business deleted");
    fetchBusinesses();
    onStatsChange?.();
  };

  const viewBusinessDetails = (business: any) => {
    setSelectedBusiness(business);
    setShowDetailModal(true);
  };

  const getBusinessName = (biz: any) => {
    return biz.business_name || biz.company_name || "Unnamed Business";
  };

  const getContactName = (biz: any) => {
    return biz.contact_name || biz.owner_name || biz.representative || "Unknown";
  };

  const getContactEmail = (biz: any) => {
    return biz.contact_email || biz.email || biz.contact?.email || "No email";
  };

  const getStatusDisplay = (biz: any) => {
    return biz.application_status || biz.status || "pending";
  };

  const getVerificationStatus = (biz: any) => {
    return biz.verification_status || "pending";
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
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending", "approved", "rejected", "all"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab === "all" ? "All Businesses" : tab}
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
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((biz) => {
            const status = getStatusDisplay(biz);
            const verificationStatus = getVerificationStatus(biz);
            
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    {biz.logo_url ? (
                      <img 
                        src={biz.logo_url} 
                        alt={getBusinessName(biz)} 
                        className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80"
                        onClick={() => viewBusinessDetails(biz)}
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200"
                        onClick={() => viewBusinessDetails(biz)}
                      >
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-black text-lg uppercase tracking-tight mb-1">{getBusinessName(biz)}</h4>
                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {getContactName(biz)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {getContactEmail(biz)}
                        </span>
                        {biz.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {biz.contact_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {biz.industry || biz.sector || "—"}
                        </span>
                        {(biz.city || biz.location) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {biz.city || biz.location}
                          </span>
                        )}
                      </div>
                      {biz.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{biz.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                      status === "approved" || status === "active" ? "bg-green-100 text-green-700" :
                      status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {status}
                    </span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                      verificationStatus === "verified" ? "bg-blue-100 text-blue-700" :
                      verificationStatus === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {verificationStatus}
                    </span>
                    <span className="text-[8px] text-gray-400">
                      ID: {biz.id?.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => viewBusinessDetails(biz)}
                    className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View Details
                  </button>
                  
                  {filter === "pending" && (
                    <>
                      <button
                        onClick={() => updateBusinessStatus(biz.id, "approved")}
                        className="flex-1 bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => updateBusinessStatus(biz.id, "rejected")}
                        className="flex-1 border-2 border-[#1D1D1D] py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => deleteBusiness(biz.id)}
                    className="px-4 py-2 border-2 border-red-500 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBusiness && (
        <BusinessDetailModal
          business={selectedBusiness}
          onClose={() => setShowDetailModal(false)}
          onUpdate={() => {
            setShowDetailModal(false);
            fetchBusinesses();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS DETAIL MODAL
// ─────────────────────────────────────────────

function BusinessDetailModal({ business, onClose, onUpdate }: { business: any; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-2 border-[#1D1D1D] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 p-6 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight">Business Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-6">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.business_name} className="w-24 h-24 rounded-xl border-2 border-[#1D1D1D] object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{business.business_name || business.company_name}</h2>
              <p className="text-sm text-gray-500">{business.contact_email || business.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                  (business.application_status === "approved" || business.status === "active") ? "bg-green-100 text-green-700" :
                  (business.application_status === "rejected" || business.status === "rejected") ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {business.application_status || business.status}
                </span>
                <span className={`text-[8px] px-2 py-1 rounded-full ${
                  business.verification_status === "verified" ? "bg-blue-100 text-blue-700" :
                  business.verification_status === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {business.verification_status || "pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-[#1D1D1D] p-4">
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-2">Contact Person</p>
              <p className="font-black">{business.contact_name || business.owner_name || "—"}</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-4">
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-2">Phone</p>
              <p className="font-black">{business.contact_phone || business.phone || "—"}</p>
            </div>
          </div>

          {/* Business Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Industry</p>
              <p>{business.industry || business.sector || "—"}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Location</p>
              <p>{business.city || business.location || "—"}{business.country ? `, ${business.country}` : ""}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Website</p>
              {business.website ? (
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  {business.website}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest opacity-60 mb-1">Joined</p>
              <p>{new Date(business.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <div>
              <h4 className="font-black text-sm mb-2">About</h4>
              <p className="text-sm text-gray-700">{business.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">0</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Campaigns</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">₦0</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Spent</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-4 text-center">
              <p className="text-2xl font-black">0</p>
              <p className="text-[8px] uppercase tracking-widest opacity-60">Reviews</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#1D1D1D]/10">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Send message functionality
                toast.info("Messaging feature coming soon");
              }}
              className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors"
            >
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
      let query = supabase
        .from("campaigns")
        .select(`
          *,
          businesses (
            id,
            business_name,
            company_name,
            logo_url
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        toast.error("Failed to load campaigns");
      } else {
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter, searchTerm]);

  const updateCampaignStatus = async (id: string, newStatus: "active" | "rejected" | "completed", notes?: string) => {
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

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete campaign");
      return;
    }

    toast.success("Campaign deleted");
    fetchCampaigns();
  };

  const getCampaignName = (camp: any) => {
    return camp.name || camp.title || "Unnamed Campaign";
  };

  const getBusinessName = (biz: any) => {
    return biz?.business_name || biz?.company_name || "Unknown Business";
  };

  const getPrice = (camp: any) => {
    return camp.pay_rate ?? camp.bid_amount ?? camp.budget ?? 0;
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
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending_review", "active", "completed", "rejected", "all"] as const).map(tab => (
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
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((camp) => {
            const biz = camp.businesses;
            const price = getPrice(camp);
            
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-12 h-12 rounded-lg border-2 border-[#1D1D1D] object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base uppercase tracking-tight">{getCampaignName(camp)}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[9px] text-gray-500 mt-1">
                        <span>{getBusinessName(biz)}</span>
                        <span>•</span>
                        <span className="capitalize">{camp.type?.replace("_", " ") || "Standard"}</span>
                        <span>•</span>
                        <span>ID: {camp.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                    <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${
                      camp.status === "active" ? "bg-green-100 text-green-700" :
                      camp.status === "completed" ? "bg-blue-100 text-blue-700" :
                      camp.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {camp.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {camp.admin_notes && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1">Admin Notes:</p>
                    <p className="text-xs text-gray-700">{camp.admin_notes}</p>
                  </div>
                )}

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
                    <button
                      onClick={() => deleteCampaign(camp.id)}
                      className="px-4 py-3 border-2 border-red-500 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {filter === "active" && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "completed")}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="flex-1 border-2 border-red-500 text-red-500 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                    >
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
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        toast.error("Failed to load tickets");
      } else {
        setTickets(data || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
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

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["open", "in_progress", "resolved", "all"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab === "all" ? "All Tickets" : tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No tickets found</p>
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5 rounded-full">
                      {ticket.category || "General"}
                    </span>
                    <span className="text-[8px] text-gray-400">
                      Ticket #{ticket.id.slice(0, 8)}
                    </span>
                  </div>
                  {ticket.subject && (
                    <h4 className="font-black text-sm mb-2">{ticket.subject}</h4>
                  )}
                  <p className="text-sm text-[#1D1D1D] mb-2">{ticket.message}</p>
                  <p className="text-[8px] text-gray-400">
                    From: {ticket.user_email || ticket.user_id.slice(0, 8)} • {new Date(ticket.created_at).toLocaleString()}
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
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1">Admin Reply:</p>
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
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");

  const fetchReports = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from("reported_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        toast.error("Failed to load reports");
      } else {
        setReports(data || []);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
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

  const deleteReportedContent = async (contentType: string, contentId: string, reportId: string) => {
    if (!confirm(`Are you sure you want to delete this ${contentType}?`)) {
      return;
    }

    // Delete the reported content
    let error;
    if (contentType === "campaign") {
      ({ error } = await supabase.from("campaigns").delete().eq("id", contentId));
    } else if (contentType === "message") {
      ({ error } = await supabase.from("messages").delete().eq("id", contentId));
    } else if (contentType === "profile") {
      ({ error } = await supabase.from("creator_profiles").delete().eq("id", contentId));
    }

    if (error) {
      toast.error("Failed to delete content");
      return;
    }

    // Mark report as resolved
    await updateReportStatus(reportId, "resolved");
    toast.success("Content deleted and report resolved");
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Reported Content</h3>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {(["pending", "resolved", "dismissed", "all"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
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
          <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No reports found</p>
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
                <div className="flex-1">
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
                  {report.details && (
                    <pre className="text-[8px] bg-gray-50 p-2 rounded mb-2 overflow-x-auto">
                      {JSON.stringify(report.details, null, 2)}
                    </pre>
                  )}
                  <p className="text-[8px] text-gray-400">
                    Reported by: {report.reported_by} • {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  report.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  report.status === "resolved" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {report.status}
                </span>
              </div>

              {filter === "pending" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => deleteReportedContent(report.content_type, report.content_id, report.id)}
                    className="flex-1 bg-red-500 text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Content
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, "resolved")}
                    className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Keep & Resolve
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
      let query = supabase
        .from("business_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      // Date filtering
      const now = new Date();
      if (dateRange === "today") {
        const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte("created_at", start);
      } else if (dateRange === "week") {
        const start = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte("created_at", start);
      } else if (dateRange === "month") {
        const start = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        query = query.gte("created_at", start);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        toast.error("Failed to load transactions");
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter, dateRange]);

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getCompletedCount = () => {
    return transactions.filter(t => t.status === "completed").length;
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight">Transactions</h3>
        
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-[9px] font-black uppercase tracking-widest"
          >
            <option value="all">All Types</option>
            <option value="payment">Payments</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="refund">Refunds</option>
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-[9px] font-black uppercase tracking-widest"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          <button className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1D1D1D] text-white p-4">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Total Volume</p>
          <p className="text-2xl font-black">₦{getTotalAmount().toLocaleString()}</p>
        </div>
        <div className="border-2 border-[#1D1D1D] p-4">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Transactions</p>
          <p className="text-2xl font-black">{transactions.length}</p>
        </div>
        <div className="border-2 border-[#1D1D1D] p-4">
          <p className="text-[8px] opacity-60 uppercase tracking-widest mb-1">Completed</p>
          <p className="text-2xl font-black">{getCompletedCount()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No transactions found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#1D1D1D]">
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">ID</th>
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">Date</th>
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">Type</th>
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">Amount</th>
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">Status</th>
                <th className="text-left py-3 text-[8px] font-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8]">
                  <td className="py-3 text-[10px] font-mono">{tx.id.slice(0, 8)}</td>
                  <td className="py-3 text-[10px]">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    <span className={`text-[8px] px-2 py-1 rounded-full ${
                      tx.type === "payment" ? "bg-green-100 text-green-700" :
                      tx.type === "withdrawal" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 font-black">₦{tx.amount?.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`text-[8px] px-2 py-1 rounded-full ${
                      tx.status === "completed" ? "bg-green-100 text-green-700" :
                      tx.status === "failed" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <button className="text-[8px] underline hover:no-underline">View</button>
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
    // Save settings to database or localStorage
    setStats((prev: DashboardStats) => ({
      ...prev,
      platformFee: platformSettings.platformFee,
    }));
    
    toast.success("Settings saved successfully");
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Platform Settings</h3>

      <div className="space-y-6 max-w-2xl">
        {/* Fee Settings */}
        <div className="border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm mb-4">Fee Settings</h4>
          
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Campaign Settings */}
        <div className="border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm mb-4">Campaign Settings</h4>
          
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
        </div>

        {/* Approval Settings */}
        <div className="border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm mb-4">Approval Settings</h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.autoApproveCreators}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, autoApproveCreators: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">Auto-approve creators</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.requireBusinessVerification}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, requireBusinessVerification: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">Require business verification</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.requireEmailVerification}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">Require email verification</span>
            </label>
          </div>
        </div>

        {/* System Settings */}
        <div className="border-2 border-[#1D1D1D] p-6">
          <h4 className="font-black text-sm mb-4">System Settings</h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.allowGuestBrowsing}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, allowGuestBrowsing: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">Allow guest browsing</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={platformSettings.maintenanceMode}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Maintenance mode</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
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

export default AdminDashboard;
