import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";  // Ensure Supabase client is set up
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CreatorNavProps {
  avatarUrl?: string;
  initials?: string;
  userType?: "creator" | "business";
}

export function CreatorNav({
  avatarUrl = "https://images.unsplash.com/photo-1758179759979-c0c2235ae172?w=100&h=100&fit=crop",
  initials = "AR",
  userType = "creator",
}: CreatorNavProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    // Fetch unread messages
    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("read", false);

      if (!error) setUnreadCount(data?.length ?? 0);
    };

    fetchUnread();

    // Real-time listener for new/unread messages
    const subscription = supabase
      .from("messages")
      .on("INSERT", payload => {
        if (!payload.new.read) setUnreadCount(prev => prev + 1);
      })
      .on("UPDATE", payload => {
        if (payload.new.read) setUnreadCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => supabase.removeSubscription(subscription);
  }, []);

  const userName = userType === "business" ? "Acme Marketing" : "ALEX";
  const profilePath = userType === "business" ? "/business/profile" : "/profile/me";

  return (
    <nav className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-14 bg-[#1B3C53] flex items-center justify-between px-4 z-[100]">
      <Link to="/dashboard" className="text-lg font-black italic tracking-tighter text-white">
        LiveLink
      </Link>

      <div className="flex items-center gap-3">
        {/* Notification Bell with Unread Count */}
        <button className="relative p-1">
          <Bell className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white translate-x-1/2 -translate-y-1/2">
              <span className="text-[10px] font-bold text-white leading-none">{unreadCount}</span>
            </div>
          )}
        </button>

        {/* Profile Avatar with Dropdown Menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 border border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform"
          >
            <User className="w-4.5 h-4.5" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white border border-[#1D1D1D] shadow-lg z-50">
              <div className="p-4 border-b border-[#1D1D1D]/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">
                  Logged in as
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest truncate italic">{userName}</p>
              </div>
              <div className="p-1">
                <Link
                  to={profilePath}
                  className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors italic"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings className="w-3.5 h-3.5 text-[#389C9A]" />
                  {userType === "business" ? "Business Settings" : "Settings"}
                </Link>
                <button
                  className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white text-red-500 flex items-center gap-3 transition-colors italic"
                  onClick={() => {
                    // Add logout logic here
                    setShowProfileMenu(false);
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}