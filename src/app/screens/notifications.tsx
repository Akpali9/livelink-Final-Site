import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Target,
  DollarSign,
  Briefcase,
  Zap,
  Trash2,
  CheckCheck,
  Loader2,
  Info,
  Building2,
  Users,
  Megaphone,
  ShieldCheck,
  XCircle,
  TrendingUp,
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
  | "campaign_rejected" | "payout" | "welcome";

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  data?: any;
  created_at: string;
  grouping: "TODAY" | "YESTERDAY" | "THIS_WEEK" | "EARLIER";
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const getGrouping = (dateString: string): Notification["grouping"] => {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7)  return "THIS_WEEK";
  return "EARLIER";
};

const GROUP_LABELS = {
  TODAY: "Today", YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week", EARLIER: "Earlier",
};

const GROUP_ORDER: Notification["grouping"][] = ["TODAY", "YESTERDAY", "THIS_WEEK", "EARLIER"];

// ─────────────────────────────────────────────
// ICON + COLOR per type
// ─────────────────────────────────────────────

function NotifIcon({ type }: { type: NotificationType }) {
  const cls = "w-5 h-5";
  if (type === "earnings" || type === "payment" || type === "payout")
    return <DollarSign className={`${cls} text-[#389C9A]`} />;
  if (type === "message")
    return <MessageSquare className={`${cls} text-blue-500`} />;
  if (type === "confirmed" || type === "business_approved" || type === "creator_approved" || type === "campaign_approved")
    return <CheckCircle2 className={`${cls} text-green-500`} />;
  if (type === "business_rejected" || type === "creator_rejected" || type === "campaign_rejected" || type === "warning")
    return <XCircle className={`${cls} text-red-500`} />;
  if (type === "action" || type === "offer" || type === "new_offer")
    return <Zap className={`${cls} text-[#FEDB71]`} />;
  if (type === "campaign")
    return <Megaphone className={`${cls} text-orange-500`} />;
  if (type === "match")
    return <Target className={`${cls} text-purple-500`} />;
  if (type === "welcome")
    return <ShieldCheck className={`${cls} text-[#389C9A]`} />;
  if (type === "announcement")
    return <Bell className={`${cls} text-[#1D1D1D]`} />;
  return <Info className={`${cls} text-gray-400`} />;
}

