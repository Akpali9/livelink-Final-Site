import React, { useState } from "react";
import { motion } from "motion/react";
import { Video as VideoIcon, Building, ChevronRight, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export function LoginPortal() {
  const [selectedRole, setSelectedRole] = useState<"creator" | "business" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      toast.error("Please select a role first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
      
      // The redirect happens automatically, no need to navigate
    } catch (error: any) {
      console.error(error.message);
      toast.error(error.message || "Failed to login with Google");
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    if (!selectedRole) {
      toast.error("Please select a role first");
      return;
    }
    
    // Navigate to role-specific login page
    if (selectedRole === "creator") {
      navigate("/login/creator");
    } else {
      navigate("/login/business");
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1D1D1D] flex items-center justify-center border-2 border-[#FEDB71]">
              <div className="w-6 h-6 bg-[#389C9A]" />
            </div>
            <span className="text-4xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">
              LiveLink<span className="text-[#389C9A]">.</span>
            </span>
          </div>
        </motion.div>

        {/* Role Selection */}
        {!selectedRole && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 text-center mb-2">
              Select Account Type
            </h2>

            <button 
              onClick={() => setSelectedRole("creator")} 
              className="group flex items-center justify-between p-8 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#389C9A]/10 rounded-xl flex items-center justify-center group-hover:bg-white/10">
                  <VideoIcon className="w-6 h-6 text-[#389C9A] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tight text-lg mb-1">I'm a Creator</h3>
                  <p className="text-[10px] opacity-60 group-hover:opacity-80">Access campaigns and manage earnings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => setSelectedRole("business")} 
              className="group flex items-center justify-between p-8 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#389C9A]/10 rounded-xl flex items-center justify-center group-hover:bg-white/10">
                  <Building className="w-6 h-6 text-[#389C9A] group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tight text-lg mb-1">I'm a Business</h3>
                  <p className="text-[10px] opacity-60 group-hover:opacity-80">Manage campaigns and find creators</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {/* Login Options */}
        {selectedRole && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 text-center mb-2">
              Continue as {selectedRole === "creator" ? "Creator" : "Business"}
            </h2>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 p-5 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-black uppercase tracking-widest">Continue with Google</span>
                </>
              )}
            </button>

            <button 
              onClick={handleEmailLogin}
              disabled={loading}
              className="group flex items-center justify-center gap-3 p-5 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">Continue with Email</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#FEDB71]" />
            </button>

            <button 
              onClick={handleBack}
              className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              ← Back to role selection
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-[8px] text-center text-[#1D1D1D]/20 mt-12">
          By continuing, you agree to LiveLink's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
