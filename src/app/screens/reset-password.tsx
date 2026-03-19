import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get("access_token");
    
    if (token) {
      setAccessToken(token);
    } else {
      setError("Invalid or expired reset link. Please request a new one.");
    }
  }, []);

  const getPasswordStrength = (password: string) => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^A-Za-z0-9]/)) score++;
    
    if (password.length < 6) return { label: "Too Short", color: "text-red-500", score: 0 };
    if (score <= 1) return { label: "Weak", color: "text-red-500", score: 1 };
    if (score === 2) return { label: "Fair", color: "text-[#FEDB71]", score: 2 };
    if (score === 3) return { label: "Good", color: "text-[#389C9A]", score: 3 };
    return { label: "Strong", color: "text-green-500", score: 4 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Password updated successfully!");
      
      setTimeout(() => {
        navigate("/login/portal");
      }, 3000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setError(error.message);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
            Invalid Link
          </h1>
          
          <p className="text-[#1D1D1D]/60 mb-8 text-sm">
            {error}
          </p>

          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all"
          >
            Request New Link
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
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
            Password Updated!
          </h1>
          
          <p className="text-[#1D1D1D]/60 mb-8 text-sm">
            Your password has been successfully reset.
          </p>

          <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
              Redirecting to login...
            </p>
            <div className="w-full h-1 bg-[#1D1D1D]/10 overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-full bg-[#389C9A]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            Reset Password
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Enter your new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full pl-12 pr-12 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {strength && (
            <div className="mt-1">
              <div className="flex gap-1 h-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded-full transition-all ${
                      i <= strength.score
                        ? strength.color.replace("text", "bg")
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className={`text-[9px] font-black uppercase ${strength.color}`}>
                Password strength: {strength.label}
              </p>
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full pl-12 pr-12 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {confirmPassword && password !== confirmPassword && (
            <p className="text-[9px] font-black uppercase text-red-500 mt-1">
              Passwords do not match
            </p>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 6}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                UPDATING...
              </>
            ) : (
              <>
                RESET PASSWORD <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
