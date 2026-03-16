// src/app/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  email?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  business_name?: string;
  industry?: string;
  // Add other profile fields as needed
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          setState(prev => ({ ...prev, user: session.user }));
          await fetchUserProfile(session.user.id);
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error : new Error('Authentication error'),
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
      } else if (event === 'USER_UPDATED' && session?.user) {
        setState(prev => ({ ...prev, user: session.user }));
        await fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Try to get profile from different tables based on user role
      let profileData: Profile | null = null;

      // Check creator_profiles first
      const { data: creatorData, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (creatorData && !creatorError) {
        profileData = {
          ...creatorData,
          role: 'creator'
        };
      }

      // If not a creator, check business_profiles
      if (!profileData) {
        const { data: businessData, error: businessError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (businessData && !businessError) {
          profileData = {
            ...businessData,
            role: 'business'
          };
        }
      }

      // If not a business, check admin_profiles
      if (!profileData) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (adminData && !adminError) {
          profileData = {
            ...adminData,
            role: 'admin'
          };
        }
      }

      // If still no profile, create a basic one from user metadata
      if (!profileData && state.user) {
        profileData = {
          id: userId,
          full_name: state.user.user_metadata?.full_name || state.user.email?.split('@')[0],
          email: state.user.email,
          role: 'user'
        };
      }

      setState(prev => ({ 
        ...prev, 
        profile: profileData,
        loading: false,
        error: null
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Failed to fetch profile'),
        loading: false 
      }));
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Sign out failed'),
        loading: false 
      }));
    }
  };

  const refreshProfile = async () => {
    if (state.user) {
      await fetchUserProfile(state.user.id);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user || !state.profile) {
      throw new Error('No user or profile found');
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Determine which table to update based on role
      let tableName = '';
      switch (state.profile.role) {
        case 'creator':
          tableName = 'creator_profiles';
          break;
        case 'business':
          tableName = 'business_profiles';
          break;
        case 'admin':
          tableName = 'admin_profiles';
          break;
        default:
          throw new Error('Unknown user role');
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        profile: data ? { ...prev.profile, ...data } : prev.profile,
        loading: false 
      }));

      return data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Profile update failed'),
        loading: false 
      }));
      throw error;
    }
  };

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    signOut,
    refreshProfile,
    updateProfile,
    isAuthenticated: !!state.user,
    isAdmin: state.profile?.role === 'admin',
    isCreator: state.profile?.role === 'creator',
    isBusiness: state.profile?.role === 'business'
  };
}