function notifBg(type: NotificationType): string {
  if (type === "earnings" || type === "payment" || type === "payout") return "bg-[#389C9A]/10";
  if (type === "message")   return "bg-blue-500/10";
  if (type === "confirmed" || type === "business_approved" || type === "creator_approved" || type === "campaign_approved")
    return "bg-green-500/10";
  if (type === "business_rejected" || type === "creator_rejected" || type === "campaign_rejected" || type === "warning")
    return "bg-red-500/10";
  if (type === "action" || type === "offer" || type === "new_offer") return "bg-[#FEDB71]/20";
  if (type === "campaign")  return "bg-orange-500/10";
  if (type === "match")     return "bg-purple-500/10";
  return "bg-gray-100";
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Notifications() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }      = useAuth();

  const role     = searchParams.get("role") || "creator";
  const isBiz    = role === "business";
  const backPath = isBiz ? "/business/dashboard" : "/dashboard";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedType, setSelectedType]   = useState("all");

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotifications((data || []).map(n => ({ ...n, grouping: getGrouping(n.created_at) })));
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetch();

    const channel = supabase.channel("notifications_page")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const n = { ...payload.new, grouping: getGrouping(payload.new.created_at) } as Notification;
        setNotifications(prev => [n, ...prev]);
        toast.info(n.title, { description: n.message, duration: 5000 });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  const clearAll = async () => {
    if (!user || !confirm("Clear all notifications?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    toast.success("Notifications cleared");
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Deleted");
  };

  // ── Navigation on click ───────────────────────────────────────────────────

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    const d = n.data || {};

    if (isBiz) {
      // Business navigation
      if (d.campaign_id)  return navigate(`/business/campaign/overview/${d.campaign_id}`);
      if (n.type === "message" && d.conversation_id) return navigate(`/messages/${d.conversation_id}?role=business`);
      if (n.type === "message")  return navigate(`/messages?role=business`);
      if (n.type === "campaign" || n.type === "campaign_approved" || n.type === "campaign_rejected")
        return navigate(`/business/campaigns`);
      if (n.type === "payment" || n.type === "payout") return navigate(`/business/dashboard`);
      return navigate(`/business/dashboard`);
    } else {
      // Creator navigation
      if (d.campaign_id)  return navigate(`/creator/campaign/${d.campaign_id}`);
      if (d.conversation_id) return navigate(`/messages/${d.conversation_id}?role=creator`);
      if (n.type === "message")  return navigate(`/messages?role=creator`);
      if (n.type === "earnings" || n.type === "payment" || n.type === "payout")
        return navigate(`/dashboard`);
      if (n.type === "campaign" || n.type === "offer" || n.type === "new_offer")
        return navigate(`/campaigns`);
      return navigate(`/dashboard`);
    }
  };

  // ── Filter tabs ───────────────────────────────────────────────────────────

  // Business sees different tabs than creator
  const bizTabs = [
    { value: "all",               label: "All",       icon: Bell },
    { value: "campaign",          label: "Campaigns", icon: Megaphone },
    { value: "new_offer",         label: "Offers",    icon: Zap },
    { value: "message",           label: "Messages",  icon: MessageSquare },
    { value: "payment",           label: "Payments",  icon: DollarSign },
    { value: "system",            label: "System",    icon: Info },
  ];

  const creatorTabs = [
    { value: "all",     label: "All",       icon: Bell },
    { value: "offer",   label: "Offers",    icon: Zap },
    { value: "message", label: "Messages",  icon: MessageSquare },
    { value: "payment", label: "Payments",  icon: DollarSign },
    { value: "campaign",label: "Campaigns", icon: Briefcase },
    { value: "system",  label: "System",    icon: Info },
  ];

  const tabs = isBiz ? bizTabs : creatorTabs;

  const filtered = selectedType === "all"
    ? notifications
    : notifications.filter(n => {
        // Group related types under one tab
        if (selectedType === "campaign")
          return ["campaign", "campaign_approved", "campaign_rejected"].includes(n.type);
        if (selectedType === "offer")
          return ["offer", "new_offer", "action"].includes(n.type);
        if (selectedType === "new_offer")
          return ["new_offer", "offer", "action"].includes(n.type);
        if (selectedType === "payment")
          return ["payment", "earnings", "payout"].includes(n.type);
        if (selectedType === "message")
          return n.type === "message";
        return n.type === selectedType;
      });

  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />

      <main className="flex-1 max-w-[480px] mx-auto w-full">

        {/* Sticky header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-[#1D1D1D]/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </span>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll}
                  className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map(tab => {
              const Icon  = tab.icon;
              const count = tab.value === "all"
                ? notifications.length
                : notifications.filter(n => {
                    if (tab.value === "campaign") return ["campaign","campaign_approved","campaign_rejected"].includes(n.type);
                    if (tab.value === "offer" || tab.value === "new_offer") return ["offer","new_offer","action"].includes(n.type);
                    if (tab.value === "payment") return ["payment","earnings","payout"].includes(n.type);
                    return n.type === tab.value;
                  }).length;
              const active = selectedType === tab.value;

              return (
                <button key={tab.value} onClick={() => setSelectedType(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 whitespace-nowrap transition-all text-[8px] font-black uppercase tracking-widest ${
                    active
                      ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                      : "bg-white text-[#1D1D1D] border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
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

        {/* List */}
        {filtered.length > 0 ? (
          <div>
            {GROUP_ORDER.map(group => {
              const items = grouped[group];
              if (!items?.length) return null;
              return (
                <div key={group}>
                  <div className="px-6 py-3 bg-gray-50">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30 italic">
                      {GROUP_LABELS[group]}
                    </p>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {items.map(n => (
                      <motion.div
                        layout key={n.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => handleClick(n)}
                        className={`group relative flex items-start gap-4 px-6 py-5 cursor-pointer transition-all hover:bg-gray-50 border-b border-[#1D1D1D]/5 ${
                          !n.is_read ? "bg-[#389C9A]/5" : ""
                        }`}
                      >
                        {/* Icon */}
                        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${notifBg(n.type)}`}>
                          <NotifIcon type={n.type} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                              !n.is_read ? "text-[#1D1D1D]" : "text-[#1D1D1D]/70"
                            }`}>
                              {n.title}
                            </h4>
                            <span className="text-[8px] text-[#1D1D1D]/30 whitespace-nowrap ml-2 shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#1D1D1D]/60 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!n.is_read && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#389C9A] rounded-full" />
                        )}

                        {/* Delete — visible on hover */}
                        <button
                          onClick={e => deleteNotif(n.id, e)}
                          className="absolute right-3 top-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-28 px-10 text-center">
            <div className="w-24 h-24 bg-[#F8F8F8] rounded-2xl flex items-center justify-center mb-8 border-2 border-[#1D1D1D]/10">
              <Bell className="w-10 h-10 text-[#1D1D1D]/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-3">All caught up!</h2>
            <p className="text-[11px] text-[#1D1D1D]/40 max-w-[250px] mb-8">
              No {selectedType !== "all" ? selectedType : ""} notifications yet.
            </p>
            <button onClick={() => navigate(backPath)}
              className="px-8 py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl">
              Return to Dashboard
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
