import React from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, Bell, Briefcase } from "lucide-react";
import { useAuth } from "../lib/contexts/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const userType = user?.user_metadata?.user_type || user?.user_metadata?.role;
  const isBusiness = userType === "business";

  const navItems = isBusiness
    ? [
        { icon: Home,      label: "Home",      path: "/business/dashboard" },
        { icon: Search,    label: "Browse",    path: "/browse" },
        { icon: Briefcase, label: "My Campaigns", path: "/business/campaigns" },
        { icon: Bell,      label: "Notifications",    path: "/notifications?role=business" },
      ]
    : [
        { icon: Home,      label: "Home",      path: "/dashboard" },
        { icon: Search,    label: "Browse",    path: "/browse" },
        { icon: Briefcase, label: "Campaigns", path: "/campaigns" },
        { icon: Bell,      label: "Notifications",    path: "/notifications?role=creator" },
      ];

  const isActive = (path: string, label: string) => {
    const p = location.pathname;
    if (label === "Home")      return isBusiness ? p === "/business/dashboard" : p === "/dashboard";
    if (label === "Campaigns") return isBusiness
      ? p === "/business/campaigns" || p.startsWith("/business/campaign")
      : p === "/campaigns" || p.startsWith("/campaign");
    if (label === "Browse")    return p === "/browse" || p.startsWith("/profile");
    if (label === "Alerts")    return p === "/notifications";
    return p === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1D1D1D] py-2 px-4 max-w-[480px] mx-auto z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.path, item.label);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                active ? "text-[#389C9A]" : "text-[#1D1D1D]/40 hover:text-[#1D1D1D]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
