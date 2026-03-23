import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Bell, MessageSquare, CheckCircle2, AlertTriangle, DollarSign,
  Briefcase, Zap, Trash2, CheckCheck, Loader2, Info, Users,
  Megaphone, ShieldCheck, XCircle, Mail, CreditCard, RefreshCw, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type NotificationType =
  | "earnings" | "message" | "confirmed" | "action" | "warning"
  | "match" | "announcement" | "offer" | "payment" | "campaign"
  | "system" | "new_offer" | "business_approved" | "business_rejected"
  | "creator_approved" | "creator_rejected" | "campaign_approved"
  | "campaign_rejected" | "payout" | "welcome" | "campaign_invite"
  | "new_application";

type Grouping = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "EARLIER";

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  data?: any;
  created_at: string;
  grouping: Grouping;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getGrouping(dateString: string): Grouping {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7)  return "THIS_WEEK";
  return "EARLIER";
}

const GROUP_LABELS: Record<Grouping, string> = {
  TODAY: "Today", YESTERDAY: "Yesterday", THIS_WEEK: "This Week", EARLIER: "Earlier",
};
const GROUP_ORDER: Grouping[] = ["TODAY", "YESTERDAY", "THIS_WEEK", "EARLIER"];

function formatTime(dateString: string): string {
  const date  = new Date(dateString);
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// ─────────────────────────────────────────────
// ICON MAP
// ─────────────────────────────────────────────

const ICON_MAP: Record<string, { icon: React.ReactNode; bg: string }> = {
  earnings:          { icon: <DollarSign  className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  payment:           { icon: <CreditCard  className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  payout:            { icon: <DollarSign  className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  message:           { icon: <MessageSquare className="w-5 h-5 text-blue-500" />,  bg: "bg-blue-100"   },
  confirmed:         { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />, bg: "bg-green-100"  },
  business_approved: { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />, bg: "bg-green-100"  },
  creator_approved:  { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />, bg: "bg-green-100"  },
  campaign_approved: { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />, bg: "bg-green-100"  },
  business_rejected: { icon: <XCircle       className="w-5 h-5 text-red-500" />,   bg: "bg-red-100"    },
  creator_rejected:  { icon: <XCircle       className="w-5 h-5 text-red-500" />,   bg: "bg-red-100"    },
  campaign_rejected: { icon: <XCircle       className="w-5 h-5 text-red-500" />,   bg: "bg-red-100"    },
  warning:           { icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,bg: "bg-orange-100" },
  action:            { icon: <Zap           className="w-5 h-5 text-yellow-600" />,bg: "bg-yellow-100" },
  offer:             { icon: <Zap           className="w-5 h-5 text-yellow-600" />,bg: "bg-yellow-100" },
  new_offer:         { icon: <Zap           className="w-5 h-5 text-yellow-600" />,bg: "bg-yellow-100" },
  new_application:   { icon: <Users         className="w-5 h-5 text-purple-500" />,bg: "bg-purple-100" },
  campaign:          { icon: <Megaphone     className="w-5 h-5 text-purple-500" />,bg: "bg-purple-100" },
  campaign_invite:   { icon: <Mail          className="w-5 h-5 text-purple-500" />,bg: "bg-purple-100" },
  match:             { icon: <Target        className="w-5 h-5 text-indigo-500" />,bg: "bg-indigo-100" },
  welcome:           { icon: <ShieldCheck   className="w-5 h-5 text-teal-500" />,  bg: "bg-teal-100"   },
  announcement:      { icon: <Bell          className="w-5 h-5 text-gray-500" />,  bg: "bg-gray-100"   },
  system:            { icon: <Info          className="w-5 h-5 text-gray-400" />,  bg: "bg-gray-100"   },
};
function getIconData(type: string) {
  return ICON_MAP[type] || { icon: <Bell className="w-5 h-5 text-gray-400" />, bg: "bg-gray-100" };
}

// ─────────────────────────────────────────────
// TABS CONFIG
// ─────────────────────────────────────────────

const BIZ_TABS = [
  { value: "all",          label: "All",         icon: Bell,          types: [] },
  { value: "campaign",     label: "Campaigns",   icon: Megaphone,     types: ["campaign", "campaign_approved", "campaign_rejected", "campaign_invite"] },
  { value: "offer",        label: "Offers",      icon: Zap,           types: ["offer", "new_offer", "action"] },
  { value: "application",  label: "Applications",icon: Users,         types: ["new_application"] },
  { value: "message",      label: "Messages",    icon: MessageSquare, types: ["message"] },
  { value: "payment",      label: "Payments",    icon: DollarSign,    types: ["payment", "earnings", "payout"] },
  { value: "system",       label: "System",      icon: Info,          types: ["system", "announcement", "welcome"] },
];

const CREATOR_TABS = [
  { value: "all",     label: "All",      icon: Bell,          types: [] },
  { value: "offer",   label: "Offers",   icon: Zap,           types: ["offer", "new_offer", "action"] },
  { value: "message", label: "Messages", icon: MessageSquare, types: ["message"] },
  { value: "payment", label: "Payments", icon: DollarSign,    types: ["payment", "earnings", "payout"] },
  { value: "campaign",label: "Campaigns",icon: Briefcase,     types: ["campaign", "campaign_approved", "campaign_rejected", "campaign_invite"] },
  { value: "system",  label: "System",   icon: Info,          types: ["system", "announcement", "welcome"] },
];

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Notifications() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const role     = searchParams.get("role") || "creator";
  const isBiz    = role === "business";
  const backPath = isBiz ? "/business/dashboard" : "/dashboard";
  const tabs     = isBiz ? BIZ_TABS : CREATOR_TABS;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedType, setSelectedType]   = useState("all");
  const [isDeleting, setIsDeleting]       = useState<string | null>(null);

  // ─── FETCH ──────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (showToast = false) => {
    if (!user) return;
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNotifications((data || []).map((n) => ({
        ...n,
        grouping: getGrouping(n.created_at),
        data: n.data || {},
      })));
      if (showToast) toast.success("Notifications refreshed");
    } catch {
      if (showToast) toast.error("Failed to refresh");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // ─── REALTIME ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = {
          ...payload.new, grouping: getGrouping(payload.new.created_at), data: payload.new.data || {},
        } as Notification;
        setNotifications((prev) => [n, ...prev]);
        if (!n.is_read) toast.info(n.title, { description: n.message, duration: 4000 });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) =>
          prev.map((n) => n.id === payload.new.id
            ? { ...n, ...payload.new, grouping: getGrouping(payload.new.created_at) }
            : n)
        );
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  // ─── ACTIONS ────────────────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user || notifications.every((n) => n.is_read)) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  // Toast-based confirm instead of window.confirm
  const clearAll = () => {
    if (!user) return;
    toast("Clear all notifications?", {
      duration: 8000,
      action: {
        label: "Clear all",
        onClick: async () => {
          await supabase.from("notifications").delete().eq("user_id", user.id);
          setNotifications([]);
          toast.success("All notifications cleared");
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(id);
    try {
      await supabase.from("notifications").delete().eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  // ─── NAVIGATION ON CLICK — same routing table as app-header ─────────────

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    const d = n.data || {};
    const t = n.type || "";

    if (isBiz) {
      if (d.conversation_id)        return navigate(`/messages/${d.conversation_id}?role=business`);
      if (t === "message")          return navigate(`/messages?role=business`);
      if (d.campaign_id && (t.includes("campaign") || t === "new_application"))
                                    return navigate(`/business/campaign/overview/${d.campaign_id}`);
      if (t === "new_application")  return navigate("/business/campaigns");
      if (t.includes("campaign"))   return navigate("/business/campaigns");
      if (t.includes("payment") || t === "payout") return navigate("/business/dashboard");
      if (t.includes("offer") || t === "new_offer") return navigate("/business/campaigns");
      return navigate("/business/dashboard");
    } else {
      if (d.conversation_id)        return navigate(`/messages/${d.conversation_id}?role=creator`);
      if (t === "message")          return navigate(`/messages?role=creator`);
      if (d.campaign_id)            return navigate(`/campaigns`);
      if (t.includes("campaign") || t === "new_offer" || t.includes("offer"))
                                    return navigate("/campaigns");
      if (t.includes("payment") || t === "payout" || t.includes("earning"))
                                    return navigate("/dashboard");
      if (t.includes("approved") || t.includes("rejected"))
                                    return navigate("/dashboard");
      return navigate("/dashboard");
    }
  };

  // ─── FILTER + GROUP ──────────────────────────────────────────────────────

  const filtered = selectedType === "all"
    ? notifications
    : notifications.filter((n) => {
        const tab = tabs.find((t) => t.value === selectedType);
        return tab?.types.includes(n.type);
      });

  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─── LOADING ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-20 max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />

      <main className="flex-1">

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-[#1D1D1D]/10 px-5 py-3">

          {/* Status row */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
              <span className="text-[8px] text-[#1D1D1D]/30">
                · {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors disabled:opacity-30"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Updating…" : "Refresh"}
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-400 hover:underline"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => {
              const Icon  = tab.icon;
              const count = tab.value === "all"
                ? notifications.length
                : notifications.filter((n) => tab.types.includes(n.type)).length;
              const active = selectedType === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedType(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 whitespace-nowrap transition-all text-[8px] font-black uppercase tracking-widest shrink-0 ${
                    active
                      ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                      : "bg-white text-[#1D1D1D]/60 border-[#E8E8E8] hover:border-[#1D1D1D]/30"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? "bg-white text-[#1D1D1D]" : "bg-[#1D1D1D] text-white"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Notification list ── */}
        {filtered.length > 0 ? (
          <div>
            {GROUP_ORDER.map((group) => {
              const items = grouped[group];
              if (!items?.length) return null;
              return (
                <div key={group}>
                  {/* Group header */}
                  <div className="px-5 py-2.5 bg-[#F8F8F8] border-b border-[#1D1D1D]/5">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30">
                      {GROUP_LABELS[group]}
                    </p>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {items.map((n) => {
                      const { icon, bg } = getIconData(n.type);
                      return (
                        <motion.div
                          layout key={n.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => handleClick(n)}
                          className={`group relative flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors border-b border-[#1D1D1D]/5 hover:bg-[#F8F8F8] ${
                            !n.is_read ? "bg-[#389C9A]/5" : "bg-white"
                          }`}
                        >
                          {/* Icon */}
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                            {icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-8">
                            <div className="flex justify-between items-start mb-0.5">
                              <h4 className={`text-[11px] font-black uppercase tracking-wide leading-tight ${
                                !n.is_read ? "text-[#1D1D1D]" : "text-[#1D1D1D]/60"
                              }`}>
                                {n.title}
                              </h4>
                              <span className="text-[8px] text-[#1D1D1D]/30 whitespace-nowrap ml-2 shrink-0">
                                {formatTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#1D1D1D]/50 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            {n.data?.amount && (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-[8px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <DollarSign className="w-2.5 h-2.5" />
                                {n.data.amount.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Unread dot */}
                          {!n.is_read && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#389C9A] rounded-full shrink-0" />
                          )}

                          {/* Delete — shows on hover */}
                          <button
                            onClick={(e) => deleteOne(n.id, e)}
                            disabled={isDeleting === n.id}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                          >
                            {isDeleting === n.id
                              ? <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                              : <Trash2 className="w-3 h-3 text-red-400" />}
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center pt-24 px-10 text-center">
            <div className="w-20 h-20 bg-[#F8F8F8] rounded-2xl flex items-center justify-center mb-6 border-2 border-[#1D1D1D]/10">
              <Bell className="w-9 h-9 text-[#1D1D1D]/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">All caught up!</h2>
            <p className="text-[11px] text-[#1D1D1D]/40 max-w-[220px] mb-8">
              {selectedType !== "all"
                ? `No ${selectedType} notifications yet.`
                : "Notifications will appear here when you receive them."}
            </p>
            <button
              onClick={() => navigate(backPath)}
              className="px-6 py-3 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
