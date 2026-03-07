import React from "react";
import { useAuth } from "../lib/contexts/AuthContext";
import { Navigate } from "react-router";
import { AppHeader } from "../components/app-header";

export function Settings() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader 
        title="SETTINGS" 
        showBack={true}
        userType="creator"
      />
      <main className="p-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic mb-6">
            Account Settings
          </h1>
          
          <div className="space-y-6">
            <div className="border border-[#1D1D1D]/10 p-5">
              <h2 className="font-black uppercase text-sm mb-4 italic">Profile Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 italic">
                    Email
                  </label>
                  <p className="text-sm">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 italic">
                    User ID
                  </label>
                  <p className="text-sm font-mono text-xs">{user?.id}</p>
                </div>
              </div>
            </div>

            <div className="border border-[#1D1D1D]/10 p-5">
              <h2 className="font-black uppercase text-sm mb-4 italic">Preferences</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Push notifications</span>
                </label>
              </div>
            </div>

            <div className="border border-[#1D1D1D]/10 p-5">
              <h2 className="font-black uppercase text-sm mb-4 italic">Danger Zone</h2>
              <button className="bg-red-500 text-white px-4 py-2 text-xs font-black uppercase tracking-widest italic hover:bg-red-600 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}