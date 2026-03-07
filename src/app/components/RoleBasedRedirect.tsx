import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function RoleBasedRedirect() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a creator
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorProfile) {
        if (creatorProfile.status === 'approved') {
          navigate('/dashboard');
        } else if (creatorProfile.status === 'pending') {
          navigate('/application-pending');
        } else {
          navigate('/become-creator');
        }
        return;
      }

      // Check if user is a business
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessProfile) {
        if (businessProfile.status === 'approved') {
          navigate('/business-dashboard');
        } else if (businessProfile.status === 'pending') {
          navigate('/business-application-pending');
        } else {
          navigate('/become-business');
        }
        return;
      }

      // New user - redirect to role selection
      navigate('/choose-role');
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
          Redirecting…
        </p>
      </div>
    );
  }

  return null;
}