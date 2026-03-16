import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Apple, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";

export function CreatorLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Create a profile if not exists
  const createProfileIfNotExists = async (user: any) => {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking profile:", fetchError.message);
        return;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            role: "creator",
            full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? "Creator",
            avatar_url: user.user_metadata?.avatar_url ?? "",
            email: user.email,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Profile creation error:", insertError.message);
          // Don't throw - we still want to log the user in even if profile creation fails
        }
      }
    } catch (err) {
      console.error("Unexpected error in profile creation:", err);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) throw error;
      
      toast.success("Verification email resent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  // Handle email/password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      if (!email.trim() || !password.trim()) {
        throw new Error("Please enter both email and password");
      }

      // 1️⃣ Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("Email not confirmed")) {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-bold">Please verify your email first</p>
              <p className="text-xs">Check your inbox for the verification link.</p>
              <button
                onClick={handleResendConfirmation}
                disabled={resending}
                className="text-xs bg-white text-black px-3 py-1.5 mt-2 font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors rounded-none"
              >
                {resending ? "Sending..." : "Resend Verification Email"}
              </button>
            </div>,
            { duration: 10000 }
          );
          setLoading(false);
          return;
        }
        
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password");
        }
        
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("No user returned from login");
      }

      // 2️⃣ Check if email is confirmed
      if (!data.user.email_confirmed_at) {
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-bold">Email not verified</p>
            <p className="text-xs">Please verify your email before logging in.</p>
            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="text-xs bg-white text-black px-3 py-1.5 mt-2 font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors rounded-none"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>,
          { duration: 10000 }
        );
        
        // Sign out since email isn't confirmed
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 3️⃣ Fetch creator data to check status
      const { data: creator, error: creatorError } = await supabase
        .from("creators")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (creatorError) {
        console.error("Error fetching creator:", creatorError);
        // Still allow login but log the error
      }

      // 4️⃣ Check creator status
      if (creator) {
        if (creator.status === 'pending_verification') {
          toast.info(
            <div className="flex flex-col gap-2">
              <p className="font-bold">Application Pending Review</p>
              <p className="text-xs">Your creator application is still being reviewed by our team. You'll receive an email once approved.</p>
            </div>,
            { duration: 8000 }
          );
          // Allow access but show pending message
        } else if (creator.status === 'rejected') {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-bold">Application Not Approved</p>
              <p className="text-xs">Your creator application was not approved. Please contact support for more information.</p>
            </div>,
            { duration: 8000 }
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      // 5️⃣ Ensure profile exists (upsert to be safe)
      await createProfileIfNotExists(data.user);

      // 6️⃣ Success!
      toast.success("Login successful! Redirecting to dashboard...");
      
      // Store user data in session if needed
      sessionStorage.setItem("userRole", "creator");

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google/Apple OAuth login
  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || `${provider} login failed`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-8 pt-16 pb-12">
      <Toaster position="top-center" richColors />
      
      {/* Top Section */}
      <div className="flex flex-col items-center mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-8 h-8 bg-[#1D1D1D] flex items-center justify-center">
            <div className="w-4 h-4 bg-[#FEDB71]" />
          </div>
          <span className="text-2xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            LiveLink
          </span>
        </motion.div>

        <div className="px-4 py-1.5 bg-[#FEDB71]/10 border border-[#FEDB71]/20 rounded-full mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E] italic">
            Creator Portal
          </span>
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-2">
          Welcome Back
        </h1>
        <p className="text-sm font-medium italic text-[#1D1D1D]/40 text-center max-w-[280px] leading-relaxed">
          Sign in to manage your campaigns and connect with brands.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
        <div className="space-y-6">
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic ml-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/20 group-focus-within:text-[#D2691E] transition-colors" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D]/5 focus:border-[#1D1D1D] focus:bg-white p-5 pl-14 text-sm font-medium italic outline-none transition-all placeholder:text-[#1D1D1D]/20"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/20 group-focus-within:text-[#D2691E] transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D]/5 focus:border-[#1D1D1D] focus:bg-white p-5 pl-14 pr-14 text-sm font-medium italic outline-none transition-all placeholder:text-[#1D1D1D]/20"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-lg transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#1D1D1D]/40" /> : <Eye className="w-4 h-4 text-[#1D1D1D]/40" />}
              </button>
            </div>
            <Link 
              to="/forgot-password" 
              className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D] text-right mt-1 hover:text-[#D2691E] transition-colors italic"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1D1D1D] text-white p-5 text-lg font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Sign In"} 
          {!loading && <ArrowRight className="w-6 h-6 text-[#FEDB71]" />}
        </button>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="flex items-center justify-center gap-3 border-2 border-[#1D1D1D]/10 p-4 hover:border-[#1D1D1D] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            disabled={loading}
            className="flex items-center justify-center gap-3 border-2 border-[#1D1D1D]/10 p-4 hover:border-[#1D1D1D] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Apple className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Apple</span>
          </button>
        </div>
      </form>

      {/* Bottom Section */}
      <div className="mt-12 text-center">
        <div className="h-[1px] bg-[#1D1D1D]/10 w-full mb-8" />
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
            Don't have an account?{" "}
            <Link to="/become-creator" className="text-[#1D1D1D] hover:underline decoration-2 underline-offset-4">
              Apply to Join
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest italic text-[#1D1D1D]/30">
            Are you a business?{" "}
            <Link to="/login/business" className="text-[#D2691E] hover:underline decoration-1 underline-offset-4">
              Business Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Email Verification Help */}
      {email && (
        <div className="mt-4 text-center">
          <button
            onClick={handleResendConfirmation}
            disabled={resending}
            className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/30 hover:text-[#389C9A] transition-colors italic"
          >
            {resending ? "Sending..." : "Didn't receive verification email? Resend"}
          </button>
        </div>
      )}
    </div>
  );
}
