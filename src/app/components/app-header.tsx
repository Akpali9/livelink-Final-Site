import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  MessageSquare, Bell, User, ArrowLeft, Settings, LogOut,
  Home, CheckCircle, AlertCircle, Calendar, DollarSign,
  Briefcase, Mail, Send, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { ImageWithFallback } from "./ImageWithFallback";
import { useProfileType } from "../hooks/useProfileType";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  showLogo?: boolean;
  userType?: "creator" | "business" | "admin";
  subtitle?: string;
  showHome?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "offer" | "campaign" | "payment" | "system";
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface RecentConversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business" | "admin";
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// Resolve any user's display info regardless of their role
async function resolveParticipant(userId: string): Promise<{
  name: string;
  avatar: string;
  type: "creator" | "business" | "admin";
}> {
  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (admin) return { name: admin.full_name || "Admin", avatar: admin.avatar_url || "", type: "admin" };

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("full_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (creator) return { name: creator.full_name || "Creator", avatar: creator.avatar_url || "", type: "creator" };

  const { data: business } = await supabase
    .from("businesses")
    .select("business_name, logo_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (business) return { name: business.business_name || "Business", avatar: business.logo_url || "", type: "business" };

  return { name: "Unknown", avatar: "", type: "creator" };
}

export function AppHeader({
  title, showBack = false, backPath, showLogo = false,
  userType: userTypeProp, subtitle, showHome = false
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { profileType: detectedType } = useProfileType();
  const userType = userTypeProp ?? detectedType ?? "creator";

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const isBusiness = userType === "business";
  const isAdmin    = userType === "admin";

  const settingsPath      = isBusiness ? "/business/settings"           : "/settings";
  const profilePath       = isBusiness ? "/business/profile"            : isAdmin ? "/admin" : "/profile/me";
  const messagesPath      = isBusiness ? "/messages?role=business"      : isAdmin ? "/messages?role=admin" : "/messages?role=creator";
  const notificationsPath = isBusiness ? "/notifications?role=business" : isAdmin ? "/notifications?role=admin" : "/notifications?role=creator";
  const dashboardPath     = isBusiness ? "/business/dashboard"          : isAdmin ? "/admin" : "/dashboard";

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      setUserAvatar(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // ── Fetch notifications ────────────────────────────────────
  const fetchNotifications = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadNotifications(count || 0);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setNotifications(data);
  };

  // ── Fetch conversations (works for all user types) ─────────
  const fetchRecentConversations = async () => {
    if (!user) return;

    const { data: convs } = await supabase
      .from("conversations")
      .select(`*, messages:messages(content, created_at, sender_id, is_read)`)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(5);

    if (!convs) return;

    let totalUnread = 0;
    const formatted = await Promise.all(
      convs.map(async (conv: any) => {
        const otherId =
          conv.participant1_id === user.id
            ? conv.participant2_id
            : conv.participant1_id;

        const participant = await resolveParticipant(otherId);

        const msgs = conv.messages || [];
        const lastMsg = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m: any) => m.sender_id !== user.id && !m.is_read
        ).length;
        totalUnread += unread;

        return {
          id: conv.id,
          participant_id: otherId,
          participant_name: participant.name,
          participant_avatar: participant.avatar,
          participant_type: participant.type,
          last_message: lastMsg?.content || "",
          last_message_time: lastMsg?.created_at || conv.created_at,
          unread_count: unread,
        } as RecentConversation;
      })
    );

    setRecentConversations(formatted);
    setUnreadMessages(totalUnread);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications();
    fetchRecentConversations();

    // Realtime: notifications
    const notifSub = supabase
      .channel("header_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setUnreadNotifications((p) => p + 1);
          setNotifications((p) => [n, ...p].slice(0, 5));
          if (n.type === "offer") {
            toast.success(n.title, { description: n.message, icon: "🎯", action: { label: "View", onClick: () => navigate("/offers") } });
          } else if (n.type === "payment") {
            toast.success(n.title, { description: n.message, icon: "💰", action: { label: "View", onClick: () => navigate("/earnings") } });
          } else {
            toast.info(n.title, { description: n.message, icon: "🔔" });
          }
        }
      )
      .subscribe();

    // Realtime: new messages — refresh conversation list
    const msgSub = supabase
      .channel("header_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchRecentConversations()
      )
      .subscribe();

    return () => {
      notifSub.unsubscribe();
      msgSub.unsubscribe();
    };
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowMessages(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setUnreadNotifications((p) => Math.max(0, p - 1));
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setUnreadNotifications(0);
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offer":    return <Briefcase className="w-4 h-4 text-[#389C9A]" />;
      case "campaign": return <Calendar className="w-4 h-4 text-[#FEDB71]" />;
      case "payment":  return <DollarSign className="w-4 h-4 text-green-500" />;
      default:         return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)   return "Just now";
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7)   return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const participantAvatarEl = (conv: RecentConversation, size = "sm") => {
    const dim = size === "sm" ? "w-10 h-10" : "w-8 h-8";
    if (conv.participant_type === "admin") {
      return (
        <div className={`${dim} bg-purple-600 flex items-center justify-center flex-shrink-0 rounded-lg`}>
          <Shield className="w-4 h-4 text-white" />
        </div>
      );
    }
    return (
      <div className={`${dim} border-2 border-[#1D1D1D]/10 overflow-hidden flex-shrink-0`}>
        {conv.participant_avatar ? (
          <ImageWithFallback src={conv.participant_avatar} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#1D1D1D]/5 flex items-center justify-center">
            <User className="w-4 h-4 opacity-40" />
          </div>
        )}
      </div>
    );
  };

  const typeBadgeColor = (type: string) => {
    if (type === "admin")    return "text-purple-600";
    if (type === "business") return "text-[#389C9A]";
    return "text-[#FEDB71]";
  };

  const isHome      = location.pathname === "/";
  const isMessages  = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages && isAuthenticated;

  return (
    <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showHome && (
            <button
              onClick={() => navigate(dashboardPath)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          {showLogo && (
            <div
              className="flex flex-col cursor-pointer"
              onClick={() => navigate(isAuthenticated ? dashboardPath : "/")}
            >
              <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1D1D1D] flex items-center justify-center text-white text-[8px] italic">LL</div>
                LiveLink
              </h1>
              {subtitle && (
                <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-40 mt-0.5">{subtitle}</span>
              )}
            </div>
          )}
          {title && !showLogo && (
            <h1 className="text-xl font-black uppercase tracking-tighter italic">{title}</h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 relative">
          {showActions && (
            <>
              {/* ── Messages button ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors border border-transparent active:border-[#1D1D1D]/10"
                  aria-label="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-white px-1">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    </div>
                  )}
                </button>

                {/* ── Messages Dropdown ── */}
                <AnimatePresence>
                  {showMessages && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMessages(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
                      >
                        {/* Header */}
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#389C9A]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Messages</h3>
                          </div>
                          {unreadMessages > 0 && (
                            <span className="bg-[#389C9A] text-white text-[8px] font-black px-2 py-1">
                              {unreadMessages} unread
                            </span>
                          )}
                        </div>

                        {/* Conversation list */}
                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {recentConversations.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border border-[#1D1D1D]/10">
                                <Send className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
                              <p className="text-[8px] opacity-30 mt-1">
                                {isBusiness
                                  ? "Start a conversation with a creator"
                                  : isAdmin
                                  ? "Message creators or businesses"
                                  : "Start a conversation with a business"}
                              </p>
                            </div>
                          ) : (
                            recentConversations.map((conv) => (
                              <div
                                key={conv.id}
                                onClick={() => {
                                  setShowMessages(false);
                                  navigate(`/messages/${conv.id}?role=${userType}`);
                                }}
                                className={`flex items-start gap-3 p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer ${
                                  conv.unread_count > 0 ? "bg-[#389C9A]/5" : ""
                                }`}
                              >
                                {/* Avatar */}
                                {participantAvatarEl(conv)}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <p className={`text-[11px] font-black uppercase tracking-widest truncate ${
                                        conv.unread_count > 0 ? "text-[#1D1D1D]" : "text-[#1D1D1D]/70"
                                      }`}>
                                        {conv.participant_name}
                                      </p>
                                      <span className={`text-[7px] font-black uppercase ${typeBadgeColor(conv.participant_type)} flex-shrink-0`}>
                                        {conv.participant_type === "admin" ? "· Admin" : conv.participant_type === "business" ? "· Biz" : "· Creator"}
                                      </span>
                                    </div>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                      {formatTimestamp(conv.last_message_time)}
                                    </span>
                                  </div>
                                  <p className={`text-[9px] line-clamp-1 break-words ${
                                    conv.unread_count > 0 ? "text-[#1D1D1D] font-bold" : "opacity-50"
                                  }`}>
                                    {conv.last_message || "No messages yet"}
                                  </p>
                                </div>

                                {/* Unread dot */}
                                {conv.unread_count > 0 && (
                                  <div className="w-2 h-2 bg-[#389C9A] rounded-full flex-shrink-0 mt-1" />
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
                          <Link
                            to={messagesPath}
                            onClick={() => setShowMessages(false)}
                            className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                          >
                            View All Messages →
                          </Link>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Notifications button ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black flex items-center justify-center border border-[#1D1D1D]">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </div>
                  )}
                </button>

                {/* ── Notifications Dropdown ── */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
                      >
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FEDB71]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Notifications</h3>
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
                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border border-[#1D1D1D]/10">
                                <Bell className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                              <p className="text-[8px] opacity-30 mt-1">We'll notify you when something happens</p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => markNotificationAsRead(notif.id)}
                                className={`p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer ${
                                  !notif.is_read ? "bg-[#FEDB71]/5" : ""
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="text-[11px] font-black uppercase tracking-widest truncate">{notif.title}</p>
                                      <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                        {formatTimestamp(notif.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] opacity-60 line-clamp-2 break-words">{notif.message}</p>
                                  </div>
                                  {!notif.is_read && <div className="w-2 h-2 bg-[#FEDB71] flex-shrink-0 mt-2" />}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
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

          {/* ── Profile Menu ── */}
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
              className="w-9 h-9 border-2 border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform overflow-hidden"
              aria-label="Profile menu"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : isAdmin ? (
                <Shield className="w-4 h-4 text-purple-600" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && isAuthenticated && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-64 bg-white border-2 border-[#1D1D1D] shadow-xl z-50"
                  >
                    <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                      <div className="flex items-center gap-3 mb-3">
                        {userAvatar ? (
                          <img src={userAvatar} alt={userName} className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center">
                            {isAdmin ? <Shield className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 opacity-40" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest truncate">{userName}</p>
                          <p className="text-[8px] font-medium opacity-40 truncate">{user?.email}</p>
                        </div>
                      </div>
                      {/* Role badge */}
                      <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 w-fit ${
                        isAdmin    ? "bg-purple-100 text-purple-600" :
                        isBusiness ? "bg-[#FEDB71]/20 text-[#D4A800]" :
                                     "bg-[#389C9A]/10 text-[#389C9A]"
                      }`}>
                        {isAdmin    ? <Shield className="w-3 h-3" /> :
                         isBusiness ? <Briefcase className="w-3 h-3" /> :
                                      <CheckCircle className="w-3 h-3" />}
                        <span>{isAdmin ? "Admin" : isBusiness ? "Business" : "Creator"}</span>
                      </div>
                    </div>

                    <div className="p-2">
                      {!isAdmin && (
                        <Link
                          to={profilePath}
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-[#389C9A]" /> Profile
                        </Link>
                      )}

                      <Link
                        to={dashboardPath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                      >
                        {isAdmin ? <Shield className="w-3.5 h-3.5 text-purple-600" /> :
                         isBusiness ? <Briefcase className="w-3.5 h-3.5 text-[#389C9A]" /> :
                                      <Home className="w-3.5 h-3.5 text-[#389C9A]" />}
                        Dashboard
                      </Link>

                      <Link
                        to={messagesPath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#389C9A]" />
                        Messages
                        {unreadMessages > 0 && (
                          <span className="ml-auto text-[7px] font-black bg-[#389C9A] text-white px-1.5 py-0.5 rounded-full">
                            {unreadMessages}
                          </span>
                        )}
                      </Link>

                      {!isAdmin && (
                        <Link
                          to={settingsPath}
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#389C9A]" /> Settings
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
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
