import React from "react";
import { Outlet } from "react-router";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Outlet />
    </div>
  );
}
