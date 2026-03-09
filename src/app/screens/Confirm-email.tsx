import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Mail, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useBusinessRegistration } from "../hooks/useBusinessRegistration";

export function ConfirmEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";
  const [resent, setResent] = useState(false);
  const { resendConfirmationEmail, loading } = useBusinessRegistration();

  const handleResend = async () => {
    if (!email) return;
    const ok = await resendConfirmationEmail(email);
    if (ok) setResent(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-[#1D1D1D]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
          <Mail className="w-9 h-9 text-[#389C9A]" />
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
          Check Your Email
        </h1>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">
          Confirm your account to continue
        </p>

        {/* Email display */}
        <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] px-5 py-4 mb-8">
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
            Confirmation sent to
          </p>
          <p className="text-sm font-black truncate">{email || "your email address"}</p>
        </div>

        {/* Steps */}
        <div className="text-left border-2 border-[#1D1D1D]/10 p-5 mb-8">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">What to do</p>
          {[
            "Open the email from LiveLink",
            "Click the confirmation link",
            "You'll be redirected to login",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <span className="text-[#389C9A] font-black text-xs mt-0.5">{i + 1}.</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{step}</span>
            </div>
          ))}
        </div>

        {/* Resent success */}
        {resent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center bg-[#389C9A]/10 border border-[#389C9A]/30 px-4 py-3 mb-4"
          >
            <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#389C9A]">
              Email resent successfully
            </span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate("/login/portal")}
            className="w-full bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
          >
            Go to Login <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
          </button>

          <button
            onClick={handleResend}
            disabled={loading || resent}
            className="w-full border-2 border-[#1D1D1D]/20 py-4 text-[10px] font-black uppercase tracking-widest hover:border-[#1D1D1D] transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Sending..." : resent ? "Email Sent" : "Resend Email"}
          </button>
        </div>

        <p className="text-[8px] font-medium opacity-30 uppercase tracking-widest mt-6">
          Check your spam folder if you can't find it
        </p>
      </motion.div>
    </div>
  );
}
