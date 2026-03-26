import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Bell, MessageSquare, CheckCircle2, AlertTriangle, DollarSign,
  Briefcase, Zap, Trash2, CheckCheck, Loader2, Info, Users,
  Megaphone, ShieldCheck, XCircle, Mail, CreditCard, RefreshCw, Target,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { BottomNav } from "../components/bottom-nav";

// ─────────────────────────────────────────────
// TYPES (unchanged)
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
// HELPERS (unchanged)
// ─────────────────────────────────────────────

function getGrouping(dateString: string): Grouping {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7)  return "THIS_WEEK";
  return "EARLIER";
}

const GROUP_LABELS: Record<Grouping, string> = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  EARLIER: "Earlier",
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
// ICON MAP (unchanged)
// ─────────────────────────────────────────────

const ICON_MAP: Record<string, { icon: React.ReactNode; bg: string }> = {
  earnings:          { icon: <DollarSign   className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  payment:           { icon: <CreditCard   className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  payout:            { icon: <DollarSign   className="w-5 h-5 text-green-600" />,   bg: "bg-green-100"  },
  message:           { icon: <MessageSquare className="w-5 h-5 text-blue-500" />,   bg: "bg-blue-100"   },
  confirmed:         { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />,  bg: "bg-green-100"  },
  business_approved: { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />,  bg: "bg-green-100"  },
  creator_approved:  { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />,  bg: "bg-green-100"  },
  campaign_approved: { icon: <CheckCircle2  className="w-5 h-5 text-green-500" />,  bg: "bg-green-100"  },
  business_rejected: { icon: <XCircle       className="w-5 h-5 text-red-500" />,    bg: "bg-red-100"    },
  creator_rejected:  { icon: <XCircle       className="w-5 h-5 text-red-500" />,    bg: "bg-red-100"    },
  campaign_rejected: { icon: <XCircle       className="w-5 h-5 text-red-500" />,    bg: "bg-red-100"    },
  warning:           { icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, bg: "bg-orange-100" },
  action:            { icon: <Zap           className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100" },
  offer:             { icon: <Zap           className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100" },
  new_offer:         { icon: <Zap           className="w-5 h-5 text-yellow-600" />, bg: "bg-yellow-100" },
  new_application:   { icon: <Users         className="w-5 h-5 text-purple-500" />, bg: "bg-purple-100" },
  campaign:          { icon: <Megaphone     className="w-5 h-5 text-purple-500" />, bg: "bg-purple-100" },
  campaign_invite:   { icon: <Mail          className="w-5 h-5 text-purple-500" />, bg: "bg-purple-100" },
  match:             { icon: <Target        className="w-5 h-5 text-indigo-500" />, bg: "bg-indigo-100" },
  welcome:           { icon: <ShieldCheck   className="w-5 h-5 text-teal-500" />,   bg: "bg-teal-100"   },
  announcement:      { icon: <Bell          className="w-5 h-5 text-gray-500" />,   bg: "bg-gray-100"   },
  system:            { icon: <Info          className="w-5 h-5 text-gray-400" />,   bg: "bg-gray-100"   },
};

function getIconData(type: string) {
  return ICON_MAP[type] || { icon: <Bell className="w-5 h-5 text-gray-400" />, bg: "bg-gray-100" };
}

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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [isDeleting, setIsDeleting]       = useState<string | null>(null);

  // ─── FETCH ──────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (showToast = false) => {
    if (!user) return;
    if (showToast) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("notifications").select("*")
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
          ...payload.new,
          grouping: getGrouping(payload.new.created_at),
          data: payload.new.data || {},
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

  // Toast-based confirm — no window.confirm
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

  // ─── NAVIGATION ON CLICK ─────────────────────────────────────────────────

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

  // ─── GROUP NOTIFICATIONS (no filters, show all) ─────────────────────────
  const grouped = notifications.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─── LOADING ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
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
      {/* Header (matching target UI) */}
      <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] italic hover:opacity-70 active:scale-95 transition-all"
            >
              Mark All Read
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {notifications.length > 0 ? (
          <>
            {/* Unread & Clear All row */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#1D1D1D]/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                {unreadCount} unread
              </span>
              <button
                onClick={clearAll}
                className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors italic"
              >
                Clear All
              </button>
            </div>

            {/* Notification Groups */}
            <div className="flex flex-col">
              {GROUP_ORDER.map((group) => {
                const groupItems = grouped[group];
                if (!groupItems || groupItems.length === 0) return null;

                return (
                  <div key={group} className="flex flex-col">
                    <div className="px-6 py-6 pb-2">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30 italic">
                        {GROUP_LABELS[group]}
                      </h3>
                    </div>
                    <div className="flex flex-col">
                      <AnimatePresence mode="popLayout">
                        {groupItems.map((n) => {
                          const { icon, bg } = getIconData(n.type);
                          return (
                            <motion.div
                              layout
                              key={n.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              onClick={() => handleClick(n)}
                              className={`flex w-full items-start gap-4 px-6 py-6 cursor-pointer relative transition-colors active:bg-[#F8F8F8] border-b border-[#1D1D1D]/5 ${
                                !n.is_read
                                  ? "bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]"
                                  : "bg-white border-l-4 border-l-transparent"
                              }`}
                            >
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-12 h-12 rounded-full border border-[#1D1D1D]/10 flex items-center justify-center bg-white ${bg}`}>
                                {icon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={`text-sm font-black uppercase tracking-tight leading-none truncate ${
                                    !n.is_read ? 'text-[#1D1D1D]' : 'text-[#1D1D1D]/70'
                                  }`}>
                                    {n.title}
                                  </h4>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/30 whitespace-nowrap ml-2 italic">
                                    {formatTime(n.created_at)}
                                  </span>
                                </div>
                                <p className="text-[10px] font-medium text-[#1D1D1D]/50 truncate italic">
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
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                  <div className="w-2 h-2 bg-[#389C9A] rounded-full" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Empty State (matching target UI) */
          <div className="flex flex-col items-center justify-center pt-32 px-10 text-center">
            <div className="w-24 h-24 rounded-none border-2 border-[#1D1D1D]/10 flex items-center justify-center mb-8">
              <Bell className="w-10 h-10 text-[#1D1D1D]/10 stroke-[1.5]" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4 leading-none">
              You're all caught up
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic max-w-[280px]">
              When businesses send offers, payments process or campaigns update you will see it here.
            </p>
            <button
              onClick={() => navigate(backPath)}
              className="mt-12 px-8 py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all italic active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}