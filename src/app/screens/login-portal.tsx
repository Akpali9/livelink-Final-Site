import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Zap, Shield, Users, Lock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";

export function LoginPortal() {
  const navigate = useNavigate();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Secret: tap the LiveLink badge 5 times to reveal admin login
  const handleLogoBadgeTap = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) {
      setShowAdminForm(true);
      setLogoTaps(0);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      toast.error("Invalid credentials");
      setLoading(false);
      return;
    }

    // Verify they're actually in admin_profiles
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!adminProfile) {
      await supabase.auth.signOut();
      toast.error("Not authorised as admin");
      setLoading(false);
      return;
    }

    toast.success("Welcome, Admin");
    navigate("/admin");
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleLogoBadgeTap}
          className="inline-flex items-center gap-2 px-3 py-1 bg-[#1D1D1D] text-white text-[10px] font-bold uppercase tracking-widest mb-6 italic cursor-default select-none"
        >
          <span className="w-1.5 h-1.5 bg-[#FEDB71] rounded-none animate-pulse" />
          LiveLink
          {/* Subtle indicator after 3 taps */}
          {logoTaps >= 3 && logoTaps < 5 && (
            <span className="w-1.5 h-1.5 bg-[#389C9A] rounded-none animate-pulse ml-1" />
          )}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2"
        >
          Welcome Back
        </motion.h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium italic">
          Select your account type to continue
        </p>
      </div>

      <main className="flex-1 px-8 py-12 max-w-[480px] mx-auto w-full">

        {/* ── Admin Login Form (hidden until triggered) ── */}
        <AnimatePresence>
          {showAdminForm && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              className="mb-8 border-2 border-[#1D1D1D] p-6 bg-[#1D1D1D] text-white"
            >
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-3.5 h-3.5 text-[#FEDB71]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] italic text-[#FEDB71]">Admin Access</span>
              </div>

              <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Admin email"
                  required
                  className="w-full bg-white/10 border border-white/20 px-4 py-3 text-[11px] font-bold italic text-white placeholder-white/30 focus:outline-none focus:border-[#389C9A] transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-white/10 border border-white/20 px-4 py-3 text-[11px] font-bold italic text-white placeholder-white/30 focus:outline-none focus:border-[#389C9A] transition-colors"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#389C9A] text-white py-3 text-[10px] font-black uppercase tracking-widest italic hover:bg-[#FEDB71] hover:text-[#1D1D1D] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    {loading ? "Signing in..." : "Enter"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdminForm(false); setEmail(""); setPassword(""); }}
                    className="px-4 py-3 border border-white/20 text-[10px] font-black uppercase italic text-white/50 hover:text-white hover:border-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Creator & Business Login ── */}
        <div className="flex flex-col gap-4 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Link
              to="/login/creator"
              className="flex items-center justify-between bg-[#1D1D1D] text-white p-8 font-black uppercase tracking-tight italic hover:bg-[#389C9A] transition-all active:scale-[0.98] group"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#FEDB71]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Creator</span>
                </div>
                <p className="text-xl">Sign In as Creator</p>
              </div>
              <ArrowRight className="w-6 h-6 text-[#389C9A] group-hover:text-[#FEDB71] transition-colors" />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Link
              to="/login/business"
              className="flex items-center justify-between border-2 border-[#1D1D1D] text-[#1D1D1D] p-8 font-black uppercase tracking-tight italic hover:bg-[#1D1D1D] hover:text-white transition-all active:scale-[0.98] group"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#389C9A]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/60">Business</span>
                </div>
                <p className="text-xl">Sign In as Business</p>
              </div>
              <ArrowRight className="w-6 h-6 text-[#1D1D1D] group-hover:text-[#FEDB71] transition-colors" />
            </Link>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-[1px] flex-1 bg-[#1D1D1D]/10" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/30 italic">New here?</span>
          <div className="h-[1px] flex-1 bg-[#1D1D1D]/10" />
        </div>

        {/* Register options */}
        <div className="flex flex-col gap-3">
          <Link
            to="/become-creator"
            className="flex items-center justify-between border border-[#1D1D1D]/20 p-6 hover:border-[#389C9A] hover:bg-[#389C9A]/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#389C9A]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#389C9A]" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-0.5">Become a Creator</p>
                <p className="text-[9px] font-medium text-[#1D1D1D]/40 uppercase tracking-widest italic">Earn from your streams</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#1D1D1D]/30 group-hover:text-[#389C9A] transition-colors" />
          </Link>

          <Link
            to="/become-business"
            className="flex items-center justify-between border border-[#1D1D1D]/20 p-6 hover:border-[#FEDB71] hover:bg-[#FEDB71]/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FEDB71]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#1D1D1D]/60" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-0.5">Register Business</p>
                <p className="text-[9px] font-medium text-[#1D1D1D]/40 uppercase tracking-widest italic">Sponsor live streamers</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#1D1D1D]/30 group-hover:text-[#1D1D1D] transition-colors" />
          </Link>
        </div>

        <div className="mt-12 text-center">
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/30 hover:text-[#1D1D1D] transition-colors italic">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
