import React, { useEffect, useState, useCallback } from "react";
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
  Mail,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

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
  | "system" 
  | "new_offer" 
  | "business_approved" 
  | "business_rejected"
  | "creator_approved" 
  | "creator_rejected" 
  | "campaign_approved"
  | "campaign_rejected" 
  | "payout" 
  | "welcome"
  | "campaign_invite"
  | "new_application";

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

const getGrouping = (dateString: string): Notification["grouping"] => {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7)  return "THIS_WEEK";
  return "EARLIER";
};

const GROUP_LABELS = {
  TODAY: "Today", 
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week", 
  EARLIER: "Earlier",
};

const GROUP_ORDER: Notification["grouping"][] = ["TODAY", "YESTERDAY", "THIS_WEEK", "EARLIER"];

function NotifIcon({ type }: { type: NotificationType }) {
  const cls = "w-5 h-5";
  
  const iconMap: Record<string, React.ReactNode> = {
    earnings: <DollarSign className={`${cls} text-green-600`} />,
    payment: <CreditCard className={`${cls} text-green-600`} />,
    payout: <DollarSign className={`${cls} text-green-600`} />,
    message: <MessageSquare className={`${cls} text-blue-500`} />,
    confirmed: <CheckCircle2 className={`${cls} text-green-500`} />,
    business_approved: <CheckCircle2 className={`${cls} text-green-500`} />,
    creator_approved: <CheckCircle2 className={`${cls} text-green-500`} />,
    campaign_approved: <CheckCircle2 className={`${cls} text-green-500`} />,
    business_rejected: <XCircle className={`${cls} text-red-500`} />,
    creator_rejected: <XCircle className={`${cls} text-red-500`} />,
    campaign_rejected: <XCircle className={`${cls} text-red-500`} />,
    warning: <AlertTriangle className={`${cls} text-orange-500`} />,
    action: <Zap className={`${cls} text-yellow-600`} />,
    offer: <Zap className={`${cls} text-yellow-600`} />,
    new_offer: <Zap className={`${cls} text-yellow-600`} />,
    new_application: <Users className={`${cls} text-purple-500`} />,
    campaign: <Megaphone className={`${cls} text-purple-500`} />,
    campaign_invite: <Mail className={`${cls} text-purple-500`} />,
    match: <Target className={`${cls} text-indigo-500`} />,
    welcome: <ShieldCheck className={`${cls} text-teal-500`} />,
    announcement: <Bell className={`${cls} text-gray-600`} />,
    system: <Info className={`${cls} text-gray-400`} />,
  };
  
  return iconMap[type] || <Bell className={`${cls} text-gray-400`} />;
}

