import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, Eye, EyeOff, Shield, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in as admin
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: adminProfile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      const isAdmin = !!adminProfile || session.user.app_metadata?.role === "admin";
      if (isAdmin) navigate("/admin");
    };
    check();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Verify this user is actually an admin
      const { data: adminProfile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      const isAdmin = !!adminProfile || data.user.app_metadata?.role === "admin";

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("Access denied. This portal is for administrators only.");
      }

      toast.success("Welcome back, Admin.");
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1D1D1D] flex flex-col items-center justify-center px-6 text-white">
      <Toaster position="top-center" theme="dark" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Badge */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#FEDB71] border-2 border-[#FEDB71] flex items-center justify-center mb-5">
            <Shield className="w-8 h-8 text-[#1D1D1D]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white">Admin Portal</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1 italic">
            LiveLink Internal Access Only
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 p-4 flex gap-3 mb-6"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest italic text-white/40">
              Email Address
            </label>
            <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#FEDB71] transition-all">
              <Mail className="w-4 h-4 ml-4 flex-shrink-0 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@livelink.com"
                required
                disabled={loading}
                className="flex-1 py-4 px-4 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic text-white placeholder:text-white/20 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest italic text-white/40">
              Password
            </label>
            <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-[#FEDB71] transition-all">
              <Lock className="w-4 h-4 ml-4 flex-shrink-0 text-white/30" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="flex-1 py-4 px-4 text-sm font-bold bg-transparent outline-none text-white placeholder:text-white/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-4 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`mt-2 flex items-center justify-between p-5 font-black uppercase tracking-widest text-[10px] italic transition-all ${
              loading || !email || !password
                ? "bg-white/10 text-white/30 cursor-not-allowed"
                : "bg-[#FEDB71] text-[#1D1D1D] hover:bg-white active:scale-[0.98]"
            }`}
          >
            <span>{loading ? "Verifying..." : "Sign In to Admin"}</span>
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Shield className="w-4 h-4" />
            }
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[9px] font-medium uppercase tracking-widest text-white/20 italic">
            Unauthorised access attempts are logged and reported.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
