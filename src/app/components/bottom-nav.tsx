import React from "react";
import { Link, useLocation } from "react-router";
import { Home, Search, Bell, User, Briefcase } from "lucide-react";

interface BottomNavProps {
  userType?: "creator" | "business";
  unreadNotifications?: number;
}

export function BottomNav({ userType = "creator", unreadNotifications = 0 }: BottomNavProps) {
  const location = useLocation();

  const creatorNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Browse", path: "/browse" },
    { icon: Briefcase, label: "Campaigns", path: "/campaigns" },
    {
      icon: Bell,
      label: "Alerts",
      path: userType === "business" ? "/notifications?role=business" : "/notifications?role=creator",
      badge: unreadNotifications,
    },
    {
      icon: User,
      label: "Profile",
      path: userType === "business" ? "/business/profile" : "/profile/me",
    },
  ];

  const businessNavItems = [
    { icon: Home, label: "Home", path: "/business/dashboard" },
    { icon: Search, label: "Browse", path: "/browse" },
    { icon: Briefcase, label: "Campaigns", path: "/business/campaigns" },
    {
      icon: Bell,
      label: "Notification",
      path: "/notifications?role=business",
      badge: unreadNotifications,
    },
    { icon: User, label: "Profile", path: "/business/profile" },
  ];

  const navItems = userType === "business" ? businessNavItems : creatorNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1D1D1D] z-50">
      <div className="flex justify-around items-stretch max-w-7xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname + location.search === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative flex flex-col items-center justify-center gap-1 py-3 px-2 flex-1
                transition-colors duration-100 active:bg-[#1D1D1D]/5
                ${isActive
                  ? "text-[#389C9A] border-t-2 border-[#389C9A] -mt-[2px]"
                  : "text-[#1D1D1D]/40 hover:text-[#1D1D1D] border-t-2 border-transparent -mt-[2px]"
                }
              `}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge != null && item.badge > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-[#FEDB71] border border-[#1D1D1D] flex items-center justify-center">
                    <span className="text-[8px] font-black text-[#1D1D1D] px-0.5 leading-none">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`text-[7px] font-black uppercase tracking-widest leading-none ${
                  isActive ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
