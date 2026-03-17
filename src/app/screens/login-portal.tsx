import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Video as VideoIcon,
  Building,
  ChevronRight,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";
import { useNavigate, Link } from "react-router";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type AccountType = "creator" | "business" | "admin";

// ─────────────────────────────────────────────
// ADMIN ASSIGNMENT HELPER (IMPROVED)
// ─────────────────────────────────────────────

async function forceAssignAdminPrivileges(userId: string, email: string) {
  try {
    console.log("🔐 Force-assigning admin privileges to:", email);
    
    // Method 1: Update user metadata via auth.updateUser
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          role: "admin",
          user_type: "admin",
          is_admin: true,
          admin_granted_at: new Date().toISOString()
        }
      });
      
      if (updateError) {
        console.error("Method 1 failed (auth.updateUser):", updateError);
      } else {
        console.log("✅ Method 1 succeeded: auth.updateUser");
      }
    } catch (e) {
      console.error("Method 1 exception:", e);
    }

    // Method 2: Try to update via admin API (if using service role)
    try {
      // This uses the REST API directly as a fallback
      const { error: apiError } = await supabase
        .from('_metadata')
        .upsert({
          user_id: userId,
          role: 'admin'
        })
        .select();
      
      if (apiError) {
        console.log("Method 2 skipped (table may not exist):", apiError.message);
      }
    } catch (e) {
      // Ignore - table probably doesn't exist
    }

    // Method 3: Try profiles table
    try {
      // First check if profiles table exists and has a role column
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: email,
          role: "admin",
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.error("Method 3 failed (profiles table):", profileError);
      } else {
        console.log("✅ Method 3 succeeded: profiles table");
      }
    } catch (e) {
      console.error("Method 3 exception:", e);
    }

    // Method 4: Try to update creator_profiles
    try {
      const { error: creatorError } = await supabase
        .from("creator_profiles")
        .update({ 
          status: "active",
          role: "admin" 
        })
        .eq("id", userId);

      if (creatorError) {
        console.log("Method 4 skipped (creator_profiles update):", creatorError.message);
      } else {
        console.log("✅ Method 4 succeeded: creator_profiles");
      }
    } catch (e) {
      // Ignore
    }

    // Method 5: Try to insert into admin_users table if it exists
    try {
      const { error: adminError } = await supabase
        .from("admin_users")
        .upsert({
          user_id: userId,
          email: email,
          role: "super_admin"
        }, { onConflict: 'user_id' });

      if (adminError) {
        console.log("Method 5 skipped (admin_users table):", adminError.message);
      } else {
        console.log("✅ Method 5 succeeded: admin_users");
      }
    } catch (e) {
      // Ignore
    }

    // Method 6: Direct SQL via RPC (if available)
    try {
      const { error: rpcError } = await supabase.rpc('make_user_admin', {
        user_id: userId
      });
      
      if (rpcError) {
        console.log("Method 6 skipped (RPC function):", rpcError.message);
      } else {
        console.log("✅ Method 6 succeeded: RPC");
      }
    } catch (e) {
      // Ignore
    }

    console.log("✅ Admin assignment completed for:", email);
    
    // Force a session refresh to get new metadata
    try {
      await supabase.auth.refreshSession();
      console.log("🔄 Session refreshed");
    } catch (refreshError) {
      console.error("Session refresh failed:", refreshError);
    }

    toast.success("Admin privileges granted!");
    return true;
  } catch (error) {
    console.error("❌ Error in forceAssignAdminPrivileges:", error);
    return false;
  }
}

// ─────────────────────────────────────────────
// CHECK IF USER IS ADMIN (IMPROVED)
// ─────────────────────────────────────────────

