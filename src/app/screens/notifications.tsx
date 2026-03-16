import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  PoundSterling as Pound,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

type NotificationType =
  | "earnings"
  | "message"
  | "confirmed"
  | "action"
  | "warning"
  | "match"
  | "announcement";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  grouping: "TODAY" | "YESTERDAY" | "THIS WEEK" | "EARLIER";
}

export function Notifications() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const backPath = role === "business" ? "/business/dashboard" : "/dashboard";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // For loading state
  const [error, setError] = useState<string | null>(null); // For error handling

  // Fetch notifications from Supabase
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null); // Clear any previous error message

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("time", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to load notifications");
    } else {
      setNotifications(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .neq("unread", false);

    if (error) console.error(error);
    else {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, unread: false }))
      );
    }
  };

  const clearAll = async () => {
    const { error } = await supabase.from("notifications").delete();
    if (error) console.error(error);
    else setNotifications([]);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("id", id);

    if (error) console.error(error);
    else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "earnings":
        return <Pound className="w-5 h-5 text-[#389C9A]" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-[#389C9A]" />;
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />;
      case "action":
        return <Clock className="w-5 h-5 text-[#FEDB71]" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-[#D2691E]" />;
      case "match":
        return <Target className="w-5 h-5 text-[#FEDB71]" />;
      case "announcement":
        return <Bell className="w-5 h-5 text-[#1D1D1D]" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // Group notifications
  const groupedNotifications = notifications.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const groups: Notification["grouping"][] = [
    "TODAY",
    "YESTERDAY",
    "THIS WEEK",
    "EARLIER"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      {/* Top Bar */}
      <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">
              Notifications
            </h1>
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

      <main className="flex-1 max-w-[480px] mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-screen">
            <p>{error}</p>
          </div>
        ) : notifications.length > 0 ? (
          <>
            {/* Unread Indicator */}
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
              {groups.map((group) => {
                const groupNotifications = groupedNotifications[group];
                if (!groupNotifications || groupNotifications.length === 0)
                  return null;

                return (
                  <div key={group} className="flex flex-col">
                    <div className="px-6 py-6 pb-2">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30 italic">
                        {group}
                      </h3>
                    </div>
                    <div className="flex flex-col">
                      <AnimatePresence mode="popLayout">
                        {groupNotifications.map((n) => (
                          <motion.div
                            layout
                            key={n.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => markAsRead(n.id)}
                            className={`flex w-full items-start gap-4 px-6 py-6 cursor-pointer relative transition-colors active:bg-[#F8F8F8] border-b border-[#1D1D1D]/5 ${
                              n.unread
                                ? "bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]"
                                : "bg-white border-l-4 border-l-transparent"
                            }`}
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#1D1D1D]/10 flex items-center justify-center bg-white">
                              {getIcon(n.type)}
                            </div>

                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex justify-between items-start mb-1">
                                <h4
                                  className={`text-sm font-black uppercase tracking-tight leading-none truncate ${
                                    n.unread ? "text-[#1D1D1D]" : "text-[#1D1D1D]/70"
                                  }`}
                                >
                                  {n.title}
                                </h4>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/30 whitespace-nowrap ml-2 italic">
                                  {new Date(n.time).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] font-medium text-[#1D1D1D]/50 truncate italic">
                                {n.detail}
                              </p>
                            </div>

                            {n.unread && (
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#389C9A] rounded-full" />
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
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
              onClick={() => navigate("/dashboard")}
              className="mt-12 px-8 py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all italic active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}