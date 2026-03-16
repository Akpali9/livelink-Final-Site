import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome } from "lucide-react";
import { toast, Toaster } from "sonner";

export function CreatorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard?role=creator`,
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      toast.error(error.message || "Failed to login with Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <Toaster position="top-center" expand={false} />
      
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black mb-2 text-center">Creator Login</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Sign in to access your creator dashboard
        </p>
        
      


        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 p-3 border-2 border-gray-200 focus:border-black outline-none transition-colors rounded-none"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 p-3 border-2 border-gray-200 focus:border-black outline-none transition-colors rounded-none"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white p-3 font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 rounded-none"
          >
            {isLoading ? "Loading..." : "Sign In"} 
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-xs text-center mt-6 text-gray-500">
          Don't have an account?{" "}
          <button 
            onClick={() => navigate("/become-creator")}
            className="font-bold underline hover:text-black"
          >
            Apply to become a creator
          </button>
        </p>
      </div>
    </div>
  );
} 
