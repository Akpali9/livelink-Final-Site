import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useUserData(userId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id, email, phone, bio,
          user_niches(niche),
          user_platforms(platform_name, handle),
          user_gigs(*),
          user_notifications(*),
          user_status(*)
        `)
        .eq('id', userId)
        .single();

      if (error) console.error(error);
      else setData(user);
      setLoading(false);
    }

    fetchUser();
  }, [userId]);

  return { data, loading };
}