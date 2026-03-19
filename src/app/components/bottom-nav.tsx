import React from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, Bell, User, Briefcase } from "lucide-react";

export function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Browse", path: "/browse" },
    { icon: Briefcase, label: "Campaigns", path: "/campaigns" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    // { icon: User, label: "Profile", path: "/profile/me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1D1D1D] py-2 px-4 max-w-[480px] mx-auto z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive ? "text-[#389C9A]" : "text-[#1D1D1D]/40 hover:text-[#1D1D1D]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