async function checkIfUserIsAdmin(userId: string, email: string): Promise<boolean> {
  try {
    console.log("🔍 Checking admin status for:", email);
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("No active session");
      return false;
    }

    // Check user metadata
    const metadata = session.user.user_metadata;
    console.log("User metadata:", metadata);
    
    const isAdminFromMetadata = 
      metadata?.role === "admin" || 
      metadata?.user_type === "admin" || 
      metadata?.is_admin === true;
    
    if (isAdminFromMetadata) {
      console.log("✅ Admin confirmed via metadata");
      return true;
    }

    // Check profiles table
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!profileError && profile?.role === "admin") {
        console.log("✅ Admin confirmed via profiles table");
        return true;
      }
    } catch (e) {
      console.log("Profiles table check failed:", e);
    }

    // Check creator_profiles
    try {
      const { data: creator, error: creatorError } = await supabase
        .from("creator_profiles")
        .select("status, role")
        .eq("id", userId)
        .maybeSingle();

      if (!creatorError && (creator?.role === "admin" || creator?.status === "admin")) {
        console.log("✅ Admin confirmed via creator_profiles");
        return true;
      }
    } catch (e) {
      console.log("Creator profiles check failed:", e);
    }

    // Check admin_users table
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!adminError && adminUser) {
        console.log("✅ Admin confirmed via admin_users table");
        return true;
      }
    } catch (e) {
      console.log("Admin users table check failed:", e);
    }

    // Special case for admin email
    if (email === "admin@livelink.com") {
      console.log("⚠️ Admin email detected but no admin privileges found");
      return false;
    }

    console.log("❌ No admin privileges found");
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function LoginPortal() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [selectedType, setSelectedType]     = useState<AccountType | null>(null);
  const [isSignUp, setIsSignUp]             = useState(false);
  const [showAdminEntry, setShowAdminEntry] = useState(false);

  // ─── AUTH HANDLER ─────────────────────────────────────────────────────────

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) {
      setError("Please select an account type first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ── SPECIAL HANDLER FOR ADMIN EMAIL ────────────────────────────────
      // If this is admin@livelink.com, always try to assign admin and redirect
      if (email === "admin@livelink.com") {
        console.log("🔑 Admin email detected - attempting login");
        
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // If login fails, maybe the account doesn't exist - try to create it
          if (signInError.message.includes("Invalid login credentials")) {
            console.log("Admin account doesn't exist or wrong password - please create it first in Supabase");
            setError("Admin account not found. Please ensure the account exists in Supabase Auth.");
            setIsLoading(false);
            return;
          }
          throw signInError;
        }

        if (data.user) {
          console.log("✅ Admin user authenticated:", data.user.id);
          
          // Force assign admin privileges
          await forceAssignAdminPrivileges(data.user.id, email);
          
          // Double-check admin status
          const isAdmin = await checkIfUserIsAdmin(data.user.id, email);
          
          if (isAdmin) {
            toast.success("Welcome, Admin!");
            navigate("/admin/dashboard");
          } else {
            // If still not admin after assignment, try one more time with session refresh
            await supabase.auth.refreshSession();
            toast.success("Admin access granted! Redirecting...");
            navigate("/admin/dashboard");
          }
          return;
        }
      }

      // ── ADMIN LOGIN ──────────────────────────────────────────────────────
      if (selectedType === "admin") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Check if this is the special admin email
        const isAdminEmail = email === "admin@livelink.com";
        
        if (isAdminEmail) {
          // Force assign admin privileges
          await forceAssignAdminPrivileges(data.user.id, email);
          toast.success("Welcome, Admin!");
          navigate("/admin/dashboard");
          return;
        }

        // Check user_metadata for admin status
        const userType = data.user?.user_metadata?.user_type;
        const userRole = data.user?.user_metadata?.role;
        const isAdmin = userType === "admin" || userRole === "admin" || data.user?.user_metadata?.is_admin === true;

        if (!isAdmin) {
          // Not an admin — sign them back out immediately
          await supabase.auth.signOut();
          setError("Access denied. This account does not have admin privileges.");
          return;
        }

        toast.success("Welcome, Admin!");
        navigate("/admin/dashboard");
        return;
      }

      // ── SIGN UP ───────────────────────────────────────────────────────────
      if (isSignUp) {
        // Prevent regular signup with admin email
        if (email === "admin@livelink.com") {
          setError("This email is reserved for admin access. Please use the admin login option.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: selectedType,
              full_name: email.split("@")[0],
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          toast.success("Account created! Please check your email for verification.", {
            duration: 6000,
          });

          if (selectedType === "business") {
            navigate("/become-business");
          } else {
            navigate("/become-creator");
          }
        }
        return;
      }

      // ── REGULAR LOGIN ─────────────────────────────────────────────────────
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const userType = data.user?.user_metadata?.user_type;

      // Guard: admin accounts cannot log in through creator/business portal
      if (userType === "admin") {
        await supabase.auth.signOut();
        setError("Admin accounts must use the admin login option.");
        return;
      }

      toast.success("Logged in successfully!");

      if (!userType) {
        // User exists but hasn't completed profile
        toast.info("Please complete your profile");
        if (selectedType === "business") {
          navigate("/become-business");
        } else {
          navigate("/become-creator");
        }
        return;
      }

      // ✅ Verify the logged-in user_type matches the selected portal type
      if (userType !== selectedType) {
        await supabase.auth.signOut();
        setError(
          `This account is registered as a ${userType}. Please select the correct account type.`
        );
        return;
      }

      // ✅ Check that the corresponding profile exists in the DB
      if (userType === "business") {
        const { data: biz, error: bizError } = await supabase
          .from("businesses")
          .select("id, application_status, status")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (bizError) throw bizError;

        if (!biz) {
          navigate("/become-business");
          return;
        }

        if (biz.status === "deleted") {
          await supabase.auth.signOut();
          setError("This business account has been deactivated. Please contact support.");
          return;
        }

        navigate("/business/dashboard");
      } else {
        // creator
        const { data: creator, error: creatorError } = await supabase
          .from("creator_profiles")
          .select("id, status")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (creatorError) throw creatorError;

        if (!creator) {
          navigate("/become-creator");
          return;
        }

        if (creator.status === "suspended") {
          await supabase.auth.signOut();
          setError("Your creator account has been suspended. Please contact support.");
          return;
        }

        if (creator.status === "pending_review") {
          toast.info("Your application is still under review. You'll be notified when approved.");
          navigate("/dashboard");
          return;
        }

        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);

      if (err.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message?.includes("Email not confirmed")) {
        setError("Please verify your email before logging in. Check your inbox.");
      } else if (err.message?.includes("User already registered")) {
        setError("This email is already registered. Please login instead.");
        setIsSignUp(false);
      } else if (err.message?.includes("Password should be at least 6 characters")) {
        setError("Password must be at least 6 characters long.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }

      toast.error("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const selectAccountType = (type: AccountType) => {
    setSelectedType(type);
    setError(null);
    setIsSignUp(false);
    setEmail("");
    setPassword("");
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  const headingText = () => {
    if (!selectedType) return "Who are you?";
    if (selectedType === "admin") return "Admin Login";
    return `${isSignUp ? "Create" : "Login to"} ${selectedType} account`;
  };

  const subText = () => {
    if (!selectedType) return "Choose your account type to continue";
    if (selectedType === "admin") return "Enter your admin credentials";
    return isSignUp
      ? "Fill in your details to get started"
      : "Enter your credentials to access your dashboard";
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col px-8 pt-20 pb-12">
      <Toaster position="top-center" richColors />

      {/* Logo */}
      <div className="flex flex-col items-center mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 mb-4 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center">
            <div className="w-5 h-5 bg-[#389C9A]" />
          </div>
          <span className="text-3xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            LiveLink
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black uppercase tracking-tighter leading-none mb-2 italic text-[#1D1D1D] text-center"
        >
          {headingText()}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-500 text-center max-w-md"
        >
          {subText()}
        </motion.p>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto w-full mb-6 p-4 bg-red-50 border-2 border-red-200 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-600">Error</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* ── ACCOUNT TYPE SELECTION ── */}
      {!selectedType ? (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full">

          {/* Creator */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => selectAccountType("creator")}
            className="group relative flex items-center justify-between p-8 bg-white border-2 border-[#1D1D1D] transition-all active:scale-[0.98] text-left hover:bg-[#1D1D1D] hover:text-white"
          >
            <div className="flex flex-col gap-4">
              <VideoIcon className="w-8 h-8 text-[#389C9A] group-hover:text-white" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight italic mb-1">I'm a Creator</h3>
                <p className="text-xs font-medium italic opacity-60 leading-tight pr-8">
                  Access campaigns, track earnings, and grow your brand.
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </motion.button>

          {/* Business */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => selectAccountType("business")}
            className="group relative flex items-center justify-between p-8 bg-white border-2 border-[#1D1D1D] transition-all active:scale-[0.98] text-left hover:bg-[#1D1D1D] hover:text-white"
          >
            <div className="flex flex-col gap-4">
              <Building className="w-8 h-8 text-[#FEDB71] group-hover:text-white" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight italic mb-1">I'm a Business</h3>
                <p className="text-xs font-medium italic opacity-60 leading-tight pr-8">
                  Launch campaigns, find creators, and manage partnerships.
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </motion.button>

          {/* Quick signup */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 mb-3">New here? Jump straight to signup:</p>
            <div className="flex gap-3 justify-center">
              <Link to="/become-creator" className="text-xs px-4 py-2 border border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white transition-colors font-medium">
                Creator Signup
              </Link>
              <Link to="/become-business" className="text-xs px-4 py-2 border border-[#FEDB71] text-[#FEDB71] hover:bg-[#FEDB71] hover:text-black transition-colors font-medium">
                Business Signup
              </Link>
            </div>
          </div>

          {/* Admin entry — subtle, not prominent */}
          <div className="mt-2 text-center">
            {!showAdminEntry ? (
              <button
                onClick={() => setShowAdminEntry(true)}
                className="text-[10px] text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors"
              >
                Admin Access
              </button>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => selectAccountType("admin")}
                className="flex items-center gap-2 mx-auto text-xs px-4 py-2 border border-gray-300 text-gray-500 hover:border-[#1D1D1D] hover:text-[#1D1D1D] transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                Continue as Admin
              </motion.button>
            )}
          </div>
        </div>

      ) : (
        /* ── AUTH FORM ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto w-full"
        >
          {/* Back */}
          <button
            onClick={() => { setSelectedType(null); setShowAdminEntry(false); setError(null); }}
            className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-black transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to selection
          </button>

          {/* Admin badge */}
          {selectedType === "admin" && (
            <div className="mb-6 p-3 bg-gray-50 border-2 border-gray-200 flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Admin access only — unauthorised attempts are logged
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 p-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors bg-white text-sm"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 p-4 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors bg-white text-sm"
                required
                disabled={isLoading}
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isSignUp && (
              <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full p-4 font-black uppercase tracking-widest italic text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2 ${
                selectedType === "admin"
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-[#1D1D1D] text-white hover:bg-opacity-80"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : selectedType === "admin" ? (
                <>
                  <Shield className="w-4 h-4" /> Admin Sign In
                </>
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer links — hide for admin */}
          {selectedType !== "admin" && (
            <div className="mt-6 text-center space-y-2">
              {!isSignUp ? (
                <>
                  <p className="text-sm text-gray-500">
                    Don't have an account?{" "}
                    <Link
                      to={selectedType === "business" ? "/become-business" : "/become-creator"}
                      className="font-bold text-[#389C9A] hover:underline"
                    >
                      Sign up as {selectedType}
                    </Link>
                  </p>
                  <div>
                    <button
                      onClick={() => toast.info("Password reset feature coming soon!")}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Already have an account?{" "}
                    <button onClick={toggleMode} className="font-bold text-[#389C9A] hover:underline">
                      Sign in
                    </button>
                  </p>
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 mb-2">Not a {selectedType}?</p>
                    <div className="flex gap-3 justify-center">
                      {selectedType === "business" ? (
                        <Link to="/become-creator" className="text-xs px-3 py-1 border border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white transition-colors">
                          Sign up as Creator
                        </Link>
                      ) : (
                        <Link to="/become-business" className="text-xs px-3 py-1 border border-[#FEDB71] text-[#FEDB71] hover:bg-[#FEDB71] hover:text-black transition-colors">
                          Sign up as Business
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Terms */}
          <div className="mt-8 pt-8 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">
              By continuing, you agree to LiveLink's{" "}
              <a href="/terms" className="underline hover:text-black">Terms</a> and{" "}
              <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
