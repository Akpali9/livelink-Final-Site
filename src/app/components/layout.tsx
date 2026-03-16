import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLoaderData } from 'react-router';
import { supabase } from '../lib/supabase';
import { Toaster } from 'sonner';

export function RootLayout() {
  const navigate = useNavigate();
  const loaderData = useLoaderData() as any;
  const [isAuthenticated, setIsAuthenticated] = useState(!!loaderData?.user);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        
        // Redirect based on user type
        const userType = session?.user.user_metadata?.user_type;
        if (userType === 'creator') {
          navigate('/dashboard');
        } else if (userType === 'business') {
          navigate('/business/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <Outlet context={{ user: loaderData?.user, profile: loaderData?.profile, userType: loaderData?.userType }} />
    </>
  );
}
