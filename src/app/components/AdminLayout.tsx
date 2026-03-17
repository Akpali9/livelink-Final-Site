// app/components/AdminLayout.tsx
import React from "react";
import { Outlet } from "react-router";

export function AdminLayout() {
  return (
    <div className="admin-layout">
      {/* You can add admin-specific header/sidebar here if needed */}
      <Outlet />
    </div>
  );
}
