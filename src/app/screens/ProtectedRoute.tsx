import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'creator' | 'business';
}

export function ProtectedRoute({ children, userType }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // If user type is specified, check if user has correct type
      if (userType) {
        const userTypeFromMeta = user.user_metadata?.user_type;
        
        if (userTypeFromMeta === userType) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } else {
        // No specific type required, just authenticated
        setAuthorized(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return authorized ? <>{children}</> : <Navigate to="/login" />;
}

