import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Mail, Lock, Building2, Eye, EyeOff, ArrowRight } from "lucide-react";

export function BusinessAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        // Validate inputs
        if (!businessName.trim()) {
          throw new Error("Business name is required");
        }
        if (!fullName.trim()) {
          throw new Error("Contact person name is required");
        }

        // 1️⃣ Sign up with metadata
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              business_name: businessName,
              user_type: "business",
              role: "business"
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?role=business`
          }
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No user returned from signup");

        // 2️⃣ Insert into businesses table with all required fields
        const { error: businessError } = await supabase
          .from("businesses")
          .insert({
            user_id: authData.user.id,
            business_name: businessName.trim(),
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            status: "pending_review",
            application_status: "pending",
            verification_status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (businessError) {
          console.error("Business insert error:", businessError);
          throw new Error("Failed to create business profile");
        }

        toast.success("Registration submitted! Please check your email to confirm.");
        
        // Redirect to confirmation page
        navigate("/confirm-email", { 
          state: { email, role: "business" } 
        });

      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned from login");

        // Fetch business info with status check
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (businessError) throw businessError;

        // Check if business profile exists
        if (!businessData) {
          await supabase.auth.signOut();
          throw new Error("No business profile found. Please register first.");
        }

        // Check if business is rejected
        if (businessData.status === "rejected" || businessData.application_status === "rejected") {
          await supabase.auth.signOut();
          throw new Error("Your business application has been rejected. Please contact support.");
        }

        // Check if business is pending (allow login but show banner later)
        if (businessData.status === "pending_review" || businessData.application_status === "pending") {
          toast.info("Your application is still under review. You'll have limited access.");
        }

        toast.success("Login successful!");
        navigate("/business/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            LiveLink<span className="text-[#389C9A]">.</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            {mode === "login" ? "Business Login" : "Business Registration"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
                  required
                  disabled={loading}
                />
              </div>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                PROCESSING...
              </>
            ) : (
              <>
                {mode === "login" ? "SIGN IN" : "REGISTER"} 
                <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
              </>
            )}
          </button>

          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mt-4">
            {mode === "login" ? (
              <>
                Don't have a business account?{" "}
                <button
                  type="button"
                  className="text-[#389C9A] hover:underline"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-[#389C9A] hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </form>

        {mode === "register" && (
          <p className="text-[8px] text-[#1D1D1D]/30 text-center mt-6">
            By registering, you agree to our Terms of Service and Privacy Policy.
            Your application will be reviewed within 24-48 hours.
          </p>
        )}
      </div>
    </div>
  );
}

// Add missing User icon import
function User(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
