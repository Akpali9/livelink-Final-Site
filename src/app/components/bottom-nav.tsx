import React from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, User, Briefcase, MessageSquare } from "lucide-react";
import { useAuth } from "../lib/contexts/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const userType = user?.user_metadata?.user_type || user?.user_metadata?.role;
  const isBusiness = userType === "business";

  const navItems = isBusiness
    ? [
        { icon: Home,         label: "Home",         path: "/business/dashboard" },
        { icon: Search,       label: "Browse",       path: "/browse" },
        { icon: Briefcase,    label: "My Campaigns", path: "/business/campaigns" },
        { icon: User,        label: "Profile",  path: "/business/settings"},
      ]
    : [
        { icon: Home,         label: "Home",         path: "/dashboard" },
        { icon: Search,       label: "Browse",       path: "/browse" },
        { icon: Briefcase,    label: "Campaigns",    path: "/campaigns" },
        { icon: User,          label: "Profile", path: "/settings" },
      ];

  const isActive = (path: string, label: string) => {
    const p = location.pathname;
    if (label === "Home")         return isBusiness ? p === "/business/dashboard" : p === "/dashboard";
    if (label === "Campaigns" || label === "My Campaigns") return isBusiness
      ? p === "/business/campaigns" || p.startsWith("/business/campaign")
      : p === "/campaigns" || p.startsWith("/campaign");
    if (label === "Browse")       return p === "/browse" || p.startsWith("/profile");
    if (label === "Notifications")return p === "/notifications";
    return p === path;
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[60px] bg-[#1D1D1D] border-t border-white/10 flex items-center z-50">
      {navItems.map((item) => {
        const Icon   = item.icon;
        const active = isActive(item.path, item.label);
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              active ? "text-[#389C9A]" : "text-white/40"
            }`}
          >
            <Icon className="w-6 h-6" strokeWidth={active ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest italic">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
