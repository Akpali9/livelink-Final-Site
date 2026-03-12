import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Bell,
  ArrowUpRight,
  Inbox,
  Clock,
  CheckCircle2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Wallet,
  User,
  List,
  Monitor,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  Award,
  AlertCircle,
  MessageSquare,
  HelpCircle,
  Zap,
  Shield,
  Gift,
  Target,
  AlertTriangle,
  CheckCheck,
  Loader2,
  Info,
  Trash2,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";

type NotificationType =
  | "earnings"
  | "message"
  | "confirmed"
  | "action"
  | "warning"
  | "match"
  | "announcement"
  | "offer"
  | "payment"
  | "campaign"
  | "system";

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

export function Notifications() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const role = searchParams.get("role") || "creator";
  const backPath = role === "business" ? "/business/dashboard" : "/dashboard";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const grouped = data?.map(n => ({
          ...n,
          grouping: getGrouping(n.created_at)
        })) || [];

        setNotifications(grouped);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = {
            ...payload.new,
            grouping: getGrouping(payload.new.created_at)
          } as Notification;

          setNotifications((prev) => [newNotif, ...prev]);

          toast.info(newNotif.title, {
            description: newNotif.message,
            icon: getIcon(newNotif.type),
            duration: 5000
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getGrouping = (dateString: string): "TODAY" | "YESTERDAY" | "THIS_WEEK" | "EARLIER" => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "TODAY";
    if (diffDays === 1) return "YESTERDAY";
    if (diffDays <= 7) return "THIS_WEEK";
    return "EARLIER";
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "earnings":
      case "payment":
        return <DollarSign className="w-5 h-5 text-[#389C9A]" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-[#389C9A]" />;
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />;
      case "action":
      case "offer":
        return <Zap className="w-5 h-5 text-[#FEDB71]" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "match":
        return <Target className="w-5 h-5 text-[#FEDB71]" />;
      case "campaign":
        return <Briefcase className="w-5 h-5 text-[#389C9A]" />;
      case "announcement":
        return <Bell className="w-5 h-5 text-[#1D1D1D]" />;
      case "system":
        return <Info className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case "earnings":
      case "payment":
        return "bg-[#389C9A]/10 text-[#389C9A]";
      case "message":
        return "bg-blue-500/10 text-blue-500";
      case "confirmed":
        return "bg-green-500/10 text-green-500";
      case "action":
      case "offer":
        return "bg-[#FEDB71]/10 text-[#FEDB71]";
      case "warning":
        return "bg-red-500/10 text-red-500";
      case "match":
        return "bg-purple-500/10 text-purple-500";
      case "campaign":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.data?.campaignId) {
      navigate(`/campaign/${notification.data.campaignId}`);
    } else if (notification.data?.offerId) {
      navigate(`/offers/${notification.data.offerId}`);
    } else if (notification.data?.messageId) {
      navigate(`/messages/${notification.data.messageId}`);
    } else if (notification.type === "message") {
      navigate(`/messages`);
    } else if (notification.type === "earnings") {
      navigate("/earnings");
    } else if (notification.type === "campaign") {
      navigate("/campaigns");
    }
  };

  const filteredNotifications = selectedType === "all"
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  const notificationTypes = [
    { value: "all",      label: "All",      icon: Bell },
    { value: "offer",    label: "Offers",   icon: Zap },
    { value: "message",  label: "Messages", icon: MessageSquare },
    { value: "payment",  label: "Payments", icon: DollarSign },
    { value: "campaign", label: "Campaigns",icon: Briefcase },
    { value: "system",   label: "System",   icon: Info }
  ];

  const groupedNotifications = filteredNotifications.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const groups: Array<"TODAY" | "YESTERDAY" | "THIS_WEEK" | "EARLIER"> = [
    "TODAY", "YESTERDAY", "THIS_WEEK", "EARLIER"
  ];

  const groupLabels = {
    TODAY: "Today",
    YESTERDAY: "Yesterday",
    THIS_WEEK: "This Week",
    EARLIER: "Earlier"
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Notifications" backPath={backPath} />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Notifications" backPath={backPath} />

      <main className="flex-1 max-w-[480px] mx-auto w-full">
        {/* Header Actions */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-[#1D1D1D]/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
              {unreadCount} unread
            </span>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {notificationTypes.map((type) => {
              const Icon = type.icon;
              const count = type.value === "all"
                ? notifications.length
                : notifications.filter(n => n.type === type.value).length;

              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all ${
                    selectedType === type.value
                      ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                      : "bg-white text-[#1D1D1D] border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] font-black uppercase tracking-widest">{type.label}</span>
                  {count > 0 && (
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
                      selectedType === type.value
                        ? "bg-white text-[#1D1D1D]"
                        : "bg-[#1D1D1D] text-white"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <div className="flex flex-col">
            {groups.map((group) => {
              const groupNotifications = groupedNotifications[group];
              if (!groupNotifications?.length) return null;

              return (
                <div key={group} className="flex flex-col">
                  <div className="px-6 py-4 bg-gray-50">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30 italic">
                      {groupLabels[group]}
                    </h3>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {groupNotifications.map((notification) => (
                      <motion.div
                        layout
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative flex items-start gap-4 px-6 py-5 cursor-pointer transition-all hover:bg-gray-50 border-b border-[#1D1D1D]/5 ${
                          !notification.is_read ? 'bg-[#389C9A]/5' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(notification.type)}`}>
                          {getIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                              !notification.is_read ? 'text-[#1D1D1D]' : 'text-[#1D1D1D]/70'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-[8px] font-medium text-[#1D1D1D]/30 whitespace-nowrap ml-2">
                              {new Date(notification.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#1D1D1D]/60 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.is_read && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#389C9A] rounded-full" />
                        )}

                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-32 px-10 text-center">
            <div className="w-24 h-24 bg-[#F8F8F8] rounded-2xl flex items-center justify-center mb-8 border-2 border-[#1D1D1D]/10">
              <Bell className="w-10 h-10 text-[#1D1D1D]/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4">
              All caught up!
            </h2>
            <p className="text-[11px] text-[#1D1D1D]/40 max-w-[250px] mb-8">
              No notifications to show. Check back later for updates.
            </p>
            <button
              onClick={() => navigate(backPath)}
              className="px-8 py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl"
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
