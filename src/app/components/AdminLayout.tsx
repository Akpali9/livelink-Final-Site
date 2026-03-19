import React from "react";
import { Outlet, useNavigate } from "react-router";
import { LogOut, Shield, Menu, X, BarChart3, Users, Building2, Megaphone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useState } from "react";

export function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login/portal");
  };

  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Creators", path: "/admin/creators" },
    { icon: Building2, label: "Businesses", path: "/admin/businesses" },
    { icon: Megaphone, label: "Campaigns", path: "/admin/campaigns" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Sidebar - Always visible on desktop, toggle on mobile */}
      <div className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
        {/* Mobile menu button - only shown when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border-2 border-[#1D1D1D] rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed top-0 left-0 h-full w-72 bg-white border-r border-[#1D1D1D]/10 z-50
            flex flex-col
            transform transition-transform duration-200 ease-in-out
            lg:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="p-6 border-b border-[#1D1D1D]/10 flex justify-between items-center">
            <h1 className="text-xl font-black uppercase tracking-tighter italic">
              Admin<span className="text-[#389C9A]">.</span>
            </h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-[#1D1D1D]/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-lg rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black uppercase tracking-tight">Admin User</p>
                <p className="text-[10px] opacity-40 uppercase tracking-widest">Super Admin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] text-[#1D1D1D]/60 hover:text-[#1D1D1D] transition-all rounded-lg"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-[#1D1D1D]/10">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all rounded-lg"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - with left margin on desktop to account for fixed sidebar */}
      <div className="lg:pl-72 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
