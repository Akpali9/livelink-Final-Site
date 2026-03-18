import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, User, Settings, LogOut, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ImageWithFallback } from "./ImageWithFallback";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface CreatorNavProps {
  avatarUrl?: string;
  userType?: "creator" | "business";
  userName?: string;
  userId?: string;
}

export function CreatorNav({
  avatarUrl,
  userType = "creator",
  userName,
  userId,
}: CreatorNavProps) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    if (!userId) return;

    // Fetch unread notifications
    const fetchUnreadNotifications = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (!error) setUnreadNotifications(count || 0);
    };

    // Fetch unread messages (via conversations)
    const fetchUnreadMessages = async () => {
      // Get all conversations where user is a participant
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

      if (!conversations?.length) return;

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages in those conversations
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("is_read", false)
        .neq("sender_id", userId); // Only count messages from others

      if (!error) setUnreadMessages(count || 0);
    };

    fetchUnreadNotifications();
    fetchUnreadMessages();

    // Set up real-time subscription for notifications (Supabase v2)
    const notificationsSubscription = supabase
      .channel('creator-nav-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel('creator-nav-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [userId]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const profilePath = userType === "business" ? "/business/profile" : "/profile/me";
  const dashboardPath = userType === "business" ? "/business/dashboard" : "/dashboard";
  const notificationsPath = userType === "business" ? "/notifications?role=business" : "/notifications?role=creator";
  const messagesPath = userType === "business" ? "/messages?role=business" : "/messages?role=creator";

  // Generate initials from name
  const getInitials = () => {
    if (!userName) return "U";
    return userName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-14 bg-[#1D1D1D] flex items-center justify-between px-4 z-[100] border-b border-white/10">
      <Link to={dashboardPath} className="text-lg font-black italic tracking-tighter text-white">
        LiveLink<span className="text-[#389C9A]">.</span>
      </Link>

      <div className="flex items-center gap-3">
        {/* Messages Button */}
        <Link to={messagesPath} className="relative p-1">
          <Mail className="w-5 h-5 text-white" />
          {unreadMessages > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#389C9A] rounded-full flex items-center justify-center border border-white">
              <span className="text-[9px] font-black text-white px-1">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            </div>
          )}
        </Link>

        {/* Notification Bell */}
        <Link to={notificationsPath} className="relative p-1">
          <Bell className="w-5 h-5 text-white" />
          {unreadNotifications > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] rounded-full flex items-center justify-center border border-white text-[9px] font-black">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </div>
          )}
        </Link>

        {/* Profile Avatar with Dropdown Menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 border-2 border-white/20 flex items-center justify-center bg-[#389C9A] hover:bg-[#2d7f7d] transition-colors rounded-full overflow-hidden"
            aria-label="Profile menu"
          >
            {avatarUrl ? (
              <ImageWithFallback
                src={avatarUrl}
                alt={userName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-white">{getInitials()}</span>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-[#1D1D1D] shadow-xl z-50">
                <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">
                    Logged in as
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest truncate italic">
                    {userName || "User"}
                  </p>
                </div>
                <div className="p-2">
                  <Link
                    to={profilePath}
                    className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="w-3.5 h-3.5 text-[#389C9A]" />
                    Profile
                  </Link>
                  <Link
                    to={dashboardPath}
                    className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors rounded-none"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings className="w-3.5 h-3.5 text-[#389C9A]" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white text-red-500 flex items-center gap-3 transition-colors rounded-none"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
