// src/app/hooks/useCreatorData.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface CreatorProfile {
  id: string;
  full_name: string;
  email: string;
  category: string;
  platform: string;
  followers: string;
  status: string;
  created_at: string;
  platforms?: any[];
  stats?: any[];
  recent_streams?: any[];
}

export function useCreatorData(creatorId?: string) {
  const { user } = useAuth();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCreatorData();
  }, [creatorId, user]);

  const fetchCreatorData = async () => {
    try {
      setLoading(true);
      
      // Determine which ID to use
      const targetId = creatorId || user?.id;
      
      if (!targetId) {
        setCreator(null);
        return;
      }

      // First, check if the user is a creator
      const { data: profile, error: profileError } = await supabase
        .from('creator_profiles')
        .select(`
          *,
          platforms:creator_platforms(*),
          stats:creator_stats(*),
          recent_streams:stream_updates(
            id, 
            stream_number, 
            stream_date, 
            duration, 
            viewer_count
          )
        `)
        .eq('id', targetId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (profileError) throw profileError;

      if (profile) {
        setCreator(profile);
      } else {
        // If not a creator, check if they have a pending application
        const { data: application } = await supabase
          .from('creator_applications')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle();

        if (application) {
          setCreator({
            id: targetId,
            full_name: application.full_name,
            email: application.email,
            category: application.category,
            platform: application.platform,
            followers: application.followers,
            status: 'pending',
            created_at: application.created_at
          });
        }
      }
    } catch (err) {
      console.error('Error fetching creator data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch creator data'));
    } finally {
      setLoading(false);
    }
  };

  const updateCreatorProfile = async (updates: Partial<CreatorProfile>) => {
    if (!creator?.id) throw new Error('No creator profile found');

    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .update(updates)
        .eq('id', creator.id)
        .select()
        .single();

      if (error) throw error;

      setCreator(prev => prev ? { ...prev, ...data } : null);
      return data;
    } catch (err) {
      console.error('Error updating creator profile:', err);
      throw err;
    }
  };

  return {
    creator,
    loading,
    error,
    updateCreatorProfile,
    refresh: fetchCreatorData,
    isCreator: !!creator,
    isPending: creator?.status === 'pending',
    isApproved: creator?.status === 'approved'
  };
}
