import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, MessageSquare, User } from "lucide-react";
import { supabase } from "../lib/supabase";

export function BottomNav() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("seen", false);
      setUnreadCount(data?.length ?? 0);
    };
    fetchUnread();
  }, []);

  const tabs = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Opportunities", path: "/browse-businesses" },
    { icon: MessageSquare, label: "Messages", path: "/messages", badge: unreadCount },
    { icon: User, label: "Profile", path: userId ? `/profile/${userId}` : "/dashboard" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-[#1D1D1D]/10 flex items-center z-50 max-w-[480px] mx-auto">
      {tabs.map(({ icon: Icon, label, path, badge }) => {
        const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${
              isActive ? "text-[#1D1D1D]" : "text-[#1D1D1D]/30 hover:text-[#1D1D1D]/60"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge ? (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#389C9A] text-white text-[7px] font-black flex items-center justify-center rounded-none">
                  {badge}
                </span>
              ) : null}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
