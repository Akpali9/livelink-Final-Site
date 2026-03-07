import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/login', { state: { from: location.pathname } });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}