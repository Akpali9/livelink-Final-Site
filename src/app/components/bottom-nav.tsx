import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, MessageSquare, User } from "lucide-react";
import { supabase } from "../lib/supabase";

export function BottomNav() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const tabs = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Opportunities", path: "/browse-businesses" },
    { icon: MessageSquare, label: "Messages", path: "/messages", badge: unreadCount },
    { icon: User, label: "Profile", path: "/profile/1" },
  ];

  useEffect(() => {
    // Function to fetch unread messages from PostgreSQL
    const fetchUnreadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("seen", false); // 'seen' column tracks unread
      if (error) {
        console.error("Error fetching unread messages:", error);
      } else {
        setUnreadCount(data?.length ?? 0);
      }
    };

    fetchUnreadMessages();

    // Real-time listener for new messages and updates
    const messageListener = supabase
      .channel("messages-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new.seen === false) {
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            // Adjust count based on update
            if (payload.new.seen === true) setUnreadCount((prev) => Math.max(prev - 1, 0));
            if (payload.new.seen === false) setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // Cleanup listener on component unmount
    return () => {
      supabase.removeChannel(messageListener);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[60px] bg-[#1D1D1D] border-t border-white/10 flex items-center z-50">
      {tabs.map((tab) => {
        const isActive =
          location.pathname === tab.path ||
          (tab.path === "/messages" && location.pathname.startsWith("/messages"));

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? "text-[#389C9A]" : "text-white/40"
            }`}
          >
            <div className="relative">
              <tab.icon className="w-6 h-6" strokeWidth={isActive ? 3 : 2} />
              {tab.badge && tab.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FEDB71] rounded-full flex items-center justify-center border border-[#1D1D1D]">
                  <span className="text-[9px] font-black text-[#1D1D1D]">{tab.badge}</span>
                </div>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest italic">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
