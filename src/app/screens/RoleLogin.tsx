import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast, Toaster } from "sonner";

interface RoleLoginProps {
  role: "creator" | "business" | "admin";
  redirectTo: string;
}

export function RoleLogin({ role, redirectTo }: RoleLoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("No user returned from login");
        setLoading(false);
        return;
      }

      // 2. Get user metadata to check role
      const userRole = data.user.user_metadata?.role || 
                       data.user.user_metadata?.user_type;

      // 3. Verify role matches the login page
      if (userRole !== role) {
        // Double-check in appropriate table based on role
        if (role === "creator") {
          const { data: creator } = await supabase
            .from("creator_profiles")
            .select("id, status")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!creator) {
            await supabase.auth.signOut();
            toast.error("No creator profile found for this account");
            setLoading(false);
            return;
          }

          if (creator.status === "rejected") {
            toast.error("Your creator application has been rejected");
            setLoading(false);
            return;
          }

          // If we found a creator profile, proceed
          toast.success("Logged in successfully!");
          navigate(redirectTo);
          return;
        }

        if (role === "business") {
          const { data: business } = await supabase
            .from("businesses")
            .select("id, status, application_status")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!business) {
            await supabase.auth.signOut();
            toast.error("No business profile found for this account");
            setLoading(false);
            return;
          }

          if (business.status === "rejected" || business.application_status === "rejected") {
            toast.error("Your business application has been rejected");
            setLoading(false);
            return;
          }

          toast.success("Logged in successfully!");
          navigate(redirectTo);
          return;
        }

        if (role === "admin") {
          // Check if user is admin from metadata
          const isAdmin = userRole === "admin" || 
                         data.user.user_metadata?.is_admin === true;
          
          if (!isAdmin) {
            await supabase.auth.signOut();
            toast.error("Unauthorized: Not an admin account");
            setLoading(false);
            return;
          }
        }
      }

      // 4. If we get here, role matches metadata
      toast.success("Logged in successfully!");
      navigate(redirectTo);

    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch(role) {
      case "creator": return "Creator";
      case "business": return "Business";
      case "admin": return "Admin";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-[#1D1D1D]">
      <Toaster position="top-center" richColors />
      
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            {getRoleTitle()} Login
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Sign in to your {role} account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
              required
              disabled={loading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                SIGNING IN...
              </>
            ) : (
              <>
                SIGN IN <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
              </>
            )}
          </button>
        </form>

        {/* Help links */}
        <div className="mt-6 text-center space-y-2">
          <button 
            onClick={() => navigate("/forgot-password")}
            className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#389C9A] transition-colors"
          >
            Forgot password?
          </button>
          <p className="text-[8px] font-medium text-[#1D1D1D]/20">
            Don't have an account?{" "}
            <button 
              onClick={() => navigate(role === "business" ? "/become-business" : "/become-creator")}
              className="text-[#389C9A] font-black hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
