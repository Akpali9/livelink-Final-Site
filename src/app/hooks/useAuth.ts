// src/app/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  role?: 'admin' | 'creator' | 'business' | 'user';
  status?: 'pending' | 'approved' | 'rejected';
  business_name?: string;
  category?: string;
  platform?: string;
  followers?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth(requireAuth: boolean = false) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  // Don't use useNavigate here - it causes errors outside Router context
  // We'll handle navigation in the components instead

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setState(prev => ({ ...prev, user: session.user }));
          await fetchUserProfile(session.user.id);
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error : new Error('Auth error'),
          loading: false 
        }));
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState(prev => ({ ...prev, user: session.user }));
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Try admin_profiles first
      const { data: adminData } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (adminData) {
        setState(prev => ({ 
          ...prev, 
          profile: { ...adminData, role: 'admin' },
          loading: false 
        }));
        return;
      }

      // Try creator_profiles
      const { data: creatorData } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (creatorData) {
        setState(prev => ({ 
          ...prev, 
          profile: { ...creatorData, role: 'creator' },
          loading: false 
        }));
        return;
      }

      // Try business_profiles
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (businessData) {
        setState(prev => ({ 
          ...prev, 
          profile: { ...businessData, role: 'business' },
          loading: false 
        }));
        return;
      }

      // No profile found
      setState(prev => ({ ...prev, loading: false }));

    } catch (error) {
      console.error('Error fetching profile:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    signOut,
    isAuthenticated: !!state.user,
    isAdmin: state.profile?.role === 'admin',
    isCreator: state.profile?.role === 'creator',
    isBusiness: state.profile?.role === 'business'
  };
}
