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
  ArrowLeft
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";
import { useNavigate, Link } from "react-router";

export function LoginPortal() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedType, setSelectedType] = useState<"creator" | "business" | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      setError("Please select an account type first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        // Handle Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: selectedType,
              full_name: email.split('@')[0],
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          toast.success("Account created! Please check your email for verification.", {
            duration: 6000
          });
          
          // Redirect to profile completion based on selected type
          if (selectedType === "business") {
            navigate("/become-business");
          } else {
            navigate("/become-creator");
          }
        }
      } else {
        // Handle Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success("Logged in successfully!");
        
        // Get user type from metadata
        const userType = data.user?.user_metadata?.user_type;
        
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
        
        // Redirect based on user type
        if (userType === "business") {
          navigate("/business/dashboard");
        } else {
          navigate("/dashboard");
        }
      }
      
    } catch (error: any) {
      console.error("Auth error:", error);
      
      // Handle specific error messages
      if (error.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (error.message?.includes("Email not confirmed")) {
        setError("Please verify your email before logging in. Check your inbox.");
      } else if (error.message?.includes("User already registered")) {
        setError("This email is already registered. Please login instead.");
        setIsSignUp(false);
      } else if (error.message?.includes("Password should be at least 6 characters")) {
        setError("Password must be at least 6 characters long.");
      } else {
        setError(error.message || "Authentication failed. Please try again.");
      }
      
      toast.error("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const selectAccountType = (type: "creator" | "business") => {
    setSelectedType(type);
    setError(null);
    setIsSignUp(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-8 pt-20 pb-12">
      <Toaster position="top-center" richColors />
      
      {/* Logo & Heading */}
      <div className="flex flex-col items-center mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="flex items-center gap-2 mb-4 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center">
            <div className="w-5 h-5 bg-[#389C9A]" />
          </div>
          <span className="text-3xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">LiveLink</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-3xl font-black uppercase tracking-tighter leading-none mb-2 italic text-[#1D1D1D] text-center"
        >
          {selectedType 
            ? `${isSignUp ? 'Create' : 'Login to'} ${selectedType} account`
            : "Who are you?"
          }
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-500 text-center max-w-md"
        >
          {selectedType 
            ? isSignUp 
              ? "Fill in your details to get started" 
              : "Enter your credentials to access your dashboard"
            : "Choose your account type to continue"
          }
        </motion.p>
      </div>

      {/* Error Display */}
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

      {/* Account Type Selection */}
      {!selectedType ? (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
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

          {/* Quick signup links for users who know what they want */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 mb-3">
              New here? Jump straight to signup:
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/become-creator"
                className="text-xs px-4 py-2 border border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white transition-colors font-medium"
              >
                Creator Signup
              </Link>
              <Link
                to="/become-business"
                className="text-xs px-4 py-2 border border-[#FEDB71] text-[#FEDB71] hover:bg-[#FEDB71] hover:text-black transition-colors font-medium"
              >
                Business Signup
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Auth Form */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto w-full"
        >
          {/* Back button */}
          <button
            onClick={() => setSelectedType(null)}
            className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-black transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to selection
          </button>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
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
              />
            </div>

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
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1D1D1D] text-white p-4 font-black uppercase tracking-widest italic text-sm hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Conditional links based on selected type */}
          <div className="mt-6 text-center space-y-2">
            {!isSignUp ? (
              <>
                {/* For login mode - show signup link */}
                <p className="text-sm text-gray-500">
                  Don't have an account?{" "}
                  <Link
                    to={selectedType === "business" ? "/become-business" : "/become-creator"}
                    className="font-bold text-[#389C9A] hover:underline"
                  >
                    Sign up as {selectedType}
                  </Link>
                </p>
                
                {/* Forgot password link */}
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
                {/* For signup mode - show login link */}
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={toggleMode}
                    className="font-bold text-[#389C9A] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
                
                {/* Show direct links to switch signup type */}
                <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-2">
                    Not a {selectedType}?
                  </p>
                  <div className="flex gap-3 justify-center">
                    {selectedType === "business" ? (
                      <Link
                        to="/become-creator"
                        className="text-xs px-3 py-1 border border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white transition-colors"
                      >
                        Sign up as Creator
                      </Link>
                    ) : (
                      <Link
                        to="/become-business"
                        className="text-xs px-3 py-1 border border-[#FEDB71] text-[#FEDB71] hover:bg-[#FEDB71] hover:text-black transition-colors"
                      >
                        Sign up as Business
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">
              By continuing, you agree to LiveLink's{" "}
              <a href="/terms" className="underline hover:text-black">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}