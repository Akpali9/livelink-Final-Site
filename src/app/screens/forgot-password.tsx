import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-[#389C9A]" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
            Check Your Email
          </h1>
          
          <p className="text-[#1D1D1D]/60 mb-8 text-sm">
            We've sent a password reset link to <span className="font-bold text-[#389C9A]">{email}</span>
          </p>

          <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 mb-8 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">
              What happens next
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">1.</span>
                <p className="text-xs font-medium">Click the link in the email</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">2.</span>
                <p className="text-xs font-medium">Create a new password</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">3.</span>
                <p className="text-xs font-medium">Log in with your new password</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/login/portal")}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center justify-center gap-2"
          >
            Return to Login <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
          </button>

          <p className="text-[8px] text-[#1D1D1D]/30 text-center mt-6">
            Didn't receive the email? Check your spam folder or{" "}
            <button
              onClick={() => setSubmitted(false)}
              className="text-[#389C9A] font-black hover:underline"
            >
              try again
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            Forgot Password?
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Enter your email to reset your password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-12 pr-4 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SENDING...
              </>
            ) : (
              <>
                SEND RESET LINK <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login/portal")}
            className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
          >
            ← Back to Login
          </button>
        </form>

        <p className="text-[8px] text-[#1D1D1D]/20 text-center mt-8">
          We'll send you a link to reset your password. The link will expire in 1 hour.
        </p>
      </div>
    </div>
  );
}
