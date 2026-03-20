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

  // ── Auto-detect userType from metadata if prop not provided ──────────────
  const detectedType = user?.user_metadata?.user_type || user?.user_metadata?.role;
  const userType: "creator" | "business" = 
    userTypeProp ?? (detectedType === "business" ? "business" : "creator");
  const isBusiness = userType === "business";

  const [showProfileMenu, setShowProfileMenu]     = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages]           = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages]       = useState(0);
  const [notifications, setNotifications]         = useState<Notification[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationPreview[]>([]);
  const [userName, setUserName]   = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // ── Window resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {};
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── User data + profile IDs ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Display name: prefer business_name for business users
    const meta = user.user_metadata || {};
    if (isBusiness) {
      setUserName(meta.business_name || meta.full_name || user.email?.split('@')[0] || 'Business');
    } else {
      setUserName(meta.full_name || user.email?.split('@')[0] || 'User');
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
          // Use business logo if no avatar in metadata
          if (!meta.avatar_url && data.logo_url) setUserAvatar(data.logo_url);
          if (!userName && data.business_name) setUserName(data.business_name);
        }
      } else {
        const { data } = await supabase
          .from("creator_profiles")
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

  // ── Fetch notifications + conversations ───────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadNotifications(notifCount || 0);

        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (notifData) setNotifications(notifData);

        await fetchConversations();
      } catch (err) {
        console.error('Header data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const notifSub = supabase
      .channel('header_notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const n = payload.new as Notification;
        setUnreadNotifications(prev => prev + 1);
        setNotifications(prev => [n, ...prev].slice(0, 5));
        const type = n.type || '';
        if (type.includes('approved')) {
          toast.success(n.title, { description: n.message, icon: '✅' });
        } else if (type.includes('offer') || type === 'new_offer') {
          toast.success(n.title, { description: n.message, icon: '🎯' });
        } else if (type.includes('payment') || type === 'payout') {
          toast.success(n.title, { description: n.message, icon: '💰' });
        } else if (type.includes('rejected')) {
          toast.error(n.title, { description: n.message });
        } else {
          toast.info(n.title, { description: n.message, icon: '🔔' });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_read', false)
          .then(({ count }) => setUnreadNotifications(count || 0));
      })
      .subscribe();

    const msgSub = supabase
      .channel('header_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
        await fetchConversations();
      })
      .subscribe();

    return () => {
      notifSub.unsubscribe();
      msgSub.unsubscribe();
    };
  }, [isAuthenticated, user]);

  // ── fetchConversations ─────────────────────────────────────────────────────
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (!convs) return;

      const previews = await Promise.all(convs.map(async (conv) => {
        const otherId   = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
        const otherType = conv.participant1_id === user.id ? conv.participant2_type : conv.participant1_type;

        const { data: lastMsg } = await supabase
          .from('messages').select('content, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();

        const { count } = await supabase
          .from('messages').select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id).eq('sender_id', otherId).eq('is_read', false);

        let name = 'Unknown';
        let avatar: string | null = null;

        if (otherType === 'creator') {
          const { data: p } = await supabase.from('creator_profiles')
            .select('full_name, avatar_url').eq('user_id', otherId).maybeSingle();
          if (p) { name = p.full_name || 'Creator'; avatar = p.avatar_url || null; }
        } else if (otherType === 'business') {
          const { data: p } = await supabase.from('businesses')
            .select('business_name, logo_url').eq('user_id', otherId).maybeSingle();
          if (p) { name = p.business_name || 'Business'; avatar = p.logo_url || null; }
        } else if (otherType === 'admin') {
          name = 'LiveLink Support';
        }

        return {
          id: conv.id,
          other_participant_name: name,
          other_participant_avatar: avatar,
          last_message: lastMsg?.content || 'No messages yet',
          last_message_time: lastMsg?.created_at || conv.last_message_at || conv.created_at,
          is_read: (count || 0) === 0,
          participant_id: otherId,
        };
      }));

      setRecentConversations(previews);
      setUnreadMessages(previews.filter(c => !c.is_read).length);
    } catch (err) {
      console.error('fetchConversations error:', err);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch { toast.error("Failed to logout"); }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadNotifications(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('offer') || type === 'new_offer') return <Briefcase className="w-4 h-4 text-[#389C9A]" />;
    if (type.includes('campaign'))  return <Calendar className="w-4 h-4 text-[#FEDB71]" />;
    if (type.includes('payment') || type === 'payout') return <DollarSign className="w-4 h-4 text-green-500" />;
    if (type.includes('approved'))  return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (type.includes('rejected'))  return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  // ── Paths (KEY FIX: business profile → /business/profile) ─────────────────
  const settingsPath      = isBusiness ? "/business/settings"  : "/settings";
  const profilePath       = isBusiness ? "/business/profile"   : `/profile/${creatorId || 'me'}`;
  const messagesPath      = isBusiness ? "/messages?role=business" : "/messages?role=creator";
  const notificationsPath = isBusiness ? "/notifications?role=business" : "/notifications?role=creator";
  const dashboardPath     = isBusiness ? "/business/dashboard" : "/dashboard";

  const isHome     = location.pathname === "/";
  const isMessages = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages && isAuthenticated;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">

        {/* Left side */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors" aria-label="Go back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showHome && (
            <button onClick={() => navigate(dashboardPath)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors" aria-label="Dashboard">
              <Home className="w-5 h-5" />
            </button>
          )}
          {showLogo && (
            <div className="flex flex-col cursor-pointer"
              onClick={() => isAuthenticated ? navigate(dashboardPath) : navigate('/')}>
              <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1D1D1D] flex items-center justify-center text-white text-[8px] italic">LL</div>
                LiveLink
              </h1>
              {subtitle && <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-40 mt-0.5">{subtitle}</span>}
            </div>
          )}
          {title && !showLogo && (
            <h1 className="text-xl font-black uppercase tracking-tighter italic">{title}</h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 relative">
          {showActions && (
            <>
              {/* Messages button */}
              <button
                onClick={() => { setShowMessages(!showMessages); setShowNotifications(false); setShowProfileMenu(false); }}
                className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors" aria-label="Messages">
                <MessageSquare className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-black text-white px-1">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                  </div>
                )}
              </button>

              {/* Notifications button */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); setShowProfileMenu(false); }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black flex items-center justify-center border border-[#1D1D1D] rounded-full">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </div>
                  )}
                </button>

                {/* Notifications dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FEDB71]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Notifications</h3>
                          </div>
                          {unreadNotifications > 0 && (
                            <button onClick={markAllNotificationsAsRead}
                              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">
                              Mark All Read
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <Bell className="w-8 h-8 opacity-20 mx-auto mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                            </div>
                          ) : notifications.map(n => (
                            <div key={n.id} onClick={() => markNotificationAsRead(n.id)}
                              className={`p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] cursor-pointer ${!n.is_read ? 'bg-[#FEDB71]/5' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className="mt-1 shrink-0">{getNotificationIcon(n.type)}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest truncate">{n.title}</p>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 shrink-0">{formatTimestamp(n.created_at)}</span>
                                  </div>
                                  <p className="text-[9px] opacity-60 line-clamp-2 break-words">{n.message}</p>
                                </div>
                                {!n.is_read && <div className="w-2 h-2 bg-[#FEDB71] shrink-0 mt-2 rounded-full" />}
                              </div>
                            </div>
                          ))}
                        </div>
                        {notifications.length > 0 && (
                          <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
                            <Link to={notificationsPath} onClick={() => setShowNotifications(false)}
                              className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">
                              View All Notifications →
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Messages dropdown */}
                <AnimatePresence>
                  {showMessages && (
                    <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" onClick={() => setShowMessages(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#389C9A]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Messages</h3>
                          </div>
                          {unreadMessages > 0 && (
                            <span className="bg-[#389C9A] text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                              {unreadMessages} unread
                            </span>
                          )}
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                          {recentConversations.length === 0 ? (
                            <div className="p-8 text-center">
                              <Send className="w-8 h-8 opacity-20 mx-auto mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
                              <p className="text-[8px] opacity-30 mt-1">
                                {isBusiness ? 'Start a conversation with a creator' : 'Start a conversation with a business'}
                              </p>
                            </div>
                          ) : recentConversations.map(conv => (
                            <Link key={conv.id} to={`/messages/${conv.id}?role=${userType}`}
                              onClick={() => setShowMessages(false)}
                              className={`block p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors ${!conv.is_read ? 'bg-[#389C9A]/5' : ''}`}>
                              <div className="flex items-start gap-3">
                                {conv.other_participant_avatar ? (
                                  <ImageWithFallback src={conv.other_participant_avatar}
                                    className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover shrink-0 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center shrink-0 rounded-full">
                                    <User className="w-5 h-5 opacity-40" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest truncate">{conv.other_participant_name}</p>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 shrink-0">{formatTimestamp(conv.last_message_time)}</span>
                                  </div>
                                  <p className="text-[9px] opacity-60 line-clamp-2 break-words">{conv.last_message}</p>
                                </div>
                                {!conv.is_read && <div className="w-2 h-2 bg-[#389C9A] shrink-0 mt-2 rounded-full" />}
                              </div>
                            </Link>
                          ))}
                        </div>
                        {recentConversations.length > 0 && (
                          <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
                            <Link to={messagesPath} onClick={() => setShowMessages(false)}
                              className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">
                              View All Messages →
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

          {/* Profile avatar button */}
          <div className="relative ml-1">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                  setShowMessages(false);
                } else {
                  navigate('/login/portal');
                }
              }}
              className="w-9 h-9 border-2 border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform rounded-full overflow-hidden"
              aria-label="Profile menu">
              {userAvatar
                ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                : <User className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showProfileMenu && isAuthenticated && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-64 bg-white border-2 border-[#1D1D1D] shadow-xl z-50">

                    {/* User chip */}
                    <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                      <div className="flex items-center gap-3 mb-3">
                        {userAvatar
                          ? <img src={userAvatar} alt={userName} className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover rounded-full" />
                          : <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center rounded-full">
                              <User className="w-5 h-5 opacity-40" />
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest truncate">{userName}</p>
                          <p className="text-[8px] font-medium opacity-40 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                        <CheckCircle className="w-3 h-3 text-[#389C9A]" />
                        <span>{isBusiness ? 'Business Account' : 'Creator Account'}</span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      {/* ── KEY FIX: Profile links to correct page per user type ── */}
                      <Link to={profilePath} onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors">
                        <User className="w-3.5 h-3.5 text-[#389C9A]" />
                        {isBusiness ? 'Business Profile' : 'Profile'}
                      </Link>

                      <Link to={settingsPath} onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors">
                        <Settings className="w-3.5 h-3.5 text-[#389C9A]" /> Settings
                      </Link>

                      <Link to={dashboardPath} onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors">
                        {isBusiness
                          ? <Briefcase className="w-3.5 h-3.5 text-[#389C9A]" />
                          : <Home className="w-3.5 h-3.5 text-[#389C9A]" />}
                        Dashboard
                      </Link>

                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white text-red-500 flex items-center gap-3 transition-colors">
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
