import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Users, Building2, Megaphone, DollarSign, Clock, Eye,
  Plus, Search, Filter, Download, LogOut, Bell, Menu, X,
  BarChart3, TrendingUp, Shield, Settings, Activity,
  CheckCircle, XCircle, User, RefreshCw, Video, Star,
  Calendar, Mail, Phone, Globe, MapPin, Award, Briefcase,
  ThumbsUp, AlertTriangle, CreditCard, PieChart, Zap,
  Heart, Share2, MessageCircle, Flag, Trash2, Edit,
  EyeOff, Check, AlertCircle, CheckSquare, Square,
  MessageSquare, Send, Paperclip, Image as ImageIcon,
  FileText, Download as DownloadIcon, Reply, MoreVertical,
  CheckCheck, ChevronRight, AtSign, Loader2, UserX, UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";

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

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business";
  last_message: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  attachments?: { url: string; type: string; name: string; size?: number }[];
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  business_name?: string;
  avatar_url?: string;
  logo_url?: string;
  email: string;
  type: "creator" | "business";
  status: string;
  created_at: string;
}

type AdminTab =
  | "overview" | "creators" | "businesses" | "campaigns"
  | "messages" | "support" | "reports" | "transactions" | "settings";

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState<AdminTab>("overview");
  const [adminUser, setAdminUser]         = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [creators, setCreators]     = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [campaigns, setCampaigns]   = useState<any[]>([]);

  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0, pendingCreators: 0, activeCreators: 0, suspendedCreators: 0,
    totalBusinesses: 0, pendingBusinesses: 0, approvedBusinesses: 0, rejectedBusinesses: 0,
    totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, pendingCampaigns: 0,
    totalRevenue: 0, pendingPayouts: 0, totalUsers: 0,
    reportedContent: 0, openSupportTickets: 0, platformFee: 10,
  });

  // ─── FETCH FUNCTIONS ─────────────────────────────────────────────────

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCreators(data || []);
    } catch (e) { console.error("fetchCreators:", e); }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses").select("*").neq("status", "deleted").order("created_at", { ascending: false });
      if (error) throw error;
      setBusinesses(data || []);
    } catch (e) { console.error("fetchBusinesses:", e); }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns").select(`*, businesses (id, business_name, logo_url)`).order("created_at", { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (e) { console.error("fetchCampaigns:", e); }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const safeCount = async (table: string, filter?: Record<string, string>) => {
        let q = supabase.from(table).select("*", { count: "exact", head: true });
        if (filter) Object.entries(filter).forEach(([k, v]) => { q = (q as any).eq(k, v); });
        const { count } = await q;
        return count || 0;
      };

      const [
        totalCreators, pendingCreators, activeCreators, suspendedCreators,
        totalBusinesses, approvedBusinesses, rejectedBusinesses,
        totalCampaigns, activeCampaigns, completedCampaigns, pendingCampaigns,
      ] = await Promise.all([
        safeCount("creator_profiles"),
        safeCount("creator_profiles", { status: "pending_review" }),
        safeCount("creator_profiles", { status: "active" }),
        safeCount("creator_profiles", { status: "suspended" }),
        safeCount("businesses"),
        safeCount("businesses", { status: "approved" }),
        safeCount("businesses", { status: "rejected" }),
        safeCount("campaigns"),
        safeCount("campaigns", { status: "active" }),
        safeCount("campaigns", { status: "completed" }),
        safeCount("campaigns", { status: "pending_review" }),
      ]);

      const { count: pendingBusinesses } = await supabase
        .from("businesses").select("*", { count: "exact", head: true })
        .or("application_status.eq.pending,status.eq.pending_verification,status.eq.pending");

      let totalRevenue = 0;
      try {
        const { data: txRows } = await supabase
          .from("business_transactions").select("amount").eq("status", "completed").eq("type", "payment");
        totalRevenue = (txRows || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      } catch (_) {}

      let pendingPayouts = 0;
      try {
        const { data: ccRows } = await supabase
          .from("campaign_creators").select("total_earnings, paid_out").eq("status", "active");
        const earned = (ccRows || []).reduce((s: number, r: any) => s + (r.total_earnings || 0), 0);
        const paid   = (ccRows || []).reduce((s: number, r: any) => s + (r.paid_out || 0), 0);
        pendingPayouts = earned - paid;
      } catch (_) {}

      let openSupportTickets = 0;
      try {
        const { count } = await supabase
          .from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
        openSupportTickets = count || 0;
      } catch (_) {}

      setStats({
        totalCreators, pendingCreators, activeCreators, suspendedCreators,
        totalBusinesses, pendingBusinesses: pendingBusinesses || 0, approvedBusinesses, rejectedBusinesses,
        totalCampaigns, activeCampaigns, completedCampaigns, pendingCampaigns,
        totalRevenue, pendingPayouts,
        totalUsers: totalCreators + totalBusinesses,
        reportedContent: 0, openSupportTickets, platformFee: 10,
      });
    } catch (e) {
      console.error("fetchDashboardData:", e);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ─── AUTH CHECK ──────────────────────────────────────────────────────

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { navigate("/login/portal"); return; }

        const u = session.user;
        setAdminUser(u);

        const isAdmin =
          u.user_metadata?.role === "admin" ||
          u.user_metadata?.user_type === "admin" ||
          u.user_metadata?.is_admin === true ||
          u.email === "admin@livelink.com";

        if (!isAdmin) {
          toast.error("Unauthorized access");
          await supabase.auth.signOut();
          navigate("/login/portal");
          return;
        }

        await Promise.all([fetchDashboardData(), fetchCreators(), fetchBusinesses(), fetchCampaigns()]);
      } catch (e) {
        console.error("checkAdmin:", e);
        navigate("/login/portal");
      }
    };
    checkAdmin();
  }, []);

  // ─── REALTIME ────────────────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_profiles" }, () => {
        fetchCreators(); fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "businesses" }, () => {
        fetchBusinesses(); fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        fetchCampaigns(); fetchDashboardData();
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  // ─── HELPERS ─────────────────────────────────────────────────────────

  const getUserMetadata = async (userId: string) => {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user.user_metadata || {};
    } catch { return {}; }
  };

  const logAdminAction = async (actionType: string, resourceType: string, details: any) => {
    try {
      await supabase.from("admin_actions").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: actionType,
        resource_type: resourceType,
        details,
        created_at: new Date().toISOString(),
      });
    } catch (e) { console.warn("Admin log skipped:", e); }
  };

  const sendNotification = async (userId: string, type: string, title: string, message: string, data?: any) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId, type, title, message,
        data: data || {},
        created_at: new Date().toISOString(),
      });
    } catch (e) { console.error("sendNotification:", e); }
  };

  // ─── BULK APPROVE CREATORS ───────────────────────────────────────────

  const approveAllCreators = async () => {
    const ok = await confirmToast(`Approve all ${stats.pendingCreators} pending creators?`);
    if (!ok) return;
    setActionLoading(true);
    try {
      const { data: pending, error } = await supabase
        .from("creator_profiles").select("id, user_id, full_name").eq("status", "pending_review");
      if (error) throw error;
      if (!pending?.length) { toast.info("No pending creators"); return; }

      await supabase.from("creator_profiles")
        .update({ status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("status", "pending_review");

      for (const c of pending) {
        if (c.user_id) {
          const meta = await getUserMetadata(c.user_id);
          await supabase.auth.admin.updateUserById(c.user_id, {
            user_metadata: { ...meta, creator_approved: true, approved_at: new Date().toISOString() },
          }).catch(console.error);
          await sendNotification(c.user_id, "creator_approved", "Creator Account Approved! ✅",
            `Your creator profile has been approved and is now live on the platform.`, { creator_id: c.id });
        }
      }

      await logAdminAction("BULK_APPROVE", "creators", { count: pending.length });
      toast.success(`✅ Approved ${pending.length} creators`);
      await Promise.all([fetchDashboardData(), fetchCreators()]);
      setActiveTab("creators");
      setSelectedItems([]);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionLoading(false); }
  };

  // ─── BULK APPROVE BUSINESSES ─────────────────────────────────────────

  const approveAllBusinesses = async () => {
    const ok = await confirmToast(`Approve all ${stats.pendingBusinesses} pending businesses?`);
    if (!ok) return;
    setActionLoading(true);
    try {
      const { data: pending, error } = await supabase
        .from("businesses").select("id, user_id, business_name")
        .or("application_status.eq.pending,status.eq.pending_verification,status.eq.pending");
      if (error) throw error;
      if (!pending?.length) { toast.info("No pending businesses"); return; }

      await supabase.from("businesses")
        .update({
          application_status: "approved", status: "approved",
          verification_status: "verified",
          approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })
        .or("application_status.eq.pending,status.eq.pending_verification,status.eq.pending");

      for (const b of pending) {
        if (b.user_id) {
          const meta = await getUserMetadata(b.user_id);
          await supabase.auth.admin.updateUserById(b.user_id, {
            user_metadata: { ...meta, business_approved: true, approved_at: new Date().toISOString() },
          }).catch(console.error);
          await sendNotification(b.user_id, "business_approved", "Business Account Approved! ✅",
            `Your business "${b.business_name}" has been approved.`, { business_id: b.id });
        }
      }

      await logAdminAction("BULK_APPROVE", "businesses", { count: pending.length });
      toast.success(`✅ Approved ${pending.length} businesses`);
      await Promise.all([fetchDashboardData(), fetchBusinesses()]);
      setActiveTab("businesses");
      setSelectedItems([]);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionLoading(false); }
  };

  // ─── BULK APPROVE CAMPAIGNS ──────────────────────────────────────────

  const approveAllCampaigns = async () => {
    const ok = await confirmToast(`Approve all ${stats.pendingCampaigns} pending campaigns?`);
    if (!ok) return;
    setActionLoading(true);
    try {
      const { data: pending, error } = await supabase
        .from("campaigns").select("id, business_id, name").eq("status", "pending_review");
      if (error) throw error;
      if (!pending?.length) { toast.info("No pending campaigns"); return; }

      await supabase.from("campaigns")
        .update({
          status: "active",
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        })
        .eq("status", "pending_review");

      for (const camp of pending) {
        if (camp.business_id) {
          const { data: biz } = await supabase
            .from("businesses").select("user_id").eq("id", camp.business_id).maybeSingle();
          if (biz?.user_id) {
            await sendNotification(biz.user_id, "campaign_approved", "Campaign Approved! ✅",
              `Your campaign "${camp.name}" is now live!`, { campaign_id: camp.id });
          }
        }
      }

      await logAdminAction("BULK_APPROVE", "campaigns", { count: pending.length });
      toast.success(`✅ Approved ${pending.length} campaigns`);
      await Promise.all([fetchDashboardData(), fetchCampaigns()]);
      setActiveTab("campaigns");
      setSelectedItems([]);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionLoading(false); }
  };

  // ─── APPROVE / REJECT SELECTED ───────────────────────────────────────

  const approveSelected = async (type: "creator" | "business" | "campaign") => {
    if (!selectedItems.length) { toast.error("No items selected"); return; }
    const ok = await confirmToast(`Approve ${selectedItems.length} ${type}(s)?`);
    if (!ok) return;
    setActionLoading(true);
    try {
      const table = type === "creator" ? "creator_profiles" : type === "business" ? "businesses" : "campaigns";
      const updates: any =
        type === "creator"
          ? { status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : type === "business"
          ? { application_status: "approved", status: "approved", verification_status: "verified", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : { status: "active", approved_at: new Date().toISOString(), published_at: new Date().toISOString() };

      const { error } = await supabase.from(table).update(updates).in("id", selectedItems);
      if (error) throw error;

      if (type === "campaign") {
        const { data: items } = await supabase.from("campaigns").select("id, business_id, name").in("id", selectedItems);
        for (const item of items || []) {
          const { data: biz } = await supabase.from("businesses").select("user_id").eq("id", item.business_id).maybeSingle();
          if (biz?.user_id) await sendNotification(biz.user_id, "campaign_approved", "Campaign Approved! ✅", `"${item.name}" is now live!`, { campaign_id: item.id });
        }
      } else {
        const { data: items } = await supabase.from(table).select("id, user_id, full_name, business_name").in("id", selectedItems);
        for (const item of (items || [])) {
          if (item.user_id) await sendNotification(item.user_id, `${type}_approved`, `${type.charAt(0).toUpperCase() + type.slice(1)} Approved! ✅`,
            `Your ${type} has been approved.`, { [`${type}_id`]: item.id });
        }
      }

      await logAdminAction("SELECT_APPROVE", `${type}s`, { count: selectedItems.length, ids: selectedItems });
      toast.success(`✅ Approved ${selectedItems.length} ${type}(s)`);
      setSelectedItems([]);
      await Promise.all([fetchDashboardData(), type === "creator" ? fetchCreators() : type === "business" ? fetchBusinesses() : fetchCampaigns()]);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionLoading(false); }
  };

  const rejectSelected = async (type: "creator" | "business" | "campaign") => {
    if (!selectedItems.length) { toast.error("No items selected"); return; }
    const ok = await confirmToast(`Reject ${selectedItems.length} ${type}(s)?`);
    if (!ok) return;
    setActionLoading(true);
    try {
      const table = type === "creator" ? "creator_profiles" : type === "business" ? "businesses" : "campaigns";
      const updates: any =
        type === "creator" ? { status: "rejected", rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : type === "business" ? { application_status: "rejected", status: "rejected", verification_status: "rejected", rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { status: "rejected", rejected_at: new Date().toISOString() };

      const { error } = await supabase.from(table).update(updates).in("id", selectedItems);
      if (error) throw error;

      await logAdminAction("SELECT_REJECT", `${type}s`, { count: selectedItems.length, ids: selectedItems });
      toast.success(`Rejected ${selectedItems.length} ${type}(s)`);
      setSelectedItems([]);
      await fetchDashboardData();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionLoading(false); }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchCreators(), fetchBusinesses(), fetchCampaigns()]);
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login/portal");
  };

  const toggleSelectAll = (items: any[]) => {
    setSelectedItems(selectedItems.length === items.length ? [] : items.map(i => i.id));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const navItems = [
    { icon: BarChart3,     label: "Overview",      tab: "overview",      badge: 0 },
    { icon: Users,         label: "Creators",       tab: "creators",      badge: stats.pendingCreators },
    { icon: Building2,     label: "Businesses",     tab: "businesses",    badge: stats.pendingBusinesses },
    { icon: Megaphone,     label: "Campaigns",      tab: "campaigns",     badge: stats.pendingCampaigns },
    { icon: MessageSquare, label: "Messages",       tab: "messages",      badge: 0 },
    { icon: MessageCircle, label: "Support",        tab: "support",       badge: stats.openSupportTickets },
    { icon: Flag,          label: "Reports",        tab: "reports",       badge: stats.reportedContent },
    { icon: CreditCard,    label: "Transactions",   tab: "transactions",  badge: 0 },
    { icon: Settings,      label: "Settings",       tab: "settings",      badge: 0 },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
          <p className="text-sm font-black uppercase tracking-widest opacity-40">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <Toaster position="top-center" richColors closeButton />

      {/* Mobile Header */}
      <div className="bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30 lg:hidden">
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

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#1D1D1D]/10 z-50
        flex flex-col transform transition-transform duration-200
        lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="px-5 py-4 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[#F8F8F8] rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

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

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); setSelectedItems([]); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg ${
                activeTab === item.tab
                  ? "bg-[#1D1D1D] text-white"
                  : "hover:bg-[#F4F4F4] text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
              }`}
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
        </nav>

        <div className="p-3 border-t border-[#1D1D1D]/10 space-y-1">
          <button onClick={refresh} disabled={refreshing}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-[#F4F4F4] transition-all rounded-lg disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all rounded-lg">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 p-4 min-h-screen">
        <div className="mb-4">
          <h2 className="font-black uppercase tracking-tight text-xl">
            {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
          </h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-0.5">
            {activeTab === "overview"      && "Dashboard overview and statistics"}
            {activeTab === "creators"      && "View and manage all creator accounts"}
            {activeTab === "businesses"    && "View and manage all business accounts"}
            {activeTab === "campaigns"     && "Oversee all platform campaigns"}
            {activeTab === "messages"      && "Message creators and businesses"}
            {activeTab === "support"       && "Handle support tickets and inquiries"}
            {activeTab === "reports"       && "Review reported content"}
            {activeTab === "transactions"  && "Monitor financial transactions"}
            {activeTab === "settings"      && "Configure platform settings"}
          </p>
        </div>

        {activeTab === "overview" && (
          <AdminOverview
            stats={stats}
            onTabChange={setActiveTab}
            onApproveAllBusinesses={approveAllBusinesses}
            onApproveAllCreators={approveAllCreators}
            onApproveAllCampaigns={approveAllCampaigns}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "creators" && (
          <AdminCreators
            creators={creators}
            selectedItems={selectedItems}
            onToggleSelect={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            onApproveSelected={() => approveSelected("creator")}
            onRejectSelected={() => rejectSelected("creator")}
            actionLoading={actionLoading}
            onRefresh={fetchCreators}
            adminUser={adminUser}
          />
        )}
        {activeTab === "businesses" && (
          <AdminBusinesses
            businesses={businesses}
            onStatsChange={fetchDashboardData}
            selectedItems={selectedItems}
            onToggleSelect={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            onApproveSelected={() => approveSelected("business")}
            onRejectSelected={() => rejectSelected("business")}
            actionLoading={actionLoading}
            onRefresh={fetchBusinesses}
          />
        )}
        {activeTab === "campaigns" && (
          <AdminCampaigns
            campaigns={campaigns}
            selectedItems={selectedItems}
            onToggleSelect={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            onApproveSelected={() => approveSelected("campaign")}
            onRejectSelected={() => rejectSelected("campaign")}
            actionLoading={actionLoading}
            onRefresh={fetchCampaigns}
          />
        )}
        {activeTab === "messages"     && <AdminMessages adminUser={adminUser} />}
        {activeTab === "support"      && <AdminSupport />}
        {activeTab === "reports"      && <AdminReports />}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "settings"     && <AdminSettings stats={stats} setStats={setStats} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────

function AdminOverview({ stats, onTabChange, onApproveAllBusinesses, onApproveAllCreators, onApproveAllCampaigns, actionLoading }: {
  stats: DashboardStats;
  onTabChange: (tab: AdminTab) => void;
  onApproveAllBusinesses: () => Promise<void>;
  onApproveAllCreators: () => Promise<void>;
  onApproveAllCampaigns: () => Promise<void>;
  actionLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {(stats.pendingCreators > 0 || stats.pendingBusinesses > 0 || stats.pendingCampaigns > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-5 rounded-xl flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic mb-1">Pending Approvals</h2>
            <p className="text-white/50 text-xs">Items awaiting your review</p>
          </div>
          <div className="flex flex-col gap-2">
            {stats.pendingCreators > 0 && (
              <button onClick={onApproveAllCreators} disabled={actionLoading}
                className="w-full px-4 py-3 bg-[#389C9A] text-white text-xs font-black uppercase tracking-widest hover:bg-[#2d7f7d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? "Processing..." : `Approve All Creators (${stats.pendingCreators})`}
              </button>
            )}
            {stats.pendingBusinesses > 0 && (
              <button onClick={onApproveAllBusinesses} disabled={actionLoading}
                className="w-full px-4 py-3 bg-[#FEDB71] text-[#1D1D1D] text-xs font-black uppercase tracking-widest hover:bg-[#ffd14d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? "Processing..." : `Approve All Businesses (${stats.pendingBusinesses})`}
              </button>
            )}
            {stats.pendingCampaigns > 0 && (
              <button onClick={onApproveAllCampaigns} disabled={actionLoading}
                className="w-full px-4 py-3 bg-violet-500 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-600 transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? "Processing..." : `Approve All Campaigns (${stats.pendingCampaigns})`}
              </button>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Creators",   value: stats.totalCreators,   icon: Users,     color: "text-blue-500",    bg: "bg-blue-50",    sub: `${stats.pendingCreators} pending` },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-500", bg: "bg-emerald-50", sub: `${stats.pendingBusinesses} pending` },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-violet-500",  bg: "bg-violet-50",  sub: `${stats.pendingCampaigns} pending` },
          { label: "Total Users",      value: stats.totalUsers,      icon: User,      color: "text-orange-500",  bg: "bg-orange-50",  sub: "registered" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">{s.label}</p>
            <p className="text-[8px] text-gray-400">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { label: "Total Revenue",   value: `₦${stats.totalRevenue.toLocaleString()}`,   icon: DollarSign, sub: "Completed payments", bg: "bg-[#389C9A]/10", color: "text-[#389C9A]" },
          { label: "Pending Payouts", value: `₦${stats.pendingPayouts.toLocaleString()}`, icon: TrendingUp,  sub: "Not yet paid out",   bg: "bg-[#FEDB71]/10", color: "text-[#FEDB71]" },
          { label: "Platform Fee",    value: `${stats.platformFee}%`,                     icon: PieChart,    sub: "Standard rate",      bg: "bg-[#389C9A]/10", color: "text-[#389C9A]" },
        ].map((item, i) => (
          <div key={i} className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl flex items-center gap-4">
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{item.label}</p>
              <p className="text-3xl font-black italic">{item.value}</p>
              <p className="text-[8px] opacity-40">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Action Required</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Creators",   value: stats.pendingCreators,   action: () => onTabChange("creators"),   accent: "border-[#FEDB71]", icon: Users,     bg: "bg-[#FEDB71]/10" },
            { label: "Pending Businesses", value: stats.pendingBusinesses, action: () => onTabChange("businesses"), accent: "border-[#389C9A]", icon: Building2, bg: "bg-[#389C9A]/10" },
            { label: "Pending Campaigns",  value: stats.pendingCampaigns,  action: () => onTabChange("campaigns"),  accent: "border-violet-400", icon: Megaphone, bg: "bg-violet-50" },
            { label: "Support Tickets",    value: stats.openSupportTickets,action: () => onTabChange("support"),    accent: "border-red-400",   icon: Flag,      bg: "bg-red-50" },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className={`bg-white border-2 ${item.accent} p-4 text-left hover:shadow-md transition-all rounded-xl`}>
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-black italic mb-1">{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-tight">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "All Creators",      icon: Users,         action: () => onTabChange("creators"),     color: "bg-blue-500" },
            { label: "Review Businesses", icon: Building2,     action: () => onTabChange("businesses"),   color: "bg-emerald-500" },
            { label: "Messages",          icon: MessageSquare, action: () => onTabChange("messages"),     color: "bg-[#389C9A]" },
            { label: "Transactions",      icon: CreditCard,    action: () => onTabChange("transactions"), color: "bg-violet-500" },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 flex items-center gap-3 hover:shadow-md transition-all rounded-xl">
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
// CREATORS TAB
// ─────────────────────────────────────────────

function AdminCreators({ creators, selectedItems, onToggleSelect, onToggleSelectAll, onApproveSelected, onRejectSelected, actionLoading, onRefresh, adminUser }: {
  creators: any[]; selectedItems: string[];
  onToggleSelect: (id: string) => void; onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>; onRejectSelected: () => Promise<void>;
  actionLoading: boolean; onRefresh: () => Promise<void>;
  adminUser: any;
}) {
  const [filter, setFilter]           = useState<"all" | "active" | "suspended" | "pending_review">("all");
  const [searchTerm, setSearchTerm]   = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showFilters, setShowFilters]  = useState(false);
  const [actionId, setActionId]        = useState<string | null>(null);

  const toggleStatus = async (creator: any) => {
    const newStatus = creator.status === "active" ? "suspended" : "active";
    const label     = newStatus === "active" ? "reactivate" : "deactivate";
    const ok = await confirmToast(`${label.charAt(0).toUpperCase() + label.slice(1)} ${creator.full_name || "this creator"}?`);
    if (!ok) return;
    setActionId(creator.id);
    try {
      const { error } = await supabase.from("creator_profiles").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", creator.id);
      if (error) throw error;
      toast.success(`Creator ${newStatus === "active" ? "reactivated ✅" : "deactivated"}`);
      onRefresh();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionId(null); }
  };

  const messageCreator = async (creator: any) => {
    if (!adminUser?.id || !creator.user_id) { toast.error("Cannot open chat"); return; }
    try {
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .or(`and(participant1_id.eq.${adminUser.id},participant2_id.eq.${creator.user_id}),and(participant1_id.eq.${creator.user_id},participant2_id.eq.${adminUser.id})`)
        .maybeSingle();

      if (!existing) {
        await supabase.from("conversations").insert({
          participant1_id: adminUser.id, participant2_id: creator.user_id,
          participant1_type: "admin", participant2_type: "creator",
          last_message_at: new Date().toISOString(), created_at: new Date().toISOString(),
        });
      }
      toast.success(`Opening chat with ${creator.full_name || "creator"} — go to Messages tab`);
    } catch (e: any) {
      toast.error("Failed to open conversation");
    }
  };

  const deleteCreator = async (creator: any) => {
    const ok = await confirmToast(`Permanently delete ${creator.full_name || "this creator"}? This cannot be undone.`);
    if (!ok) return;
    setActionId(creator.id);
    try {
      const { error } = await supabase.from("creator_profiles").delete().eq("id", creator.id);
      if (error) throw error;
      toast.success("Creator deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setActionId(null); }
  };

  const getName  = (c: any) => c.full_name || c.username || c.email || "Unnamed";
  const getEmail = (c: any) => c.email || "";

  const filtered = creators.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = getName(c).toLowerCase().includes(searchTerm.toLowerCase()) ||
                        getEmail(c).toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusBadge = (s: string) => {
    const base = "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap";
    if (s === "active")        return `${base} bg-green-100 text-green-700`;
    if (s === "suspended")     return `${base} bg-red-100 text-red-700`;
    if (s === "rejected")      return `${base} bg-gray-100 text-gray-500`;
    if (s === "pending_review") return `${base} bg-yellow-100 text-yellow-700`;
    return `${base} bg-gray-100 text-gray-500`;
  };

  const filterCounts = {
    all:            creators.length,
    active:         creators.filter(c => c.status === "active").length,
    suspended:      creators.filter(c => c.status === "suspended").length,
    pending_review: creators.filter(c => c.status === "pending_review").length,
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black uppercase tracking-tight text-lg">All Creators</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] bg-[#389C9A]/10 px-3 py-1 rounded-full">
            {creators.length} total
          </span>
        </div>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Activate
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Suspend
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase rounded-lg hover:bg-white/10">Clear</button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search creators..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm rounded-xl transition-colors" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-4 border-2 rounded-xl transition-colors ${showFilters ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"}`}>
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "suspended", "pending_review"] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === tab ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] text-gray-500 hover:bg-gray-200"
              }`}>
              {tab === "all" ? "All" : tab.replace("_", " ")}
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                filter === tab ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>{filterCounts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(creator => (
            <motion.div key={creator.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-4 rounded-xl transition-all ${
                selectedItems.includes(creator.id) ? "border-[#389C9A] bg-[#389C9A]/5" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
              }`}>

              <div className="flex items-start gap-3 mb-3">
                <button onClick={() => onToggleSelect(creator.id)} className="mt-1 shrink-0">
                  {selectedItems.includes(creator.id)
                    ? <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    : <Square className="w-5 h-5 text-gray-400" />}
                </button>
                <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 bg-[#F8F8F8] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt={getName(creator)} className="w-full h-full object-cover" />
                    : <User className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight truncate">{getName(creator)}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{getEmail(creator)}</span>
                  </div>
                  {/* Show full payment account */}
                  {creator.payment_method && (
                    <div className="flex items-center gap-1 text-[9px] text-gray-500 mt-0.5">
                      <CreditCard className="w-3 h-3" />
                      <span>{creator.payment_method}</span>
                      <span className="ml-1 font-mono text-xs">
                        {creator.payment_account || "No account set"}
                      </span>
                    </div>
                  )}
                  {creator.location && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /><span>{creator.location}</span>
                    </div>
                  )}
                </div>
                <span className={statusBadge(creator.status || "pending_review")}>
                  {(creator.status || "pending").replace("_", " ")}
                </span>
              </div>

              {(creator.avg_viewers || creator.rating) && (
                <div className="flex gap-3 ml-8 mb-3">
                  {creator.avg_viewers && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Eye className="w-3 h-3" />
                      <span>{Number(creator.avg_viewers).toLocaleString()} avg viewers</span>
                    </div>
                  )}
                  {creator.rating && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Star className="w-3 h-3 text-[#FEDB71]" />
                      <span>{creator.rating} rating</span>
                    </div>
                  )}
                </div>
              )}

              {creator.niche?.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-8 mb-3">
                  {creator.niche.slice(0, 4).map((n: string) => (
                    <span key={n} className="text-[7px] font-black uppercase bg-[#F8F8F8] px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                <button onClick={() => setSelectedCreator(creator)}
                  className="py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </button>

                <button onClick={() => messageCreator(creator)} disabled={actionId === creator.id}
                  className="py-2 border-2 border-[#389C9A] text-[#389C9A] text-[9px] font-black uppercase hover:bg-[#389C9A] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                  <MessageSquare className="w-3 h-3" /> Message
                </button>

                <button onClick={() => toggleStatus(creator)} disabled={actionId === creator.id}
                  className={`py-2 border-2 text-[9px] font-black uppercase transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 ${
                    creator.status === "active"
                      ? "border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white"
                      : "border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                  }`}>
                  {actionId === creator.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : creator.status === "active"
                      ? <><UserX className="w-3 h-3" /> Deactivate</>
                      : <><UserCheck className="w-3 h-3" /> Activate</>}
                </button>

                <button onClick={() => deleteCreator(creator)} disabled={actionId === creator.id}
                  className="col-span-3 py-2 border-2 border-red-200 text-red-400 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                  <Trash2 className="w-3 h-3" /> Delete Account
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedCreator && (
        <CreatorDetailModal creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB
// ─────────────────────────────────────────────

function AdminBusinesses({ businesses, onStatsChange, selectedItems, onToggleSelect, onToggleSelectAll, onApproveSelected, onRejectSelected, actionLoading, onRefresh }: {
  businesses: any[]; onStatsChange?: () => void;
  selectedItems: string[]; onToggleSelect: (id: string) => void; onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>; onRejectSelected: () => Promise<void>;
  actionLoading: boolean; onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter]                     = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm]             = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [actionId, setActionId]                 = useState<string | null>(null);

  const getStatus = (b: any): "approved" | "rejected" | "pending" => {
    if (b.application_status === "approved" || b.status === "approved") return "approved";
    if (b.application_status === "rejected" || b.status === "rejected") return "rejected";
    return "pending";
  };

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const biz    = businesses.find(b => b.id === id);
    const label  = newStatus === "approved" ? "Approve" : "Reject";
    const ok     = await confirmToast(`${label} "${biz?.business_name || "this business"}"?`);
    if (!ok) return;

    setActionId(id);
    try {
      const updates = newStatus === "approved"
        ? { application_status: "approved", status: "approved", verification_status: "verified",
            approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { application_status: "rejected", status: "rejected", verification_status: "rejected",
            rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      const { error } = await supabase.from("businesses").update(updates).eq("id", id);
      if (error) throw error;

      if (biz?.user_id) {
        await supabase.from("notifications").insert({
          user_id: biz.user_id,
          type:    newStatus === "approved" ? "business_approved" : "business_rejected",
          title:   newStatus === "approved" ? "Business Account Approved! ✅" : "Business Application Rejected",
          message: newStatus === "approved"
            ? `Your business "${biz.business_name}" has been approved and is now live.`
            : `Your business "${biz.business_name}" application was not approved.`,
          data:       { business_id: id },
          created_at: new Date().toISOString(),
        }).catch(console.error);
      }

      toast.success(`Business ${newStatus === "approved" ? "approved ✅" : "rejected"}`);
      onRefresh();
      onStatsChange?.();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setActionId(null);
    }
  };

  const deleteBusiness = async (id: string) => {
    const biz = businesses.find(b => b.id === id);
    const ok  = await confirmToast(`Permanently delete "${biz?.business_name || "this business"}"? This cannot be undone.`);
    if (!ok) return;
    setActionId(id);
    try {
      await supabase.from("businesses").update({ status: "deleted" }).eq("id", id);
      toast.success("Business deleted");
      onRefresh();
      onStatsChange?.();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setActionId(null);
    }
  };

  const filterCounts = {
    all:      businesses.length,
    pending:  businesses.filter(b => getStatus(b) === "pending").length,
    approved: businesses.filter(b => getStatus(b) === "approved").length,
    rejected: businesses.filter(b => getStatus(b) === "rejected").length,
  };

  const filtered = businesses.filter(b => {
    const matchFilter = filter === "all" || getStatus(b) === filter;
    const matchSearch =
      (b.business_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.industry || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusBadge = (s: string) => {
    const base = "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap";
    if (s === "approved") return `${base} bg-green-100 text-green-700`;
    if (s === "rejected") return `${base} bg-red-100 text-red-700`;
    return `${base} bg-yellow-100 text-yellow-700`;
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black uppercase tracking-tight text-lg">All Businesses</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] bg-[#389C9A]/10 px-3 py-1 rounded-full">
            {businesses.length} total
          </span>
        </div>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase rounded-lg hover:bg-white/10">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm rounded-xl transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === tab ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab === "all" ? "All" : tab}
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                filter === tab ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {filterCounts[tab]}
              </span>
            </button>
          ))}

          {filter === "pending" && filtered.length > 0 && (
            <button
              onClick={() => onToggleSelectAll(filtered)}
              className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline ml-auto"
            >
              Select all
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(biz => {
            const s = getStatus(biz);
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 rounded-xl transition-all ${
                  selectedItems.includes(biz.id) ? "border-[#389C9A] bg-[#389C9A]/5" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => onToggleSelect(biz.id)} className="mt-1 shrink-0">
                    {selectedItems.includes(biz.id)
                      ? <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                      : <Square      className="w-5 h-5 text-gray-400" />}
                  </button>

                  <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 bg-[#F8F8F8] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {biz.logo_url
                      ? <img src={biz.logo_url} alt={biz.business_name} className="w-full h-full object-cover" />
                      : <Building2 className="w-5 h-5 text-gray-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm uppercase tracking-tight truncate">{biz.business_name || "Unnamed"}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{biz.email}</span>
                    </div>
                    {biz.industry && (
                      <div className="text-[9px] text-gray-400 mt-0.5">{biz.industry}</div>
                    )}
                    {(biz.city || biz.country) && (
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{[biz.city, biz.country].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  <span className={statusBadge(s)}>{s}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                  <button
                    onClick={() => setSelectedBusiness(biz)}
                    className="py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>

                  {s === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(biz.id, "approved")}
                        disabled={actionId === biz.id}
                        className="py-2 bg-green-500 text-white text-[9px] font-black uppercase hover:bg-green-600 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /> Approve</>}
                      </button>
                      <button
                        onClick={() => updateStatus(biz.id, "rejected")}
                        disabled={actionId === biz.id}
                        className="py-2 bg-red-500 text-white text-[9px] font-black uppercase hover:bg-red-600 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3" /> Reject</>}
                      </button>
                    </>
                  )}

                  {s === "approved" && (
                    <>
                      <button
                        onClick={() => updateStatus(biz.id, "rejected")}
                        disabled={actionId === biz.id}
                        className="py-2 border-2 border-orange-400 text-orange-500 text-[9px] font-black uppercase hover:bg-orange-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3" /> Revoke</>}
                      </button>
                      <button
                        onClick={() => deleteBusiness(biz.id)}
                        disabled={actionId === biz.id}
                        className="py-2 border-2 border-red-200 text-red-400 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3" /> Delete</>}
                      </button>
                    </>
                  )}

                  {s === "rejected" && (
                    <>
                      <button
                        onClick={() => updateStatus(biz.id, "approved")}
                        disabled={actionId === biz.id}
                        className="py-2 border-2 border-green-500 text-green-600 text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /> Re-approve</>}
                      </button>
                      <button
                        onClick={() => deleteBusiness(biz.id)}
                        disabled={actionId === biz.id}
                        className="py-2 border-2 border-red-200 text-red-400 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3" /> Delete</>}
                      </button>
                    </>
                  )}
                </div>

                {s === "pending" && (
                  <div className="mt-2 ml-8">
                    <button
                      onClick={() => deleteBusiness(biz.id)}
                      disabled={actionId === biz.id}
                      className="w-full py-2 border-2 border-red-200 text-red-400 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {actionId === biz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3" /> Delete Account</>}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedBusiness && (
        <BusinessDetailModal business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGNS TAB
// ─────────────────────────────────────────────

function AdminCampaigns({ campaigns, selectedItems, onToggleSelect, onToggleSelectAll, onApproveSelected, onRejectSelected, actionLoading, onRefresh }: {
  campaigns: any[]; selectedItems: string[];
  onToggleSelect: (id: string) => void; onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>; onRejectSelected: () => Promise<void>;
  actionLoading: boolean; onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter]           = useState<"pending_review" | "active" | "completed" | "rejected" | "all">("pending_review");
  const [searchTerm, setSearchTerm]   = useState("");
  const [showFilters, setShowFilters]  = useState(false);
  const [updating, setUpdating]       = useState<string | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignCreators, setCampaignCreators] = useState<Record<string, any[]>>({});
  const [campaignProofs, setCampaignProofs] = useState<Record<string, any[]>>({});
  const [verifyingProofId, setVerifyingProofId] = useState<string | null>(null);
  const [payingCreatorId, setPayingCreatorId] = useState<string | null>(null);

  // ── Shared refresh helper ──────────────────────────────────────────────
  const refreshExpandedCampaign = async (campaignId: string) => {
    const { data: creators, error } = await supabase
      .from("campaign_creators")
      .select(`
        *,
        creator_profiles (
          id, full_name, username, avatar_url, user_id,
          payment_method, payment_account
        )
      `)
      .eq("campaign_id", campaignId);
    if (!error && creators) {
      setCampaignCreators(prev => ({ ...prev, [campaignId]: creators }));

      const proofsMap: Record<string, any[]> = {};
      for (const creator of creators) {
        const { data: proofs } = await supabase
          .from("stream_proofs")
          .select("*")
          .eq("campaign_creator_id", creator.id)
          .order("stream_number");
        if (proofs) proofsMap[creator.id] = proofs;
      }
      setCampaignProofs(prev => ({ ...prev, ...proofsMap }));
    }
  };

  // ── Realtime subscription for expanded campaign ────────────────────────
  useEffect(() => {
    if (!expandedCampaignId) return;

    const channel = supabase
      .channel(`admin-campaign-${expandedCampaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_creators",
          filter: `campaign_id=eq.${expandedCampaignId}`,
        },
        () => {
          refreshExpandedCampaign(expandedCampaignId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stream_proofs",
        },
        (payload) => {
          const creatorId = payload.new?.campaign_creator_id;
          if (creatorId && campaignCreators[expandedCampaignId]?.some(c => c.id === creatorId)) {
            refreshExpandedCampaign(expandedCampaignId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedCampaignId]);

  // ── Initial load when campaign is expanded ─────────────────────────────
  useEffect(() => {
    if (!expandedCampaignId) return;
    refreshExpandedCampaign(expandedCampaignId);
  }, [expandedCampaignId]);

  // ── Campaign status update ─────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: "active" | "rejected" | "completed") => {
    const camp  = campaigns.find(c => c.id === id);
    const label = newStatus === "active" ? "approve" : newStatus === "completed" ? "mark complete" : "reject";
    const ok    = await confirmToast(`${label.charAt(0).toUpperCase() + label.slice(1)} "${camp?.name || "campaign"}"?`);
    if (!ok) return;

    setUpdating(id);
    try {
      const updates: any = {
        status: newStatus,
        ...(newStatus === "active"    ? { approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}),
        ...(newStatus === "rejected"  ? { rejected_at: new Date().toISOString() } : {}),
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
      if (error) throw error;

      if (camp?.businesses?.id) {
        const { data: biz } = await supabase.from("businesses").select("user_id").eq("id", camp.businesses.id).maybeSingle();
        if (biz?.user_id) {
          await supabase.from("notifications").insert({
            user_id: biz.user_id,
            type: newStatus === "active" ? "campaign_approved" : "campaign_rejected",
            title: newStatus === "active" ? "Campaign Approved! ✅" : "Campaign Rejected",
            message: newStatus === "active"
              ? `Your campaign "${camp.name}" is now live!`
              : `Your campaign "${camp.name}" was not approved.`,
            data: { campaign_id: id },
            created_at: new Date().toISOString(),
          }).catch(console.error);
        }
      }

      toast.success(`Campaign ${newStatus === "active" ? "approved ✅" : newStatus}`);
      onRefresh();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally { setUpdating(null); }
  };

  // ── Delete campaign ────────────────────────────────────────────────────
  const deleteCampaign = async (id: string) => {
    const camp = campaigns.find(c => c.id === id);
    const ok   = await confirmToast(`Delete "${camp?.name || "campaign"}"? This cannot be undone.`);
    if (!ok) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) { toast.error("Failed"); return; }
    toast.success("Campaign deleted");
    onRefresh();
  };

  // ── Verify stream proof ────────────────────────────────────────────────
  const verifyProof = async (proofId: string, creatorId: string, streamNum: number) => {
    const ok = await confirmToast(`Verify stream ${streamNum} for this creator?`);
    if (!ok) return;

    setVerifyingProofId(proofId);
    try {
      const { error: proofError } = await supabase
        .from("stream_proofs")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", proofId);
      if (proofError) throw proofError;

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("budget, streams_required, pay_per_stream")
        .eq("id", expandedCampaignId)
        .single();

      const perStream = campaign?.pay_per_stream || (campaign?.budget / campaign?.streams_required);

      const { data: cc } = await supabase
        .from("campaign_creators")
        .select("streams_completed, total_earnings")
        .eq("id", creatorId)
        .single();

      const { error: updateError } = await supabase
        .from("campaign_creators")
        .update({
          streams_completed: (cc?.streams_completed || 0) + 1,
          total_earnings: (cc?.total_earnings || 0) + perStream,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creatorId);
      if (updateError) throw updateError;

      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("id", creatorId)
        .single();
      if (profile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          type: "stream_verified",
          title: "Stream Verified! 🎉",
          message: `Stream ${streamNum} for your campaign has been verified by admin. ₦${perStream.toLocaleString()} added.`,
          data: { campaign_id: expandedCampaignId, stream_number: streamNum },
          created_at: new Date().toISOString(),
        });
      }

      toast.success(`Stream ${streamNum} verified!`);
      if (expandedCampaignId) refreshExpandedCampaign(expandedCampaignId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifyingProofId(null);
    }
  };

  // ── Pay creator (only if all streams completed) ─────────────────────────
  const payCreator = async (creatorId: string, creatorUserId: string, campaignCreatorId: string, totalEarnings: number, paidOut: number) => {
    const pending = totalEarnings - paidOut;
    if (pending <= 0) {
      toast.info("No pending earnings to pay.");
      return;
    }

    // Check if all streams are verified
    const creator = (campaignCreators[expandedCampaignId!] || []).find(c => c.id === campaignCreatorId);
    const allStreamsCompleted = (creator?.streams_completed || 0) >= (creator?.streams_target || 0);
    if (!allStreamsCompleted) {
      toast.warning("All required streams must be verified before payment.");
      return;
    }

    const ok = await confirmToast(`Pay ₦${pending.toLocaleString()} to this creator?`);
    if (!ok) return;

    setPayingCreatorId(creatorId);
    try {
      const { error: updateError } = await supabase
        .from("campaign_creators")
        .update({ paid_out: totalEarnings, updated_at: new Date().toISOString() })
        .eq("id", campaignCreatorId);
      if (updateError) throw updateError;

      const { error: payoutError } = await supabase
        .from("creator_payouts")
        .insert({
          creator_id: creatorId,
          campaign_creator_id: campaignCreatorId,
          amount: pending,
          status: "completed",
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      if (payoutError) throw payoutError;

      if (creatorUserId) {
        await supabase.from("notifications").insert({
          user_id: creatorUserId,
          type: "payout",
          title: "Payout Completed! 💰",
          message: `₦${pending.toLocaleString()} has been paid out for your campaign work.`,
          data: { campaign_creator_id: campaignCreatorId, amount: pending },
          created_at: new Date().toISOString(),
        }).catch(console.error);
      }

      toast.success(`Paid ₦${pending.toLocaleString()}`);
      if (expandedCampaignId) refreshExpandedCampaign(expandedCampaignId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPayingCreatorId(null);
    }
  };

  const getName  = (c: any) => c.name || c.title || "Unnamed Campaign";
  const getBiz   = (c: any) => c.businesses?.business_name || "Unknown Business";
  const getPrice = (c: any) => c.pay_rate ?? c.bid_amount ?? c.budget ?? 0;

  const filtered = campaigns.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = getName(c).toLowerCase().includes(searchTerm.toLowerCase()) ||
                        getBiz(c).toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusBadge = (s: string) => {
    const base = "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full";
    if (s === "active")         return `${base} bg-green-100 text-green-700`;
    if (s === "completed")      return `${base} bg-blue-100 text-blue-700`;
    if (s === "rejected")       return `${base} bg-red-100 text-red-700`;
    if (s === "pending_review") return `${base} bg-yellow-100 text-yellow-700`;
    return `${base} bg-gray-100 text-gray-500`;
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Campaigns</h3>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase rounded-lg">Clear</button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search campaigns..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm rounded-xl transition-colors" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-4 border-2 rounded-xl transition-colors ${showFilters ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"}`}>
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters ? (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "completed", "rejected", "all"] as const).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex-1 transition-colors ${
                  filter === tab ? "bg-[#1D1D1D] text-white" : "bg-white border-2 border-[#1D1D1D]/10"
                }`}>
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">{filter.replace("_", " ")}</span>
            <span className="text-xs text-gray-400">({filtered.length})</span>
            {filter === "pending_review" && filtered.length > 0 && (
              <button onClick={() => onToggleSelectAll(filtered)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline">Select all</button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(camp => (
            <motion.div key={camp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-4 rounded-xl transition-all ${
                selectedItems.includes(camp.id) ? "border-[#389C9A] bg-[#389C9A]/5" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
              }`}>
              <div className="flex items-start gap-3 mb-3">
                <button onClick={() => onToggleSelect(camp.id)} className="mt-1 shrink-0">
                  {selectedItems.includes(camp.id)
                    ? <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    : <Square className="w-5 h-5 text-gray-400" />}
                </button>
                <div className="w-11 h-11 border-2 border-[#1D1D1D]/10 bg-[#F8F8F8] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                  {camp.businesses?.logo_url
                    ? <img src={camp.businesses.logo_url} alt={getBiz(camp)} className="w-full h-full object-cover" />
                    : <Building2 className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight truncate">{getName(camp)}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{getBiz(camp)}</p>
                </div>
                <span className={statusBadge(camp.status)}>{camp.status?.replace("_", " ")}</span>
              </div>

              <div className="flex items-center justify-between mb-3 ml-8">
                <p className="font-black text-xl text-[#389C9A]">₦{Number(getPrice(camp)).toLocaleString()}</p>
                <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
              </div>

              {/* Expand / collapse button */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setExpandedCampaignId(expandedCampaignId === camp.id ? null : camp.id)}
                  className="p-1 hover:bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                >
                  {expandedCampaignId === camp.id ? (
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {expandedCampaignId === camp.id ? "Hide Details" : "Show Creators"}
                </button>
              </div>

              {/* ── Expanded creator / proof / pay section ── */}
              {expandedCampaignId === camp.id && (
                <div className="mt-4 border-t pt-4 space-y-4">
                  {(campaignCreators[expandedCampaignId] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No creators joined yet</p>
                  ) : (
                    campaignCreators[expandedCampaignId].map(creator => {
                      const proofs = campaignProofs[creator.id] || [];
                      const streamStatuses = Array.from({ length: creator.streams_target }, (_, i) => {
                        const streamNum = i + 1;
                        const proof = proofs.find(p => p.stream_number === streamNum);
                        return { streamNum, proof };
                      });
                      const pendingPay = (creator.total_earnings || 0) - (creator.paid_out || 0);
                      const allStreamsCompleted = (creator.streams_completed || 0) >= (creator.streams_target || 0);

                      return (
                        <div key={creator.id} className="border rounded-lg p-3 bg-gray-50">
                          {/* Creator header */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {creator.creator_profiles?.avatar_url ? (
                                <img src={creator.creator_profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-black text-xs">
                                  {creator.creator_profiles?.full_name?.[0] || "C"}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-sm">{creator.creator_profiles?.full_name || "Unknown"}</p>
                                {/* Show full payment account */}
                                {creator.creator_profiles?.payment_method && (
                                  <p className="text-[8px] text-gray-500 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {creator.creator_profiles.payment_method} &nbsp;
                                    <span className="font-mono text-xs">
                                      {creator.creator_profiles.payment_account || "No account set"}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-[#389C9A]">
                                ₦{(creator.total_earnings || 0).toLocaleString()} earned
                              </p>
                              {pendingPay > 0 && !allStreamsCompleted && (
                                <p className="text-[9px] text-orange-500">⚠️ Not all streams completed</p>
                              )}
                            </div>
                          </div>

                          {/* Stream proofs list */}
                          <div className="space-y-2 mt-2">
                            {streamStatuses.map(({ streamNum, proof }) => (
                              <div key={streamNum} className="flex items-center justify-between text-sm border-b pb-1">
                                <span>Stream {streamNum}</span>
                                {proof ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => window.open(proof.proof_url, '_blank')}
                                      className="text-[#389C9A] text-xs underline flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> View
                                    </button>
                                    {proof.status === 'pending' && (
                                      <button
                                        onClick={() => verifyProof(proof.id, creator.id, streamNum)}
                                        disabled={verifyingProofId === proof.id}
                                        className="px-2 py-0.5 bg-green-500 text-white text-[9px] font-black rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {verifyingProofId === proof.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3" />
                                        )}
                                        Verify
                                      </button>
                                    )}
                                    <span className={`text-[8px] font-black uppercase ${
                                      proof.status === 'verified' ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                      {proof.status}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">No proof</span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Pay button – only if all streams completed and pending earnings > 0 */}
                          {pendingPay > 0 && allStreamsCompleted && (
                            <div className="mt-3 pt-2 border-t">
                              <button
                                onClick={() => payCreator(
                                  creator.creator_id,
                                  creator.creator_profiles?.user_id,
                                  creator.id,
                                  creator.total_earnings || 0,
                                  creator.paid_out || 0,
                                )}
                                disabled={payingCreatorId === creator.creator_id}
                                className="w-full py-2 bg-green-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {payingCreatorId === creator.creator_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CreditCard className="w-3 h-3" />
                                )}
                                Pay Pending (₦{pendingPay.toLocaleString()})
                              </button>
                            </div>
                          )}
                          {pendingPay > 0 && !allStreamsCompleted && (
                            <div className="mt-3 pt-2 border-t">
                              <p className="text-[9px] text-orange-500 text-center">
                                ⚠️ Payment available after all streams are verified.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Campaign action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8 mt-2">
                {camp.status === "pending_review" && (
                  <>
                    <button onClick={() => updateStatus(camp.id, "active")} disabled={updating === camp.id}
                      className="bg-green-500 text-white py-2 text-[9px] font-black uppercase hover:bg-green-600 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" />
                      {updating === camp.id ? "..." : "Approve"}
                    </button>
                    <button onClick={() => updateStatus(camp.id, "rejected")} disabled={updating === camp.id}
                      className="bg-red-500 text-white py-2 text-[9px] font-black uppercase hover:bg-red-600 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                {camp.status === "active" && (
                  <>
                    <button onClick={() => updateStatus(camp.id, "completed")} disabled={updating === camp.id}
                      className="border-2 border-blue-400 text-blue-500 py-2 text-[9px] font-black uppercase hover:bg-blue-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" />
                      {updating === camp.id ? "..." : "Complete"}
                    </button>
                    <button onClick={() => updateStatus(camp.id, "rejected")} disabled={updating === camp.id}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                {(camp.status === "completed" || camp.status === "rejected") && (
                  <button onClick={() => deleteCampaign(camp.id)} disabled={updating === camp.id}
                    className="col-span-2 border-2 border-red-200 text-red-400 py-2 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MESSAGES TAB (unchanged)
// ─────────────────────────────────────────────

function AdminMessages({ adminUser }: { adminUser: any }) {
  const [loading, setLoading]                           = useState(true);
  const [conversations, setConversations]               = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages]                         = useState<Message[]>([]);
  const [messageInput, setMessageInput]                 = useState("");
  const [sending, setSending]                           = useState(false);
  const [searchQuery, setSearchQuery]                   = useState("");
  const [filter, setFilter]                             = useState<"all" | "unread" | "creators" | "businesses">("all");
  const [showUserSearch, setShowUserSearch]             = useState(false);
  const [searchResults, setSearchResults]               = useState<UserProfile[]>([]);
  const [searching, setSearching]                       = useState(false);
  const [newMsgSearch, setNewMsgSearch]                 = useState("");
  const [attachments, setAttachments]                   = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (adminUser) fetchConversations();
  }, [adminUser]);

  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation.id);
    markConversationAsRead(selectedConversation.id);

    const sub = supabase
      .channel(`admin-msgs-${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        if (msg.sender_id !== adminUser?.id) markAsRead(msg.id);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [selectedConversation]);

  const markAsRead = async (id: string) => {
    await supabase.from("messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("id, participant1_id, participant2_id, participant1_type, participant2_type, last_message_at")
        .or(`participant1_id.eq.${adminUser?.id},participant2_id.eq.${adminUser?.id}`)
        .order("last_message_at", { ascending: false });

      if (!convRows) return;

      const previews = await Promise.all(convRows.map(async conv => {
        const otherId   = conv.participant1_id === adminUser?.id ? conv.participant2_id   : conv.participant1_id;
        const otherType = conv.participant1_id === adminUser?.id ? conv.participant2_type : conv.participant1_type;

        const table  = otherType === "creator" ? "creator_profiles" : "businesses";
        const fields = otherType === "creator" ? "full_name, avatar_url" : "business_name, logo_url";
        const { data: profile } = await supabase.from(table).select(fields).eq("user_id", otherId).maybeSingle();

        const { data: lastMsg } = await supabase
          .from("messages").select("content, created_at, sender_id")
          .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

        const { count: unread } = await supabase
          .from("messages").select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id).eq("sender_id", otherId).eq("is_read", false);

        const name   = otherType === "creator" ? (profile as any)?.full_name : (profile as any)?.business_name;
        const avatar = otherType === "creator" ? (profile as any)?.avatar_url : (profile as any)?.logo_url;

        return {
          id: conv.id,
          participant_id: otherId,
          participant_name: name || "Unknown",
          participant_avatar: avatar || "",
          participant_type: otherType as "creator" | "business",
          last_message: lastMsg?.content || "No messages yet",
          last_message_time: conv.last_message_at || new Date().toISOString(),
          last_message_sender: lastMsg?.sender_id === adminUser?.id ? "You" : name || "Them",
          unread_count: unread || 0,
        };
      }));

      setConversations(previews.filter(Boolean));
    } catch (e) {
      console.error("fetchConversations:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    if (!error) setMessages(data || []);
  };

  const markConversationAsRead = async (convId: string) => {
    await supabase.from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", convId).neq("sender_id", adminUser?.id).eq("is_read", false);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
  };

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;
    setSending(true);
    try {
      const attachmentUrls: any[] = [];
      for (const file of attachments) {
        const fileName = `admin/${selectedConversation.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("message-attachments").upload(fileName, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("message-attachments").getPublicUrl(fileName);
        attachmentUrls.push({ url: publicUrl, type: file.type, name: file.name, size: file.size });
      }

      const { data, error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: adminUser?.id,
        content: messageInput.trim(),
        is_read: false,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() }).eq("id", selectedConversation.id);

      setMessages(prev => [...prev, data]);
      setMessageInput("");
      setAttachments([]);
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, last_message: messageInput.trim(), last_message_time: new Date().toISOString(), last_message_sender: "You" }
          : c
      ));
    } catch (e) {
      console.error("sendMessage:", e);
      toast.error("Failed to send message");
    } finally { setSending(false); }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const [{ data: c }, { data: b }] = await Promise.all([
        supabase.from("creator_profiles").select("id, user_id, full_name, email, avatar_url, status, created_at")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(8),
        supabase.from("businesses").select("id, user_id, business_name, email, logo_url, status, created_at")
          .or(`business_name.ilike.%${query}%,email.ilike.%${query}%`).limit(8),
      ]);
      setSearchResults([
        ...(c || []).map((x: any) => ({ ...x, type: "creator" as const })),
        ...(b || []).map((x: any) => ({ ...x, full_name: x.business_name, avatar_url: x.logo_url, type: "business" as const })),
      ]);
    } catch (e) { console.error("searchUsers:", e); }
    finally { setSearching(false); }
  };

  const startConversation = async (u: UserProfile) => {
    try {
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .or(`and(participant1_id.eq.${adminUser?.id},participant2_id.eq.${u.user_id}),and(participant1_id.eq.${u.user_id},participant2_id.eq.${adminUser?.id})`)
        .maybeSingle();

      let convId = existing?.id;

      if (!convId) {
        const { data: newConv, error } = await supabase.from("conversations").insert({
          participant1_id: adminUser?.id, participant2_id: u.user_id,
          participant1_type: "admin", participant2_type: u.type,
          last_message_at: new Date().toISOString(), created_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;
        convId = newConv.id;
      }

      await fetchConversations();
      setShowUserSearch(false);
      setNewMsgSearch("");
      setSearchResults([]);

      setTimeout(() => {
        setSelectedConversation(prev => {
          const found = conversations.find(c => c.id === convId);
          return found || prev;
        });
      }, 300);
    } catch (e) {
      console.error("startConversation:", e);
      toast.error("Failed to start conversation");
    }
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    if (d < 7)  return `${d}d`;
    return new Date(ts).toLocaleDateString();
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const filteredConvs = conversations.filter(c => {
    const matchSearch = c.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "unread")     return matchSearch && c.unread_count > 0;
    if (filter === "creators")   return matchSearch && c.participant_type === "creator";
    if (filter === "businesses") return matchSearch && c.participant_type === "business";
    return matchSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] rounded-xl overflow-hidden" style={{ height: "calc(100vh - 160px)", minHeight: 500 }}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 border-r border-[#1D1D1D]/10 flex flex-col shrink-0 bg-[#FDFDFD]">
          <div className="p-4 border-b border-[#1D1D1D]/10 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#389C9A]" /> Messages
              </h3>
              <button onClick={() => setShowUserSearch(true)}
                className="p-2 bg-[#1D1D1D] text-white rounded-lg hover:bg-[#389C9A] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..." className="w-full pl-9 pr-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm transition-colors" />
            </div>
            <div className="flex gap-1">
              {(["all", "unread", "creators", "businesses"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${
                    filter === f ? "bg-[#1D1D1D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {f === "all" ? "All" : f === "unread" ? "New" : f === "creators" ? "C" : "B"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                <MessageSquare className="w-10 h-10 text-gray-200" />
                <p className="text-xs text-gray-500">No conversations</p>
                <button onClick={() => setShowUserSearch(true)}
                  className="text-[#389C9A] text-[10px] font-black hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New Message
                </button>
              </div>
            ) : (
              filteredConvs.map(conv => (
                <button key={conv.id} onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3 flex items-start gap-3 border-b border-[#1D1D1D]/10 hover:bg-gray-50 transition-all text-left ${
                    selectedConversation?.id === conv.id ? "bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]" : ""
                  }`}>
                  <div className="relative shrink-0">
                    {conv.participant_avatar ? (
                      <img src={conv.participant_avatar} className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover" alt={conv.participant_name} />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-xs">
                        {getInitials(conv.participant_name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      conv.participant_type === "creator" ? "bg-[#389C9A]" : "bg-[#FEDB71]"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-black text-xs truncate ${conv.unread_count > 0 ? "text-[#1D1D1D]" : "text-gray-500"}`}>
                        {conv.participant_name}
                      </h4>
                      <span className="text-[8px] text-gray-400 whitespace-nowrap ml-1">{formatTime(conv.last_message_time)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{conv.last_message}</p>
                    {conv.unread_count > 0 && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-[#389C9A] text-white text-[8px] font-black rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              <div className="px-4 py-3 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  {selectedConversation.participant_avatar ? (
                    <img src={selectedConversation.participant_avatar} className="w-9 h-9 rounded-full border-2 border-[#1D1D1D]/10 object-cover" alt={selectedConversation.participant_name} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-xs">
                      {getInitials(selectedConversation.participant_name)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-sm">{selectedConversation.participant_name}</h3>
                    <p className="text-[9px] text-gray-400 capitalize">{selectedConversation.participant_type}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                    <MessageSquare className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === adminUser?.id;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isMe ? "bg-[#389C9A] text-white rounded-tr-none" : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D] rounded-tl-none"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {msg.attachments?.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 mt-2 p-2 rounded-lg text-xs ${isMe ? "bg-white/20" : "bg-gray-100"}`}>
                                {att.type.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                <span className="truncate text-[10px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-[8px] text-gray-400 ${isMe ? "justify-end" : "justify-start"}`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isMe && (msg.is_read
                              ? <><CheckCheck className="w-3 h-3 text-[#389C9A]" /><span>Read</span></>
                              : <><CheckCheck className="w-3 h-3" /><span>Sent</span></>)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-[#1D1D1D]/10 bg-white">
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {attachments.map((file, i) => (
                        <div key={i} className="relative shrink-0 group">
                          {file.type.startsWith("image/") ? (
                            <div className="relative">
                              <img src={URL.createObjectURL(file)} alt={file.name} className="w-14 h-14 object-cover rounded-xl border-2 border-[#1D1D1D]/10" />
                              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative w-14 h-14 bg-gray-100 rounded-xl border-2 border-[#1D1D1D]/10 flex flex-col items-center justify-center p-1">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <p className="text-[7px] truncate w-full text-center">{file.name.slice(0, 8)}</p>
                              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  <input type="file" multiple onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
                    className="hidden" ref={fileInputRef} />
                  <label onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors shrink-0">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </label>
                  <textarea value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm resize-none max-h-32 transition-colors"
                    rows={Math.min(3, messageInput.split("\n").length || 1)} />
                  <button onClick={sendMessage} disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                    className={`p-2.5 rounded-xl transition-all shrink-0 ${
                      messageInput.trim() || attachments.length > 0 ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>

                <p className="text-center text-[8px] text-gray-400 mt-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Enter</kbd> to send ·{" "}
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tighter italic mb-2">No Conversation Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs mb-6">Select a conversation or start a new one.</p>
              <button onClick={() => setShowUserSearch(true)}
                className="px-6 py-3 bg-[#1D1D1D] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> New Message
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUserSearch && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
              onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white p-6 z-50 rounded-2xl shadow-2xl border-2 border-[#1D1D1D]">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-black uppercase tracking-tighter italic">New Message</h3>
                <button onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={newMsgSearch}
                  onChange={e => { setNewMsgSearch(e.target.value); searchUsers(e.target.value); }}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                  autoFocus />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(u => (
                      <button key={u.id} onClick={() => startConversation(u)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-[#1D1D1D]/10">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shrink-0">
                          {getInitials(u.full_name || u.business_name || "")}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm uppercase tracking-tight">{u.full_name || u.business_name}</p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500">
                            <span>{u.type === "creator" ? "Creator" : "Business"}</span>
                            <span>·</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#389C9A] transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : newMsgSearch ? (
                  <div className="text-center py-8">
                    <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No users found</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Start typing to search</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPORT TICKETS
// ─────────────────────────────────────────────

function AdminSupport() {
  const [tickets, setTickets]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("open");
  const [selected, setSelected]         = useState<any | null>(null);
  const [adminReply, setAdminReply]     = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, user_id, subject, message, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
      if (selected?.id === id) setSelected((prev: any) => prev ? { ...prev, status } : null);
      toast.success(`Ticket marked as ${status.replace("_", " ")}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdatingId(null); }
  };

  const sendReply = async () => {
    if (!adminReply.trim() || !selected) return;
    setSendingReply(true);
    try {
      const timestamp   = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const updatedMsg  = `${selected.message || ""}\n\n--- Admin Reply (${timestamp}) ---\n${adminReply.trim()}`;

      const { error } = await supabase
        .from("support_tickets")
        .update({ message: updatedMsg, status: "in_progress" })
        .eq("id", selected.id);
      if (error) throw error;

      if (selected.user_id) {
        await supabase.from("notifications").insert({
          user_id:    selected.user_id,
          type:       "system",
          title:      "Support Update",
          message:    `Admin replied to your support ticket: "${adminReply.trim().slice(0, 80)}${adminReply.length > 80 ? "…" : ""}"`,
          data:       { ticket_id: selected.id },
          created_at: new Date().toISOString(),
        }).catch(console.error);
      }

      const updated = { ...selected, message: updatedMsg, status: "in_progress" };
      setSelected(updated);
      setTickets((prev) => prev.map((t) => t.id === selected.id ? updated : t));
      setAdminReply("");
      toast.success("Reply sent to user");
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingReply(false); }
  };

  const deleteTicket = async (id: string) => {
    const ok = await confirmToast("Delete this ticket permanently?");
    if (!ok) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTickets((prev) => prev.filter((t) => t.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Ticket deleted");
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const filterCounts = {
    all:         tickets.length,
    open:        tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved:    tickets.filter((t) => t.status === "resolved").length,
    closed:      tickets.filter((t) => t.status === "closed").length,
  };

  const statusBadge = (s: string) => {
    const base = "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full";
    if (s === "open")        return `${base} bg-red-100 text-red-700`;
    if (s === "in_progress") return `${base} bg-yellow-100 text-yellow-700`;
    if (s === "resolved")    return `${base} bg-green-100 text-green-700`;
    return `${base} bg-gray-100 text-gray-500`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const parseMessage = (msg: string) => {
    const parts = (msg || "").split(/\n\n--- Admin Reply \(/);
    const original = parts[0].trim();
    const replies  = parts.slice(1).map((p) => {
      const closeParen = p.indexOf(") ---\n");
      const ts  = closeParen >= 0 ? p.slice(0, closeParen) : "";
      const txt = closeParen >= 0 ? p.slice(closeParen + 6).trim() : p.trim();
      return { ts, txt };
    });
    return { original, replies };
  };

  if (loading) return (
    <div className="bg-white border-2 border-[#1D1D1D] p-10 flex items-center justify-center rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black uppercase tracking-tight text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#389C9A]" /> Support Tickets
          </h3>
          <button onClick={fetchTickets} className="p-2 hover:bg-[#F8F8F8] rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === tab ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] text-gray-500 hover:bg-gray-200"
              }`}>
              {tab.replace("_", " ")}
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                filter === tab ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>{filterCounts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-[#1D1D1D] p-12 text-center rounded-xl">
          <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No {filter === "all" ? "" : filter.replace("_", " ")} tickets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const { original, replies } = parseMessage(ticket.message);
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white border-2 rounded-xl overflow-hidden transition-all ${
                  selected?.id === ticket.id ? "border-[#389C9A]" : "border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                }`}>

                <div className="p-4 cursor-pointer"
                  onClick={() => setSelected(selected?.id === ticket.id ? null : ticket)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Flag className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <h4 className="font-black text-sm uppercase tracking-tight truncate">{ticket.subject || "Support Ticket"}</h4>
                      </div>
                      <p className="text-[9px] text-gray-400">{formatDate(ticket.created_at)}</p>
                    </div>
                    <span className={statusBadge(ticket.status || "open")}>{(ticket.status || "open").replace("_", " ")}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{original}</p>
                </div>

                <AnimatePresence>
                  {selected?.id === ticket.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t-2 border-[#1D1D1D]/10 overflow-hidden"
                    >
                      <div className="p-4 space-y-4 bg-[#F8F8F8]">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Ticket Details</p>
                          <div className="bg-white border-2 border-[#1D1D1D]/10 rounded-xl p-3">
                            <p className="text-[10px] text-[#1D1D1D]/70 leading-relaxed whitespace-pre-line">{original}</p>
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Admin Replies</p>
                            {replies.map((r, i) => (
                              <div key={i} className="bg-[#389C9A]/10 border-2 border-[#389C9A]/20 rounded-xl p-3">
                                <p className="text-[10px] text-[#1D1D1D]/70 leading-relaxed whitespace-pre-line">{r.txt}</p>
                                {r.ts && <p className="text-[8px] text-gray-400 mt-1">{r.ts}</p>}
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">Reply to User</p>
                          <textarea
                            value={adminReply}
                            onChange={(e) => setAdminReply(e.target.value)}
                            placeholder="Write a reply to send to the user..."
                            rows={3}
                            className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm resize-none transition-colors bg-white"
                          />
                          <button onClick={sendReply} disabled={!adminReply.trim() || sendingReply}
                            className="mt-2 w-full bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-[#389C9A] transition-colors disabled:opacity-50">
                            {sendingReply
                              ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                              : <><Send className="w-3 h-3" /> Send Reply</>}
                          </button>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">Update Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            {ticket.status !== "in_progress" && (
                              <button onClick={() => updateStatus(ticket.id, "in_progress")} disabled={updatingId === ticket.id}
                                className="py-2 border-2 border-yellow-400 text-yellow-600 text-[9px] font-black uppercase hover:bg-yellow-400 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                                {updatingId === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "In Progress"}
                              </button>
                            )}
                            {ticket.status !== "resolved" && (
                              <button onClick={() => updateStatus(ticket.id, "resolved")} disabled={updatingId === ticket.id}
                                className="py-2 border-2 border-green-500 text-green-600 text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                                {updatingId === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Resolve"}
                              </button>
                            )}
                            {ticket.status !== "closed" && (
                              <button onClick={() => updateStatus(ticket.id, "closed")} disabled={updatingId === ticket.id}
                                className="py-2 border-2 border-gray-400 text-gray-500 text-[9px] font-black uppercase hover:bg-gray-400 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                                {updatingId === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Close"}
                              </button>
                            )}
                            <button onClick={() => deleteTicket(ticket.id)}
                              className="py-2 border-2 border-red-200 text-red-400 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1">
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTED CONTENT
// ─────────────────────────────────────────────

function AdminReports() {
  const [reports, setReports]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "open" | "resolved">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, user_id, subject, message, status, created_at")
        .ilike("subject", "Report:%")
        .order("created_at", { ascending: false });
      setReports(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resolve = async (id: string) => {
    setUpdatingId(id);
    try {
      await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", id);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "resolved" } : r));
      toast.success("Report resolved");
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdatingId(null); }
  };

  const dismiss = async (id: string) => {
    const ok = await confirmToast("Dismiss this report?");
    if (!ok) return;
    setUpdatingId(id);
    try {
      await supabase.from("support_tickets").update({ status: "closed" }).eq("id", id);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "closed" } : r));
      toast.success("Report dismissed");
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdatingId(null); }
  };

  const filtered = filter === "all" ? reports : reports.filter((r) => {
    if (filter === "open")     return r.status === "open" || r.status === "in_progress";
    if (filter === "resolved") return r.status === "resolved" || r.status === "closed";
    return true;
  });

  const statusBadge = (s: string) => {
    const base = "text-[8px] font-black uppercase px-2 py-1 rounded-full";
    if (s === "open")        return `${base} bg-red-100 text-red-700`;
    if (s === "in_progress") return `${base} bg-yellow-100 text-yellow-700`;
    if (s === "resolved")    return `${base} bg-green-100 text-green-700`;
    return `${base} bg-gray-100 text-gray-500`;
  };

  if (loading) return (
    <div className="bg-white border-2 border-[#1D1D1D] p-10 flex items-center justify-center rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black uppercase tracking-tight text-lg flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" /> Reported Content
          </h3>
          <button onClick={fetchReports} className="p-2 hover:bg-[#F8F8F8] rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="flex gap-2">
          {(["all", "open", "resolved"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${
                filter === tab ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] text-gray-500 hover:bg-gray-200"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-[#1D1D1D] p-12 text-center rounded-xl">
          <Flag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-4 rounded-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight truncate mb-1">{report.subject}</h4>
                  {report.message && (
                    <p className="text-[10px] text-gray-500 line-clamp-3 whitespace-pre-line mt-1">{report.message}</p>
                  )}
                  <p className="text-[8px] text-gray-400 mt-1.5">
                    {new Date(report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={statusBadge(report.status)}>{report.status?.replace("_", " ")}</span>
              </div>

              {(report.status === "open" || report.status === "in_progress") && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1D1D1D]/5">
                  <button onClick={() => resolve(report.id)} disabled={updatingId === report.id}
                    className="py-2 bg-green-500 text-white text-[9px] font-black uppercase hover:bg-green-600 transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                    {updatingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /> Resolve</>}
                  </button>
                  <button onClick={() => dismiss(report.id)} disabled={updatingId === report.id}
                    className="py-2 border-2 border-gray-300 text-gray-500 text-[9px] font-black uppercase hover:bg-gray-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                    {updatingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3" /> Dismiss</>}
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
  const [txs, setTxs]           = useState<any[]>([]);
  const [payouts, setPayouts]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [txRes, payoutRes] = await Promise.all([
          supabase
            .from("business_transactions")
            .select("*, businesses(business_name)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("creator_payouts")
            .select("*, creator_profiles(full_name, username)")
            .order("created_at", { ascending: false })
            .limit(30),
        ]);
        setTxs(txRes.data || []);
        setPayouts(payoutRes.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="bg-white border-2 border-[#1D1D1D] p-10 flex items-center justify-center rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
        <h3 className="font-black uppercase tracking-tight text-lg mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#389C9A]" /> Business Transactions
        </h3>
        {txs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No business transactions yet</p>
        ) : (
          <div className="space-y-3">
            {txs.map(tx => (
              <div key={tx.id} className="border-2 border-[#1D1D1D]/10 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-black text-sm uppercase">{tx.businesses?.business_name || "Unknown"}</p>
                  <p className="text-[9px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()} · {tx.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg text-[#389C9A]">₦{Number(tx.amount || 0).toLocaleString()}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    tx.status === "completed" ? "bg-green-100 text-green-700" :
                    tx.status === "pending"   ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
        <h3 className="font-black uppercase tracking-tight text-lg mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#389C9A]" /> Creator Payouts
        </h3>
        {payouts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No creator payouts yet</p>
        ) : (
          <div className="space-y-3">
            {payouts.map(p => (
              <div key={p.id} className="border-2 border-[#1D1D1D]/10 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-black text-sm uppercase">{p.creator_profiles?.full_name || "Unknown"}</p>
                  <p className="text-[9px] text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg text-[#389C9A]">₦{Number(p.amount || 0).toLocaleString()}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    p.status === "completed" ? "bg-green-100 text-green-700" :
                    p.status === "pending"   ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                  }`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────

function AdminSettings({ stats, setStats }: { stats: DashboardStats; setStats: any }) {
  const [platformFee, setPlatformFee] = useState(stats.platformFee);
  const [saving, setSaving]           = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from("platform_settings").upsert({ key: "platform_fee", value: platformFee.toString() }).catch(() => {});
      setStats((p: DashboardStats) => ({ ...p, platformFee }));
      toast.success("Settings saved");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#389C9A]" /> Platform Settings
        </h4>
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Platform Fee (%)</label>
          <input type="number" value={platformFee} onChange={e => setPlatformFee(parseInt(e.target.value))}
            min="0" max="100"
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors rounded-xl" />
          <p className="text-[9px] text-gray-400 mt-1">Percentage taken from each transaction</p>
        </div>
        <button onClick={save} disabled={saving}
          className="w-full bg-[#1D1D1D] text-white px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose }: { creator: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Creator Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] rounded-xl overflow-hidden flex items-center justify-center">
              {creator.avatar_url
                ? <img src={creator.avatar_url} alt={creator.full_name} className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-gray-400" />}
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{creator.full_name || creator.username || "Unknown"}</h2>
              <p className="text-sm text-gray-500">{creator.email}</p>
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full mt-1 inline-block ${
                creator.status === "active" ? "bg-green-100 text-green-700" :
                creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
              }`}>{creator.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Joined",      value: creator.created_at ? new Date(creator.created_at).toLocaleDateString() : "—" },
              { label: "Location",    value: creator.location || "—" },
              { label: "Avg Viewers", value: creator.avg_viewers || creator.avg_concurrent || 0 },
              { label: "Rating",      value: creator.rating || "—" },
            ].map(item => (
              <div key={item.label} className="border-2 border-[#1D1D1D]/10 p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">{item.label}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Show full payment account */}
          {creator.payment_method && (
            <div className="border-2 border-[#1D1D1D]/10 p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Payment Details</p>
              <p className="text-sm font-bold">
                {creator.payment_method} – {creator.payment_account || "No account set"}
              </p>
            </div>
          )}

          {creator.bio && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest opacity-50">Bio</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{creator.bio}</p>
            </div>
          )}

          {creator.niche?.length > 0 && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest opacity-50">Niches</h4>
              <div className="flex flex-wrap gap-2">
                {creator.niche.map((n: string) => (
                  <span key={n} className="text-[8px] font-black uppercase bg-[#F8F8F8] px-2 py-1 rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}

          {creator.verification_document_url && (
            <a href={creator.verification_document_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#389C9A] text-sm font-black hover:underline">
              <Eye className="w-4 h-4" /> View Verification Document
            </a>
          )}

          <button onClick={onClose}
            className="w-full border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BusinessDetailModal({ business, onClose }: { business: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Business Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] rounded-xl overflow-hidden flex items-center justify-center">
              {business.logo_url
                ? <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
                : <Building2 className="w-8 h-8 text-gray-400" />}
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{business.business_name || "Unknown"}</h2>
              <p className="text-sm text-gray-500">{business.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Contact",  value: business.full_name || "—" },
              { label: "Phone",    value: business.phone_number || "—" },
              { label: "Industry", value: business.industry || "—" },
              { label: "Location", value: [business.city, business.country].filter(Boolean).join(", ") || "—" },
              { label: "Website",  value: business.website || "—" },
              { label: "Joined",   value: business.created_at ? new Date(business.created_at).toLocaleDateString() : "—" },
            ].map(item => (
              <div key={item.label} className="border-2 border-[#1D1D1D]/10 p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">{item.label}</p>
                <p className="text-sm font-bold truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {business.description && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest opacity-50">About</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{business.description}</p>
            </div>
          )}

          <button onClick={onClose}
            className="w-full border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default AdminDashboard;
