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
        navigate('/login/portal');
        return;
      }

      // Check user metadata first (fastest)
      const userType = user.user_metadata?.user_type || user.user_metadata?.role;
      
      // If user is admin from metadata
      if (userType === 'admin' || user.user_metadata?.is_admin) {
        navigate('/admin');
        return;
      }

      // Check if user is a creator
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorProfile) {
        // ✅ Correct status values: 'active', 'pending_review', 'rejected', 'suspended'
        if (creatorProfile.status === 'active') {
          navigate('/dashboard');
        } else if (creatorProfile.status === 'pending_review') {
          // Show dashboard with pending banner instead of separate page
          navigate('/dashboard');
        } else if (creatorProfile.status === 'rejected') {
          navigate('/become-creator?status=rejected');
        } else if (creatorProfile.status === 'suspended') {
          navigate('/contact-support?reason=suspended');
        } else {
          navigate('/become-creator');
        }
        return;
      }

      // Check if user is a business - ✅ Fixed table name
      const { data: businessProfile } = await supabase
        .from('businesses') // ✅ Correct table name
        .select('status, application_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessProfile) {
        const status = businessProfile.status;
        const appStatus = businessProfile.application_status;
        
        // Business approved
        if (status === 'active' || appStatus === 'approved') {
          navigate('/business/dashboard'); // ✅ Correct path
        } 
        // Business pending
        else if (status === 'pending_review' || appStatus === 'pending') {
          navigate('/business/dashboard'); // Show dashboard with pending banner
        } 
        // Business rejected
        else if (status === 'rejected' || appStatus === 'rejected') {
          navigate('/become-business?status=rejected');
        } 
        // Business suspended
        else if (status === 'suspended') {
          navigate('/contact-support?reason=suspended');
        } 
        // Fallback
        else {
          navigate('/become-business');
        }
        return;
      }

      // New user - redirect to role selection (login portal handles this)
      navigate('/login/portal');
      
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/login/portal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
          Redirecting...
        </p>
      </div>
    );
  }

  return null;
}
