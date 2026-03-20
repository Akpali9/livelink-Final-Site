import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  MessageSquare, Bell, User, ArrowLeft, Settings, LogOut,
  Home, CheckCircle, AlertCircle, Calendar, DollarSign,
  Briefcase, X, Mail, Send, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { ImageWithFallback } from "./ImageWithFallback";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  showLogo?: boolean;
  userType?: "creator" | "business";
  subtitle?: string;
  showHome?: boolean;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

interface ConversationPreview {
  id: string;
  other_participant_name: string;
  other_participant_avatar: string | null;
  last_message: string;
  last_message_time: string;
  is_read: boolean;
  participant_id: string;
}

export function AppHeader({
  title,
  showBack = false,
  backPath,
  showLogo = false,
  userType: userTypeProp,
  subtitle,
  showHome = false
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const detectedType = user?.user_metadata?.user_type || user?.user_metadata?.role;
  const userType: "creator" | "business" =
    userTypeProp ?? (detectedType === "business" ? "business" : "creator");
  const isBusiness = userType === "business";

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationPreview[]>([]);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // User data + profile IDs
  useEffect(() => {
    if (!user) return;

    const meta = user.user_metadata || {};
    if (isBusiness) {
      setUserName(meta.business_name || meta.full_name || user.email?.split("@")[0] || "Business");
    } else {
      setUserName(meta.full_name || user.email?.split("@")[0] || "User");
    }
    setUserAvatar(meta.avatar_url || meta.logo_url || null);

    const getProfileId = async () => {
      if (isBusiness) {
        const { data } = await supabase
          .from("businesses")
          .select("id, logo_url, business_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setBusinessId(data.id);
          if (!meta.avatar_url && data.logo_url) setUserAvatar(data.logo_url);
          if (!userName && data.business_name) setUserName(data.business_name);
        }
      } else {
        // ✅ FIXED: was "creator_profiles", correct table is "creators"
        const { data } = await supabase
          .from("creators")
          .select("id, avatar_url, full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setCreatorId(data.id);
          if (!meta.avatar_url && data.avatar_url) setUserAvatar(data.avatar_url);
        }
      }
    };
    getProfileId();
  }, [user, isBusiness]);

  // Fetch notifications + conversations
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        setUnreadNotifications(notifCount || 0);

        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (notifData) setNotifications(notifData);

        await fetchConversations();
      } catch (err) {
        console.error("Header data error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const notifSub = supabase
      .channel("header_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setUnreadNotifications((prev) => prev + 1);
          setNotifications((prev) => [n, ...prev].slice(0, 5));
          const type = n.type || "";
          if (type.includes("approved")) {
            toast.success(n.title, { description: n.message, icon: "✅" });
          } else if (type.includes("offer") || type === "new_offer") {
            toast.success(n.title, { description: n.message, icon: "🎯" });
          } else if (type.includes("payment") || type === "payout") {
            toast.success(n.title, { description: n.message, icon: "💰" });
          } else if (type.includes("rejected")) {
            toast.error(n.title, { description: n.message });
          } else {
            toast.info(n.title, { description: n.message, icon: "🔔" });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
            .then(({ count }) => setUnreadNotifications(count || 0));
        }
      )
      .subscribe();

    const msgSub = supabase
      .channel("header_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async () => {
        await fetchConversations();
      })
      .subscribe();

    return () => {
      notifSub.unsubscribe();
      msgSub.unsubscribe();
    };
  }, [isAuthenticated, user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(5);

      if (!convs) return;

      const previews = await Promise.all(
        convs.map(async (conv) => {
          const otherId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
          const otherType = conv.participant1_id === user.id ? conv.participant2_type : conv.participant1_type;

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("sender_id", otherId)
            .eq("is_read", false);

          let name = "Unknown";
          let avatar: string | null = null;

          if (otherType === "creator") {
            // ✅ FIXED: was "creator_profiles", correct table is "creators"
            const { data: p } = await supabase
              .from("creators")
              .select("full_name, avatar_url")
              .eq("user_id", otherId)
              .maybeSingle();
            if (p) { name = p.full_name || "Creator"; avatar = p.avatar_url || null; }
          } else if (otherType === "business") {
            const { data: p } = await supabase
              .from("businesses")
              .select("business_name, logo_url")
              .eq("user_id", otherId)
              .maybeSingle();
            if (p) { name = p.business_name || "Business"; avatar = p.logo_url || null; }
          } else if (otherType === "admin") {
            name = "LiveLink Support";
          }

          return {
            id: conv.id,
            other_participant_name: name,
            other_participant_avatar: avatar,
            last_message: lastMsg?.content || "No messages yet",
            last_message_time: lastMsg?.created_at || conv.last_message_at || conv.created_at,
            is_read: (count || 0) === 0,
            participant_id: otherId,
          };
        })
      );

      setRecentConversations(previews);
      setUnreadMessages(previews.filter((c) => !c.is_read).length);
    } catch (err) {
      console.error("fetchConversations error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setUnreadNotifications((prev) => Math.max(0, prev - 1));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setUnreadNotifications(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("offer") || type === "new_offer") return <Briefcase className="w-4 h-4 text-[#389C9A]" />;
    if (type.includes("campaign")) return <Calendar className="w-4 h-4 text-[#FEDB71]" />;
    if (type.includes("payment") || type === "payout") return <DollarSign className="w-4 h-4 text-green-500" />;
    if (type.includes("approved")) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (type.includes("rejected")) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const settingsPath = isBusiness ? "/business/settings" : "/settings";
  const profilePath = isBusiness ? "/business/profile" : `/profile/${creatorId || "me"}`;
  const messagesPath = isBusiness ? "/messages?role=business" : "/messages?role=creator";
  const notificationsPath = isBusiness ? "/notifications?role=business" : "/notifications?role=creator";
  const dashboardPath = isBusiness ? "/business/dashboard" : "/dashboard";

  const isHome = location.pathname === "/";
  const isMessages = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages && isAuthenticated;

  return (
    <header className="px-5 pt-6 pb-4 border-b-2 border-[#1D1D1D]/10 sticky top-0 bg-white/95 left-0 right-0 backdrop-blur-sm z-50 ">
      <div className="flex justify-between items-center max-w-[480px] mx-auto gap-4">

        {/* ── Left side ── */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={() => (backPath ? navigate(backPath) : navigate(-1))}
              className="p-2 -ml-2 hover:bg-[#F0F0F0] active:bg-[#E8E8E8] transition-colors rounded-lg shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showHome && (
            <button
              onClick={() => navigate(dashboardPath)}
              className="p-2 -ml-2 hover:bg-[#F0F0F0] transition-colors rounded-lg shrink-0"
              aria-label="Dashboard"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          {showLogo && (
            <div
              className="flex flex-col cursor-pointer shrink-0"
              onClick={() => (isAuthenticated ? navigate(dashboardPath) : navigate("/"))}
            >
              <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <div className="w-6 h-6 bg-[#1D1D1D] flex items-center justify-center text-white text-[8px] italic rounded-lg shrink-0">
                  LL
                </div>
                LiveLink
              </h1>
              {subtitle && (
                <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-40 mt-0.5 pl-8">
                  {subtitle}
                </span>
              )}
            </div>
          )}
          {title && !showLogo && (
            <h1 className="text-lg font-black uppercase tracking-tighter italic truncate">{title}</h1>
          )}
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-1 shrink-0">
          {showActions && (
            <>
              {/* ── Messages ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-2 hover:bg-[#F0F0F0] transition-colors rounded-lg"
                  aria-label="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white px-1">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showMessages && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMessages(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-[#1D1D1D] shadow-2xl z-50 rounded-xl overflow-hidden"
                      >
                        {/* Header */}
                        <div className="px-4 py-3 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#389C9A]" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Messages</span>
                          </div>
                          {unreadMessages > 0 && (
                            <span className="bg-[#389C9A] text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                              {unreadMessages} unread
                            </span>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[360px] overflow-y-auto">
                          {recentConversations.length === 0 ? (
                            <div className="py-10 flex flex-col items-center gap-3">
                              <Send className="w-8 h-8 opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
                              <p className="text-[8px] opacity-30">
                                {isBusiness ? "Start a conversation with a creator" : "Start a conversation with a business"}
                              </p>
                            </div>
                          ) : (
                            recentConversations.map((conv) => (
                              <Link
                                key={conv.id}
                                to={`/messages/${conv.id}?role=${userType}`}
                                onClick={() => setShowMessages(false)}
                                className={`flex items-start gap-3 px-4 py-3 border-b border-[#1D1D1D]/8 hover:bg-[#F8F8F8] transition-colors ${
                                  !conv.is_read ? "bg-[#389C9A]/5" : ""
                                }`}
                              >
                                {conv.other_participant_avatar ? (
                                  <ImageWithFallback
                                    src={conv.other_participant_avatar}
                                    className="w-9 h-9 rounded-full border-2 border-[#1D1D1D]/10 object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#F0F0F0] border-2 border-[#1D1D1D]/10 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 opacity-40" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline mb-0.5">
                                    <p className="text-[11px] font-black uppercase tracking-wide truncate">
                                      {conv.other_participant_name}
                                    </p>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 shrink-0">
                                      {formatTimestamp(conv.last_message_time)}
                                    </span>
                                  </div>
                                  <p className="text-[9px] opacity-50 truncate">{conv.last_message}</p>
                                </div>
                                {!conv.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-[#389C9A] shrink-0 mt-1.5" />
                                )}
                              </Link>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        {recentConversations.length > 0 && (
                          <div className="px-4 py-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8]">
                            <Link
                              to={messagesPath}
                              onClick={() => setShowMessages(false)}
                              className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                            >
                              View All Messages →
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Notifications ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-2 hover:bg-[#F0F0F0] transition-colors rounded-lg"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black flex items-center justify-center border border-[#1D1D1D]/30 rounded-full px-1">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-[#1D1D1D] shadow-2xl z-50 rounded-xl overflow-hidden"
                      >
                        {/* Header */}
                        <div className="px-4 py-3 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FEDB71]" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Notifications</span>
                          </div>
                          {unreadNotifications > 0 && (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                            >
                              Mark All Read
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[360px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-10 flex flex-col items-center gap-3">
                              <Bell className="w-8 h-8 opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => markNotificationAsRead(n.id)}
                                className={`flex items-start gap-3 px-4 py-3 border-b border-[#1D1D1D]/8 hover:bg-[#F8F8F8] cursor-pointer transition-colors ${
                                  !n.is_read ? "bg-[#FEDB71]/5" : ""
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline mb-0.5">
                                    <p className="text-[11px] font-black uppercase tracking-wide truncate">{n.title}</p>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 shrink-0">
                                      {formatTimestamp(n.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-[9px] opacity-50 line-clamp-2 break-words">{n.message}</p>
                                </div>
                                {!n.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-[#FEDB71] shrink-0 mt-1.5" />
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                          <div className="px-4 py-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8]">
                            <Link
                              to={notificationsPath}
                              onClick={() => setShowNotifications(false)}
                              className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                            >
                              View All Notifications →
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* ── Avatar / Profile menu ── */}
          <div className="relative ml-1">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                  setShowMessages(false);
                } else {
                  navigate("/login/portal");
                }
              }}
              className="w-9 h-9 rounded-full border-2 border-[#1D1D1D] overflow-hidden bg-white flex items-center justify-center active:scale-95 transition-transform hover:border-[#389C9A]"
              aria-label="Profile menu"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && isAuthenticated && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[#1D1D1D] shadow-2xl z-50 rounded-xl overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                      <div className="flex items-center gap-3 mb-3">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#F0F0F0] border-2 border-[#1D1D1D]/10 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide truncate">{userName}</p>
                          <p className="text-[9px] opacity-40 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-[#389C9A]" />
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                          {isBusiness ? "Business Account" : "Creator Account"}
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      {[
                        { to: profilePath, icon: <User className="w-3.5 h-3.5 text-[#389C9A]" />, label: isBusiness ? "Business Profile" : "Profile" },
                        { to: settingsPath, icon: <Settings className="w-3.5 h-3.5 text-[#389C9A]" />, label: "Settings" },
                        { to: dashboardPath, icon: isBusiness ? <Briefcase className="w-3.5 h-3.5 text-[#389C9A]" /> : <Home className="w-3.5 h-3.5 text-[#389C9A]" />, label: "Dashboard" },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}

                      <div className="my-1 border-t border-[#1D1D1D]/10" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
