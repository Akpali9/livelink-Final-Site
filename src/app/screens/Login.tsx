import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Check user type from metadata and redirect accordingly
      const userType = data.user?.user_metadata?.user_type;
      
      if (userType === 'creator') {
        navigate('/dashboard');
      } else if (userType === 'business') {
        navigate('/business-dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full border-2 border-[#1D1D1D] p-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
          Welcome Back
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8">
          Sign in to your LiveLink account
        </p>
        
        {error && (
          <div className="mb-6 border-2 border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
              {error}
            </p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1D] text-white p-5 font-black uppercase tracking-tight flex items-center justify-between disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-5 h-5 text-[#FEDB71]" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
            Don't have an account?{' '}
            <Link to="/become-creator" className="text-[#389C9A] underline italic">
              Join as Creator
            </Link>
            {' or '}
            <Link to="/become-business" className="text-[#389C9A] underline italic">
              Register Business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