function notifBg(type: NotificationType): string {
  const bgMap: Record<string, string> = {
    earnings: "bg-green-100",
    payment: "bg-green-100",
    payout: "bg-green-100",
    message: "bg-blue-100",
    confirmed: "bg-green-100",
    business_approved: "bg-green-100",
    creator_approved: "bg-green-100",
    campaign_approved: "bg-green-100",
    business_rejected: "bg-red-100",
    creator_rejected: "bg-red-100",
    campaign_rejected: "bg-red-100",
    warning: "bg-orange-100",
    action: "bg-yellow-100",
    offer: "bg-yellow-100",
    new_offer: "bg-yellow-100",
    new_application: "bg-purple-100",
    campaign: "bg-purple-100",
    campaign_invite: "bg-purple-100",
    match: "bg-indigo-100",
    welcome: "bg-teal-100",
    announcement: "bg-gray-100",
    system: "bg-gray-100",
  };
  
  return bgMap[type] || "bg-gray-100";
}

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
  const [isDeleting, setIsDeleting]       = useState<string | null>(null);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastUpdated, setLastUpdated]     = useState<Date>(new Date());

  const fetchNotifications = useCallback(async (showRefreshToast = false) => {
    if (!user) return;
    
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      }
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map(n => ({ 
        ...n, 
        grouping: getGrouping(n.created_at),
        data: n.data || {}
      }));
      
      setNotifications(formattedData);
      setLastUpdated(new Date());
      
      if (showRefreshToast) {
        toast.success(`Updated ${formattedData.length} notifications`);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (showRefreshToast) {
        toast.error("Failed to refresh notifications");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const createTestNotification = async () => {
    if (!user) return;
    
    const testNotifications = [
      {
        user_id: user.id,
        type: "new_offer",
        title: "New Campaign Offer! 🎯",
        message: "TechCorp wants you to promote their new gaming laptop. $500 per post.",
        data: { campaign_id: "test-123", amount: 500 },
        created_at: new Date().toISOString()
      },
      {
        user_id: user.id,
        type: "message",
        title: "New Message 💬",
        message: "Sarah from GamingCo sent you a message about your recent campaign.",
        data: { conversation_id: "conv-123" },
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        user_id: user.id,
        type: "campaign_approved",
        title: "Campaign Approved! ✅",
        message: "Your campaign 'Summer Gaming Stream' has been approved and is now live.",
        data: { campaign_id: "camp-456" },
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        user_id: user.id,
        type: "payment",
        title: "Payment Received 💰",
        message: "You received $750 from Nike Campaign #1234.",
        data: { amount: 750, campaign_id: "nike-123" },
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        user_id: user.id,
        type: "new_application",
        title: "New Application! 📝",
        message: "A creator applied to your campaign 'Summer Sale 2024'.",
        data: { campaign_id: "camp-789", creator_id: "creator-123" },
        created_at: new Date(Date.now() - 259200000).toISOString()
      }
    ];
    
    for (const notif of testNotifications) {
      const { error } = await supabase.from("notifications").insert(notif);
      if (error) console.error("Error creating test notification:", error);
    }
    
    await fetchNotifications();
    toast.success(`${testNotifications.length} test notifications created!`);
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Setup real-time subscription
    const channel = supabase
      .channel(`notifications-${user.id}`)
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
            grouping: getGrouping(payload.new.created_at),
            data: payload.new.data || {}
          } as Notification;
          
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show toast for new notification
          if (!newNotif.is_read) {
            toast.info(newNotif.title, {
              description: newNotif.message,
              duration: 5000,
              action: {
                label: "View",
                onClick: () => handleClick(newNotif)
              }
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new, grouping: getGrouping(payload.new.created_at) } : n)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user || notifications.filter(n => !n.is_read).length === 0) return;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const clearAll = async () => {
    if (!user) return;
    
    const confirmed = window.confirm("Are you sure you want to clear all notifications? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
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
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(id);
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    
    const data = n.data || {};

    if (isBiz) {
      if (data.campaign_id) {
        navigate(`/business/campaign/overview/${data.campaign_id}`);
      } else if (n.type === "message" && data.conversation_id) {
        navigate(`/messages/${data.conversation_id}?role=business`);
      } else if (n.type === "message") {
        navigate(`/messages?role=business`);
      } else if (n.type === "campaign" || n.type === "campaign_approved" || n.type === "campaign_rejected") {
        navigate(`/business/campaigns`);
      } else if (n.type === "payment" || n.type === "payout" || n.type === "earnings") {
        navigate(`/business/dashboard`);
      } else if (n.type === "new_offer" || n.type === "offer") {
        navigate(`/business/campaigns`);
      } else {
        navigate(`/business/dashboard`);
      }
    } else {
      if (data.campaign_id) {
        navigate(`/creator/campaign/${data.campaign_id}`);
      } else if (data.conversation_id) {
        navigate(`/messages/${data.conversation_id}?role=creator`);
      } else if (n.type === "message") {
        navigate(`/messages?role=creator`);
      } else if (n.type === "earnings" || n.type === "payment" || n.type === "payout") {
        navigate(`/dashboard`);
      } else if (n.type === "campaign" || n.type === "offer" || n.type === "new_offer") {
        navigate(`/campaigns`);
      } else {
        navigate(`/dashboard`);
      }
    }
  };

  const bizTabs = [
    { value: "all", label: "All", icon: Bell, types: ["all"] },
    { value: "campaign", label: "Campaigns", icon: Megaphone, types: ["campaign", "campaign_approved", "campaign_rejected", "campaign_invite"] },
    { value: "offer", label: "Offers", icon: Zap, types: ["offer", "new_offer", "action"] },
    { value: "application", label: "Applications", icon: Users, types: ["new_application"] },
    { value: "message", label: "Messages", icon: MessageSquare, types: ["message"] },
    { value: "payment", label: "Payments", icon: DollarSign, types: ["payment", "earnings", "payout"] },
    { value: "system", label: "System", icon: Info, types: ["system", "announcement", "welcome"] },
  ];

  const creatorTabs = [
    { value: "all", label: "All", icon: Bell, types: ["all"] },
    { value: "offer", label: "Offers", icon: Zap, types: ["offer", "new_offer", "action"] },
    { value: "message", label: "Messages", icon: MessageSquare, types: ["message"] },
    { value: "payment", label: "Payments", icon: DollarSign, types: ["payment", "earnings", "payout"] },
    { value: "campaign", label: "Campaigns", icon: Briefcase, types: ["campaign", "campaign_approved", "campaign_rejected", "campaign_invite"] },
    { value: "system", label: "System", icon: Info, types: ["system", "announcement", "welcome"] },
  ];

  const tabs = isBiz ? bizTabs : creatorTabs;

  const filtered = selectedType === "all"
    ? notifications
    : notifications.filter(n => {
        const tab = tabs.find(t => t.value === selectedType);
        return tab && tab.types.includes(n.type);
      });

  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.grouping]) acc[n.grouping] = [];
    acc[n.grouping].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="fflex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Notifications" backPath={backPath} userType={isBiz ? "business" : "creator"} />

      <main className="flex-1 max-w-[480px] mx-auto w-full">

        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-[#1D1D1D]/10">
          {/* Real-time Status Bar */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-green-600">
                  LIVE
                </span>
              </div>
              <span className="text-[8px] text-[#1D1D1D]/40">
                • {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
              <span className="text-[8px] text-[#1D1D1D]/30">
                • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={refreshing}
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {refreshing ? 'Updating...' : 'Refresh'}
                </span>
              </button>
              {notifications.length === 0 && (
                <button onClick={createTestNotification}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Add Test
                </button>
              )}
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
              const Icon = tab.icon;
              let count = 0;
              
              if (tab.value === "all") {
                count = notifications.length;
              } else {
                count = notifications.filter(n => tab.types.includes(n.type)).length;
              }
              
              const active = selectedType === tab.value;

              return (
                <button 
                  key={tab.value} 
                  onClick={() => setSelectedType(tab.value)}
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
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/30 italic">
                      {GROUP_LABELS[group]}
                    </p>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {items.map(n => (
                      <motion.div
                        layout 
                        key={n.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => handleClick(n)}
                        className={`group relative flex items-start gap-4 px-6 py-5 cursor-pointer transition-all hover:bg-gray-50 border-b border-[#1D1D1D]/5 ${
                          !n.is_read ? "bg-[#389C9A]/5" : ""
                        }`}
                      >
                        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${notifBg(n.type)}`}>
                          <NotifIcon type={n.type} />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className={`text-sm font-black uppercase tracking-tight ${
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
                          {n.data?.amount && (
                            <div className="mt-2 flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-green-600" />
                              <span className="text-[9px] font-bold text-green-600">
                                ${n.data.amount}
                              </span>
                            </div>
                          )}
                        </div>

                        {!n.is_read && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#389C9A] rounded-full" />
                        )}

                        <button
                          onClick={e => deleteNotif(n.id, e)}
                          disabled={isDeleting === n.id}
                          className="absolute right-3 top-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        >
                          {isDeleting === n.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3 h-3 text-red-400" />
                          )}
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
              {selectedType !== "all" 
                ? `No ${selectedType} notifications yet.` 
                : "No notifications yet. They'll appear here when you get them."}
            </p>
            <div className="flex gap-3">
              <button onClick={createTestNotification}
                className="px-6 py-3 border-2 border-[#389C9A] text-[10px] font-black uppercase tracking-widest text-[#389C9A] hover:bg-[#389C9A] hover:text-white transition-all rounded-xl">
                Add Test Notifications
              </button>
              <button onClick={() => navigate(backPath)}
                className="px-6 py-3 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl">
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
