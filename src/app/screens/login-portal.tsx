import React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Zap, Shield, Users } from "lucide-react";

export function LoginPortal() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-[#1D1D1D] text-white text-[10px] font-bold uppercase tracking-widest mb-6 italic"
        >
          <span className="w-1.5 h-1.5 bg-[#FEDB71] rounded-none animate-pulse" />
          LiveLink
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
        <div className="flex flex-col gap-4 mb-12">
          {/* Creator Login */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
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

          {/* Business Login */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
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
