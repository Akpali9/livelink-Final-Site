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
  CheckSquare,
  Square,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Reply,
  MoreVertical,
  CheckCheck,
  AtSign,
  Loader2,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";
import { ImageWithFallback } from "../components/ImageWithFallback";

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
  unreadMessages: number;
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
  user_id?: string;
  business_name?: string;
  name?: string;
  full_name?: string;
  job_title?: string;
  email?: string;
  phone_number?: string;
  industry?: string;
  city?: string;
  country?: string;
  postcode?: string;
  logo_url?: string;
  logo?: string;
  website?: string;
  description?: string;
  bio?: string;
  budget?: string;
  status: string;
  application_status?: string;
  verification_status?: string;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "creators" | "businesses" | "campaigns" | "support" | "reports" | "transactions" | "settings" | "messages"
  >("overview");
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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
    unreadMessages: 0,
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
      // ── CREATORS ───────────────────────────────
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

      // ── BUSINESSES ─────────────────────────────
      let totalBusinesses = 0, pendingBusinesses = 0, approvedBusinesses = 0, rejectedBusinesses = 0;
      try {
        const { count: total } = await supabase.from("businesses").select("*", { count: "exact", head: true }).neq("status", "deleted");
        totalBusinesses = total || 0;
        const { count: pending } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.pending,status.eq.pending_review`);
        pendingBusinesses = pending || 0;
        const { count: approved } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.approved,status.eq.active`);
        approvedBusinesses = approved || 0;
        const { count: rejected } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.rejected,status.eq.rejected`);
        rejectedBusinesses = rejected || 0;
      } catch (e) { console.error("Business stats error:", e); }

      // ── CAMPAIGNS ──────────────────────────────
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

      // ── REVENUE ──
      let totalRevenue = 0;
      try {
        const { data: txRows, error: txError } = await supabase
          .from("business_transactions")
          .select("amount")
          .eq("status", "completed")
          .eq("type", "payment");
        if (!txError) totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);
      } catch (e) { console.error("Revenue fetch error:", e); }

      // ── PAYOUTS ───────
      let pendingPayouts = 0;
      try {
        const { data: ccRows, error: ccError } = await supabase
          .from("campaign_creators")
          .select("total_earnings, paid_out")
          .eq("status", "active");
        if (!ccError) {
          const totalEarnings = (ccRows || []).reduce((s, r) => s + (r.total_earnings || 0), 0);
          const totalPaid = (ccRows || []).reduce((s, r) => s + (r.paid_out || 0), 0);
          pendingPayouts = totalEarnings - totalPaid;
        }
      } catch (e) { console.error("Payout fetch error:", e); }

      // ── TOTAL USERS ──────────
      let totalUsers = 0;
      try {
        const { count: creatorCount } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
        totalUsers = (creatorCount || 0) + (bizCount || 0);
      } catch (e) { console.error("User count error:", e); }

      // ── REPORTED CONTENT ────────────────────────
      let reportedContent = 0;
      try {
        const { count, error: rcError } = await supabase
          .from("reported_content")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (!rcError) reportedContent = count || 0;
      } catch (e) { /* table may not exist */ }

      // ── SUPPORT TICKETS ─────────────────────────
      let openSupportTickets = 0;
      try {
        const { count, error: stError } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]);
        if (!stError) openSupportTickets = count || 0;
      } catch (e) { /* table may not exist */ }

      // ── UNREAD MESSAGES ─────────────────────────
      let unreadMessages = 0;
      if (adminUser) {
        try {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false)
            .neq("sender_id", adminUser.id);
          unreadMessages = count || 0;
        } catch (e) { console.error("Error fetching unread messages:", e); }
      }

      setStats({
        totalCreators, pendingCreators, activeCreators, suspendedCreators,
        totalBusinesses, pendingBusinesses, approvedBusinesses, rejectedBusinesses,
        totalCampaigns, activeCampaigns, completedCampaigns, pendingCampaigns,
        totalRevenue, pendingPayouts, totalUsers, reportedContent, openSupportTickets,
        platformFee: 10,
        unreadMessages,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ─── REFRESH ───────────────────────────────────────────────────────────

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

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", tab: "overview", badge: 0 },
    { icon: Users, label: "Creators", tab: "creators", badge: stats.pendingCreators },
    { icon: Building2, label: "Businesses", tab: "businesses", badge: stats.pendingBusinesses },
    { icon: Megaphone, label: "Campaigns", tab: "campaigns", badge: stats.pendingCampaigns },
    { icon: MessageSquare, label: "Messages", tab: "messages", badge: 0 },
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
    <div className="min-h-screen bg-[#F0F0F0]">
      <Toaster position="top-center" richColors />

      {/* Mobile Header - Always visible */}
      <div className="bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <span className="font-black uppercase tracking-tight text-lg block">Admin</span>
            <span className="text-[8px] opacity-40 uppercase tracking-widest">LiveLink Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-9 h-9 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm rounded-lg">
            {adminUser?.email?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[280px] bg-white border-r border-[#1D1D1D]/10 z-50
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User chip */}
        <div className="px-4 py-4 border-b border-[#1D1D1D]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-base rounded-lg shrink-0">
              {adminUser?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="font-black uppercase tracking-tight text-sm truncate">Admin User</p>
              <p className="text-[8px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  text-xs font-black uppercase tracking-widest transition-all rounded-lg
                  ${activeTab === item.tab
                    ? "bg-[#1D1D1D] text-white"
                    : "hover:bg-[#F4F4F4] text-[#1D1D1D]/60 hover:text-[#1D1D1D]"}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-2 py-0.5 text-[9px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#1D1D1D]/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all rounded-lg"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 min-h-screen">
        {/* Tab Header */}
        <div className="mb-4">
          <h2 className="font-black uppercase tracking-tight text-xl">
            {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
          </h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-0.5">
            {activeTab === "overview" && "Dashboard overview and statistics"}
            {activeTab === "creators" && "Manage creator applications and profiles"}
            {activeTab === "businesses" && "Review and manage business accounts"}
            {activeTab === "campaigns" && "Oversee all platform campaigns"}
            {activeTab === "messages" && "Communicate with creators and businesses"}
            {activeTab === "support" && "Handle support tickets and inquiries"}
            {activeTab === "reports" && "Review reported content"}
            {activeTab === "transactions" && "Monitor financial transactions"}
            {activeTab === "settings" && "Configure platform settings"}
          </p>
        </div>

        {/* Page content */}
        <div className="w-full">
          {activeTab === "overview" && (
            <AdminOverview 
              stats={stats} 
              onTabChange={setActiveTab}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "creators" && (
            <AdminCreators 
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "businesses" && (
            <AdminBusinesses 
              onStatsChange={fetchDashboardData}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "campaigns" && (
            <AdminCampaigns 
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "messages" && (
            <div className="bg-white border-2 border-[#1D1D1D] p-8 rounded-xl text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-black uppercase tracking-tight mb-2">Messages Coming Soon</h3>
              <p className="text-gray-500 text-sm">The messaging feature is under development.</p>
            </div>
          )}
          {activeTab === "support" && <AdminSupport />}
          {activeTab === "reports" && <AdminReports />}
          {activeTab === "transactions" && <AdminTransactions />}
          {activeTab === "settings" && <AdminSettings stats={stats} setStats={setStats} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN OVERVIEW COMPONENT
// ─────────────────────────────────────────────

function AdminOverview({ stats, onTabChange, actionLoading }: { 
  stats: DashboardStats; 
  onTabChange: (tab: any) => void;
  actionLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1D1D1D] text-white p-5 flex flex-col gap-4 rounded-xl"
      >
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic mb-1">
            Admin Dashboard
          </h2>
          <p className="text-white/50 text-xs">Manage creators, businesses, and platform settings</p>
        </div>
        
        {/* Quick action badges */}
        <div className="flex flex-wrap gap-2">
          {stats.pendingCreators > 0 && (
            <button
              onClick={() => onTabChange("creators")}
              className="px-3 py-1.5 bg-[#389C9A] text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2d7f7d] transition-colors"
            >
              {stats.pendingCreators} pending creators
            </button>
          )}
          {stats.pendingBusinesses > 0 && (
            <button
              onClick={() => onTabChange("businesses")}
              className="px-3 py-1.5 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-[#ffd14d] transition-colors"
            >
              {stats.pendingBusinesses} pending businesses
            </button>
          )}
          {stats.pendingCampaigns > 0 && (
            <button
              onClick={() => onTabChange("campaigns")}
              className="px-3 py-1.5 bg-violet-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-violet-600 transition-colors"
            >
              {stats.pendingCampaigns} pending campaigns
            </button>
          )}
          {stats.unreadMessages > 0 && (
            <button
              onClick={() => onTabChange("messages")}
              className="px-3 py-1.5 bg-[#389C9A] text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2d7f7d] transition-colors"
            >
              {stats.unreadMessages} unread messages
            </button>
          )}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500", bg: "bg-blue-50", sub: `${stats.pendingCreators} pending` },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-500", bg: "bg-emerald-50", sub: `${stats.approvedBusinesses} approved` },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-violet-500", bg: "bg-violet-50", sub: `${stats.pendingCampaigns} pending` },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500", bg: "bg-orange-50", sub: "registered" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black tracking-tight mb-0.5">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
            <p className="text-[8px] text-gray-400">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#389C9A]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#389C9A]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Total Revenue</h3>
              <p className="text-[8px] opacity-40">Completed payments</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FEDB71]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Pending Payouts</h3>
              <p className="text-[8px] opacity-40">Not yet paid out</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#389C9A]/10 rounded-xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-[#389C9A]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Platform Fee</h3>
              <p className="text-[8px] opacity-40">Standard rate</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">{stats.platformFee}%</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Action Required</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Creators", value: stats.pendingCreators, action: () => onTabChange("creators"), accent: "border-[#FEDB71]", icon: Users, bg: "bg-[#FEDB71]/10" },
            { label: "Pending Businesses", value: stats.pendingBusinesses, action: () => onTabChange("businesses"), accent: "border-[#389C9A]", icon: Building2, bg: "bg-[#389C9A]/10" },
            { label: "Pending Campaigns", value: stats.pendingCampaigns, action: () => onTabChange("campaigns"), accent: "border-violet-400", icon: Megaphone, bg: "bg-violet-50" },
            { label: "Unread Messages", value: stats.unreadMessages, action: () => onTabChange("messages"), accent: "border-[#389C9A]", icon: MessageSquare, bg: "bg-[#389C9A]/10" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`bg-white border-2 ${item.accent} p-4 text-left hover:shadow-md transition-all rounded-xl`}
            >
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-black italic mb-1">{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-tight">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Review Creators", icon: Users, action: () => onTabChange("creators"), color: "bg-blue-500" },
            { label: "Review Businesses", icon: Building2, action: () => onTabChange("businesses"), color: "bg-emerald-500" },
            { label: "Check Messages", icon: MessageSquare, action: () => onTabChange("messages"), color: "bg-[#389C9A]" },
            { label: "View Transactions", icon: CreditCard, action: () => onTabChange("transactions"), color: "bg-violet-500" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 text-left hover:shadow-md transition-all rounded-xl flex items-center gap-3"
            >
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN CREATORS COMPONENT
// ─────────────────────────────────────────────

function AdminCreators({ 
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  actionLoading
}: { 
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  actionLoading: boolean;
}) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredCreators = creators.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      {/* Header with search and bulk actions */}
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Creator Applications</h3>
        
        {/* Bulk action bar when items are selected */}
        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">
              {selectedItems.length} creator{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => toast.info("Bulk approve coming soon")}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={() => toast.info("Bulk reject coming soon")}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </button>
              <button
                onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {/* Filter indicator */}
        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">
              Filter: {filter === "all" ? "All Creators" : filter.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-400">({filteredCreators.length})</span>
            {filter === "pending_review" && (
              <button
                onClick={() => {
                  if (filteredCreators.length > 0) {
                    onToggleSelectAll(filteredCreators);
                  }
                }}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline"
              >
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((creator) => (
            <motion.div
              key={creator.id || creator.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-4 transition-all rounded-xl ${
                selectedItems.includes(creator.id) 
                  ? 'border-[#389C9A] bg-[#389C9A]/5' 
                  : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
              }`}
            >
              {/* Selection checkbox */}
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => onToggleSelect(creator.id)}
                  className="mt-1"
                >
                  {selectedItems.includes(creator.id) ? (
                    <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <div className="flex items-center gap-3 flex-1">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={getCreatorName(creator)}
                      onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0 rounded-xl"
                    />
                  ) : (
                    <div
                      onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl"
                    >
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="font-black text-base uppercase tracking-tight truncate">{getCreatorName(creator)}</h4>
                      {creator.verified && <Shield className="w-4 h-4 text-[#389C9A] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{getCreatorEmail(creator)}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {creator.status?.replace("_", " ") || "pending"}
                </span>
              </div>

              {/* Creator details */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] ml-8">
                <div className="flex items-center gap-1 text-gray-600">
                  <Video className="w-3 h-3 shrink-0" />
                  <span className="truncate">{getCreatorCategory(creator)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>{getCreatorFollowers(creator).toLocaleString()} followers</span>
                </div>
                {getCreatorLocation(creator) && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{getCreatorLocation(creator)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>Joined {getCreatorJoinDate(creator)}</span>
                </div>
              </div>

              {/* Platforms */}
              {creator.platforms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 ml-8">
                  {creator.platforms.slice(0, 2).map((p: any, idx: number) => (
                    <span key={idx} className="text-[8px] bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-2 h-2" />
                      {p.platform_type || p.platform}: {(p.followers_count || p.followers)?.toLocaleString()}
                    </span>
                  ))}
                  {creator.platforms.length > 2 && (
                    <span className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                      +{creator.platforms.length - 2} more
                    </span>
                  )}
                </div>
              )}

              {/* Bio preview */}
              {creator.bio && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 ml-8">{creator.bio}</p>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                <button
                  onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                  className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
                
                {creator.status === "pending_review" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "active")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "suspended")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                
                {creator.status === "active" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "suspended")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg col-span-2"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => deleteCreator(creator.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
                
                {creator.status === "suspended" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "active")}
                      className="border-2 border-green-500 text-green-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-colors rounded-lg col-span-2"
                    >
                      Reinstate
                    </button>
                    <button
                      onClick={() => deleteCreator(creator.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showDetailModal && selectedCreator && (
        <CreatorDetailModal creator={selectedCreator} onClose={() => setShowDetailModal(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB (with missing showFilters added)
// ─────────────────────────────────────────────

function AdminBusinesses({ onStatsChange, selectedItems, onToggleSelect, onToggleSelectAll, actionLoading }: any) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);   // <-- FIX ADDED

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
      ? { application_status: "approved", status: "active", verification_status: "verified", approved_at: new Date().toISOString() }
      : { application_status: "rejected", status: "rejected", verification_status: "rejected", rejected_at: new Date().toISOString() };
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

  const filteredBusinesses = businesses.filter(b => {
    const status = getStatusDisplay(b);
    if (filter === "pending") return status === "pending" || status === "pending_review";
    if (filter === "approved") return status === "approved" || status === "active";
    if (filter === "rejected") return status === "rejected";
    return true;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Business Applications</h3>
        
        {/* Bulk action bar (simplified) */}
        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={() => onToggleSelectAll([])} className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors">Clear</button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" /></div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((biz) => {
            const status = getStatusDisplay(biz);
            const verificationStatus = biz.verification_status || "pending";
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(biz.id) ? 'border-[#389C9A] bg-[#389C9A]/5' : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => onToggleSelect(biz.id)} className="mt-1">
                    {selectedItems.includes(biz.id) ? <CheckSquare className="w-5 h-5 text-[#389C9A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-3 flex-1">
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0 rounded-xl" />
                    ) : (
                      <div onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight truncate mb-1">{getBusinessName(biz)}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <User className="w-3 h-3 shrink-0" /><span className="truncate">{getContactName(biz)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{getContactEmail(biz)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 ml-8">
                  {biz.phone_number && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-600"><Phone className="w-3 h-3 shrink-0" /><span className="truncate">{biz.phone_number}</span></div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-gray-600"><Briefcase className="w-3 h-3 shrink-0" /><span className="truncate">{biz.industry || "—"}</span></div>
                  {(biz.city || biz.location) && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-600"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{biz.city || biz.location}</span></div>
                  )}
                </div>

                <div className="flex gap-2 mb-3 ml-8">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                    status === "approved" || status === "active" ? "bg-green-100 text-green-700" :
                    status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{status}</span>
                  <span className={`text-[9px] px-2 py-1 rounded-full ${
                    verificationStatus === "verified" ? "bg-blue-100 text-blue-700" :
                    verificationStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                  }`}>{verificationStatus}</span>
                </div>

                {biz.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2 ml-8">{biz.description}</p>}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                  <button onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                    className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  
                  {filter === "pending" && (
                    <>
                      <button onClick={() => updateBusinessStatus(biz.id, "approved")}
                        className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => updateBusinessStatus(biz.id, "rejected")}
                        className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  
                  {filter !== "pending" && (
                    <button onClick={() => deleteBusiness(biz.id)}
                      className="col-span-2 border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGNS TAB (with missing showFilters added)
// ─────────────────────────────────────────────

function AdminCampaigns({ selectedItems, onToggleSelect, onToggleSelectAll, actionLoading }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "completed" | "rejected" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);   // <-- FIX ADDED

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
    const updates: any = { 
      status: newStatus, 
      admin_notes: notes || null,
      ...(newStatus === 'active' ? { approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}),
      ...(newStatus === 'rejected' ? { rejected_at: new Date().toISOString() } : {}),
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
    };
    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
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

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Campaigns</h3>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" /></div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((camp) => {
            const biz = camp.businesses;
            const price = getPrice(camp);
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(camp.id) ? 'border-[#389C9A] bg-[#389C9A]/5' : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => onToggleSelect(camp.id)} className="mt-1">
                    {selectedItems.includes(camp.id) ? <CheckSquare className="w-5 h-5 text-[#389C9A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-3 flex-1">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-12 h-12 border-2 border-[#1D1D1D] object-cover shrink-0 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center shrink-0 rounded-xl">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight truncate">{getCampaignName(camp)}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{getBusinessName(biz)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 ml-8">
                  <span className="text-[9px] capitalize bg-gray-100 px-3 py-1 rounded-full">
                    {camp.type?.replace("_", " ") || "Standard"}
                  </span>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                    camp.status === "active" ? "bg-green-100 text-green-700" :
                    camp.status === "completed" ? "bg-blue-100 text-blue-700" :
                    camp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {camp.status?.replace("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-3 ml-8">
                  <p className="font-black text-lg text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                  <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                </div>

                {filter === "pending_review" && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                    <button onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button onClick={() => deleteCampaign(camp.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg">
                      <Trash2 className="w-3 h-3" />
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
// OTHER TABS (simplified placeholders)
// ─────────────────────────────────────────────

function AdminSupport() {
  return <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl">Support tickets coming soon</div>;
}
function AdminReports() {
  return <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl">Reports coming soon</div>;
}
function AdminTransactions() {
  return <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl">Transactions coming soon</div>;
}
function AdminSettings({ stats, setStats }: any) {
  const [fee, setFee] = useState(stats.platformFee);
  const save = () => {
    setStats((prev: any) => ({ ...prev, platformFee: fee }));
    toast.success("Settings saved");
  };
  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl">
      <h3 className="font-black mb-4">Platform Settings</h3>
      <div className="mb-4">
        <label className="block text-[10px] font-black uppercase mb-2">Platform Fee (%)</label>
        <input type="number" value={fee} onChange={(e) => setFee(parseInt(e.target.value))} className="w-32 px-3 py-2 border-2 border-[#1D1D1D]/10" />
      </div>
      <button onClick={save} className="bg-[#1D1D1D] text-white px-6 py-3 text-[10px] font-black uppercase">Save</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// DETAIL MODALS (simplified)
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-xl">Creator Details</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <pre className="text-sm">{JSON.stringify(creator, null, 2)}</pre>
      </div>
    </div>
  );
}

function BusinessDetailModal({ business, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-xl">Business Details</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <pre className="text-sm">{JSON.stringify(business, null, 2)}</pre>
      </div>
    </div>
  );
}

export { AdminDashboard as AdminDashboardScreen };
export default AdminDashboard;
