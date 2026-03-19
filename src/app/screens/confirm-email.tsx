import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Mail, RefreshCw, ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export function ConfirmEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creator");
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [useOtp, setUseOtp] = useState(false);
  const [bypassMode, setBypassMode] = useState(false); // Set to true to bypass email confirmation

  // Check for email confirmation on component mount
  useEffect(() => {
    // Get email and role from location state (passed from registration)
    if (location.state) {
      setEmail((location.state as any)?.email || "");
      setRole((location.state as any)?.role || "creator");
    }

    // Check if we have a token in the URL (from email link)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    // Supabase sends confirmation with access_token in hash
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    
    // Or sometimes in query params
    const tokenFromQuery = queryParams.get("token");
    const tokenHash = queryParams.get("token_hash");

    // DEVELOPMENT BYPASS - Set this to true to skip email confirmation
    const DEV_BYPASS = true; // Change to false in production
    
    if (DEV_BYPASS) {
      // Automatically mark as verified for development
      console.log("⚠️ DEVELOPMENT MODE: Bypassing email confirmation");
      setVerified(true);
      setVerifying(false);
      setTimeout(() => {
        if (role === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
      return;
    }

    if (accessToken && type === "signup") {
      // Handle automatic confirmation
      handleAutoConfirm(accessToken, refreshToken);
    } else if (tokenHash) {
      // Handle token hash verification
      handleTokenVerification(tokenHash);
    } else if (tokenFromQuery) {
      // Handle direct token from query
      handleDirectToken(tokenFromQuery);
    } else {
      setVerifying(false);
    }
  }, [location]);

  const handleAutoConfirm = async (accessToken: string, refreshToken?: string) => {
    try {
      setVerifying(true);
      
      // Set the session with the provided tokens
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (error) throw error;

      setVerified(true);
      toast.success("Email confirmed successfully!");
      
      // Redirect to appropriate dashboard after 2 seconds
      setTimeout(() => {
        if (role === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (error: any) {
      console.error("Auto confirm error:", error);
      setError(error.message || "Failed to confirm email");
      setVerifying(false);
    }
  };

  const handleTokenVerification = async (tokenHash: string) => {
    try {
      setVerifying(true);
      
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (error) throw error;

      setVerified(true);
      toast.success("Email confirmed successfully!");
      
      setTimeout(() => {
        if (role === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (error: any) {
      console.error("Token verification error:", error);
      setError(error.message || "Failed to verify email");
      setVerifying(false);
    }
  };

  const handleDirectToken = async (token: string) => {
    try {
      setVerifying(true);
      
      // Try to verify with just the token
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) throw error;

      setVerified(true);
      toast.success("Email confirmed successfully!");
      
      setTimeout(() => {
        if (role === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (error: any) {
      console.error("Direct token error:", error);
      setError(error.message || "Failed to verify email");
      setVerifying(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!email || !token) {
      toast.error("Please enter both email and verification code");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      setVerified(true);
      toast.success("Email confirmed successfully!");
      
      setTimeout(() => {
        if (role === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("No email address provided");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email?role=${role}`
        }
      });

      if (error) throw error;
      
      setResent(true);
      toast.success("Confirmation email resent! Please check your inbox.");
      
      // Reset resent status after 5 seconds
      setTimeout(() => setResent(false), 5000);
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to resend confirmation email");
    } finally {
      setLoading(false);
    }
  };

  // If verifying, show loading
  if (verifying) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-[#389C9A] mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase tracking-tighter italic mb-2">
            Verifying your email...
          </h2>
          <p className="text-[#1D1D1D]/60">Please wait a moment</p>
        </motion.div>
      </div>
    );
  }

  // If verified, show success
  if (verified) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#389C9A]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
            Email Confirmed!
          </h1>
          <p className="text-[#1D1D1D]/60 mb-8">
            Your email has been successfully verified. Redirecting you to your dashboard...
          </p>
          <div className="w-full h-1 bg-[#1D1D1D]/10 overflow-hidden rounded-full">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 2, ease: "linear" }}
              className="h-full bg-[#389C9A]"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
            Verification Failed
          </h1>
          <p className="text-[#1D1D1D]/60 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setVerifying(false);
            }}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Main confirm email UI
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-[#1D1D1D]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Icon */}
        <div className="w-20 h-20 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
          <Mail className="w-9 h-9 text-[#389C9A]" />
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2 text-center">
          Check Your Email
        </h1>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-8 text-center">
          {useOtp ? "Enter verification code" : "Confirm your account to continue"}
        </p>

        {/* Email display */}
        <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] px-5 py-4 mb-8">
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
            Confirmation sent to
          </p>
          <p className="text-sm font-black truncate">{email || "your email address"}</p>
        </div>

        {/* OTP Verification Input (shown when toggled) */}
        {useOtp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mb-6 space-y-4"
          >
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-center text-xl font-mono tracking-widest rounded-xl"
              />
            </div>
            <button
              onClick={handleOtpVerification}
              disabled={loading || !token || token.length < 6}
              className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Code"}
            </button>
          </motion.div>
        )}

        {/* Steps (shown when not using OTP) */}
        {!useOtp && (
          <div className="text-left border-2 border-[#1D1D1D]/10 p-5 mb-8">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">What to do</p>
            {[
              "Open the email from LiveLink",
              "Click the confirmation link",
              "You'll be automatically verified",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="text-[#389C9A] font-black text-xs mt-0.5">{i + 1}.</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Toggle between email link and OTP */}
        <button
          onClick={() => setUseOtp(!useOtp)}
          className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline mb-4 block text-center"
        >
          {useOtp ? "← Back to email instructions" : "Having trouble? Use verification code instead"}
        </button>

        {/* Development Bypass Button (only visible in development) */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              setVerified(true);
              setTimeout(() => {
                if (role === "business") {
                  navigate("/business/dashboard");
                } else {
                  navigate("/dashboard");
                }
              }, 1000);
            }}
            className="w-full mb-3 py-3 border-2 border-yellow-500 text-yellow-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-50 transition-colors"
          >
            ⚡ DEV MODE: Skip Email Confirmation
          </button>
        )}

        {/* Resent success */}
        {resent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center bg-[#389C9A]/10 border border-[#389C9A]/30 px-4 py-3 mb-4 rounded-xl"
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
            onClick={handleResend}
            disabled={loading || resent}
            className="w-full border-2 border-[#1D1D1D]/20 py-4 text-[10px] font-black uppercase tracking-widest hover:border-[#1D1D1D] transition-colors flex items-center justify-center gap-2 rounded-xl disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            )}
            {loading ? "Sending..." : resent ? "Email Sent" : "Resend Email"}
          </button>

          <button
            onClick={() => navigate("/login/portal")}
            className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors py-2"
          >
            Return to Login
          </button>
        </div>

        <p className="text-[8px] font-medium opacity-30 uppercase tracking-widest text-center mt-8">
          Check your spam folder if you can't find the email
        </p>
      </motion.div>
    </div>
  );
}
