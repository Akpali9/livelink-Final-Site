import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { 
  MessageSquare, 
  Bell, 
  User, 
  ArrowLeft, 
  Settings, 
  LogOut,
  Home,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  X,
  Mail,
  Send
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
  title: string;
  message: string;
  type: 'offer' | 'campaign' | 'payment' | 'system';
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  conversation_id?: string;
}

export function AppHeader({ 
  title, 
  showBack = false, 
  backPath, 
  showLogo = false,
  userType = "creator",
  subtitle,
  showHome = false
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Track window width for responsive positioning
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch user data
  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      setUserAvatar(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // Fetch unread counts and recent notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get unread notifications count
        const { count: notifCount, error: notifError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (!notifError) {
          setUnreadNotifications(notifCount || 0);
        }

        // Get recent notifications
        const { data: notifData, error: notifDataError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!notifDataError && notifData) {
          setNotifications(notifData);
        }

        // Get unread messages count
        const { count: msgCount, error: msgError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (!msgError) {
          setUnreadMessages(msgCount || 0);
        }

        // Get recent messages with sender info
        const { data: msgData, error: msgDataError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id (
              id,
              email,
              user_metadata
            )
          `)
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!msgDataError && msgData) {
          const formattedMessages = msgData.map(msg => ({
            ...msg,
            sender_name: msg.sender?.user_metadata?.full_name || 
                        msg.sender?.email?.split('@')[0] || 
                        'Unknown',
            sender_avatar: msg.sender?.user_metadata?.avatar_url
          }));
          setRecentMessages(formattedMessages);
        }

      } catch (error) {
        console.error('Error fetching header data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for notifications
    const notificationsSubscription = supabase
      .channel('header_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setUnreadNotifications(prev => prev + 1);
          setNotifications(prev => [newNotif, ...prev].slice(0, 5));
          
          // Show toast based on notification type
          const type = newNotif.type;
          if (type === 'offer') {
            toast.success(newNotif.title, {
              description: newNotif.message,
              icon: '🎯',
              action: {
                label: 'View',
                onClick: () => navigate('/offers')
              }
            });
          } else if (type === 'payment') {
            toast.success(newNotif.title, {
              description: newNotif.message,
              icon: '💰',
              action: {
                label: 'View',
                onClick: () => navigate('/earnings')
              }
            });
          } else {
            toast.info(newNotif.title, {
              description: newNotif.message,
              icon: '🔔'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh unread count
          const refreshCount = async () => {
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false);
            setUnreadNotifications(count || 0);
          };
          refreshCount();
        }
      )
      .subscribe();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel('header_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          setUnreadMessages(prev => prev + 1);
          
          // Fetch sender details for the new message
          const { data: senderData } = await supabase
            .from('users')
            .select('email, user_metadata')
            .eq('id', payload.new.sender_id)
            .single();

          const senderName = senderData?.user_metadata?.full_name || 
                            senderData?.email?.split('@')[0] || 
                            'Unknown';
          
          const newMsg = {
            ...payload.new,
            sender_name: senderName,
            sender_avatar: senderData?.user_metadata?.avatar_url
          };
          
          setRecentMessages(prev => [newMsg, ...prev].slice(0, 5));
          
          toast.info(`New message from ${senderName}`, {
            description: payload.new.content.substring(0, 50) + 
                        (payload.new.content.length > 50 ? '...' : ''),
            icon: '💬',
            action: {
              label: 'Reply',
              onClick: () => navigate(`/messages/${payload.new.sender_id}`)
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          // Refresh unread count
          const refreshCount = async () => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('receiver_id', user.id)
              .eq('is_read', false);
            setUnreadMessages(count || 0);
          };
          refreshCount();
        }
      )
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [isAuthenticated, user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowMessages(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setUnreadNotifications(prev => Math.max(0, prev - 1));
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadNotifications(0);
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );

    toast.success('All notifications marked as read');
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setUnreadMessages(prev => Math.max(0, prev - 1));
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'offer': return <Briefcase className="w-4 h-4 text-[#389C9A]" />;
      case 'campaign': return <Calendar className="w-4 h-4 text-[#FEDB71]" />;
      case 'payment': return <DollarSign className="w-4 h-4 text-green-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const settingsPath = userType === "business" ? "/business/settings" : "/settings";
  const profilePath = userType === "business" ? "/business/profile" : "/profile/me";
  const messagesPath = userType === "business" ? "/messages?role=business" : "/messages?role=creator";
  const notificationsPath = userType === "business" ? "/notifications?role=business" : "/notifications?role=creator";
  const dashboardPath = userType === "business" ? "/business/dashboard" : "/dashboard";

  const isHome = location.pathname === "/";
  const isMessages = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages && isAuthenticated;

  // Determine dropdown position based on window width
  const isMobile = windowWidth < 640;
  const dropdownPosition = isMobile ? 'right-0' : 'right-0';

  return (
    <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={() => backPath ? navigate(backPath) : navigate(-1)} 
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors rounded-none"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          {showHome && (
            <button 
              onClick={() => navigate(dashboardPath)} 
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors rounded-none"
              aria-label="Go to dashboard"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          
          {showLogo && (
            <div 
              className="flex flex-col cursor-pointer" 
              onClick={() => isAuthenticated ? navigate(dashboardPath) : navigate('/')}
            >
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

        <div className="flex items-center gap-3 relative">
          {showActions && (
            <>
              {/* Messages Button */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors border border-transparent active:border-[#1D1D1D]/10 rounded-none"
                  aria-label="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-white px-1">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    </div>
                  )}
                </button>

                {/* Messages Dropdown */}
              
              </div>

              {/* Notifications Button */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors rounded-none"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black flex items-center justify-center border border-[#1D1D1D]">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </div>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed pl-32 inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                        transition={{ duration: 0.15 }}
                        className={`absolute ${dropdownPosition} mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]`}
                        style={{ 
                          right: isMobile ? '0' : '0',
                          maxHeight: 'calc(100vh - 100px)',
                          overflowY: 'auto'
                        }}
                      >
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FEDB71]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Notifications</h3>
                          </div>
                          <div className="flex gap-3">
                            {unreadNotifications > 0 && (
                              <button
                                onClick={markAllNotificationsAsRead}
                                className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                              >
                                Mark All Read
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border border-[#1D1D1D]/10">
                                <Bell className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                              <p className="text-[8px] opacity-30 mt-1">We'll notify you when something happens</p>
                            </div>
                          ) : (
                            notifications.map(notif => (
                              <div
                                key={notif.id}
                                onClick={() => markNotificationAsRead(notif.id)}
                                className={`p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer ${!notif.is_read ? 'bg-[#FEDB71]/5' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex-shrink-0">
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="text-[11px] font-black uppercase tracking-widest truncate">
                                        {notif.title}
                                      </p>
                                      <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                        {formatTimestamp(notif.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] opacity-60 line-clamp-2 break-words">
                                      {notif.message}
                                    </p>
                                  </div>
                                  {!notif.is_read && (
                                    <div className="w-2 h-2 bg-[#FEDB71] flex-shrink-0 mt-2" />
                                  )}
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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                        transition={{ duration: 0.15 }}
                        className={`absolute ml-10 ${dropdownPosition} mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]`}
                        style={{ 
                          // right: isMobile ? '0' : '0',
                          maxHeight: 'calc(100vh - 100px)',
                          overflowY: 'auto'
                        }}
                      >
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
                        
                        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                          {recentMessages.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border border-[#1D1D1D]/10">
                                <Send className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
                              <p className="text-[8px] opacity-30 mt-1">Start a conversation with a business</p>
                            </div>
                          ) : (
                            recentMessages.map(msg => (
                              <Link
                                key={msg.id}
                                to={`/messages/${msg.sender_id}`}
                                onClick={() => {
                                  setShowMessages(false);
                                  if (!msg.is_read) markMessageAsRead(msg.id);
                                }}
                                className={`block p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors ${!msg.is_read ? 'bg-[#389C9A]/5' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  {msg.sender_avatar ? (
                                    <ImageWithFallback 
                                      src={msg.sender_avatar} 
                                      className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center flex-shrink-0">
                                      <User className="w-5 h-5 opacity-40" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="text-[11px] font-black uppercase tracking-widest truncate">
                                        {msg.sender_name}
                                      </p>
                                      <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                        {formatTimestamp(msg.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] opacity-60 line-clamp-2 break-words">
                                      {msg.content}
                                    </p>
                                  </div>
                                  {!msg.is_read && (
                                    <div className="w-2 h-2 bg-[#389C9A] flex-shrink-0 mt-2" />
                                  )}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                        
                        {recentMessages.length > 0 && (
                          <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
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
            </>
          )}

          {/* Profile Menu */}
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
              className="w-9 h-9 border-2 border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform rounded-none overflow-hidden"
              aria-label="Profile menu"
            >
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4.5 h-4.5" />
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                    transition={{ duration: 0.1 }}
                    className={`absolute ${dropdownPosition} mt-2 w-64 bg-white border-2 border-[#1D1D1D] shadow-xl z-50`}
                    style={{ right: isMobile ? '0' : '0' }}
                  >
                    <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                      <div className="flex items-center gap-3 mb-3">
                        {userAvatar ? (
                          <img 
                            src={userAvatar} 
                            alt={userName}
                            className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center">
                            <User className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest truncate">
                            {userName}
                          </p>
                          <p className="text-[8px] font-medium opacity-40 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-[#389C9A]" />
                          <span>{userType === 'business' ? 'Business' : 'Creator'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <Link 
                        to={profilePath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                      >
                        <User className="w-3.5 h-3.5 text-[#389C9A]" /> Profile
                      </Link>
                      
                      <Link 
                        to={settingsPath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#389C9A]" /> Settings
                      </Link>
                      
                      {userType === 'business' ? (
                        <Link 
                          to="/business/dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-[#389C9A]" /> Dashboard
                        </Link>
                      ) : (
                        <Link 
                          to="/dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                        >
                          <Home className="w-3.5 h-3.5 text-[#389C9A]" /> Dashboard
                        </Link>
                      )}
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white text-red-500 flex items-center gap-3 transition-colors rounded-none"
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
