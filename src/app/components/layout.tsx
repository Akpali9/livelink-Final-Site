import React from "react";
import { Outlet, useLocation } from "react-router";

export function RootLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1D1D1D] font-['Inter',sans-serif] selection:bg-[#389C9A] selection:text-white overflow-x-hidden">
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-white relative border-x border-[#1D1D1D]/10">
        <Outlet />
      </div>
    </div>
  );
}
