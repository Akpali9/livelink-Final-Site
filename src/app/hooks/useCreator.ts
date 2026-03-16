// src/app/hooks/useCreator.ts
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
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  reviewed_at?: string;
  user_id?: string;
}

interface CreatorPlatform {
  id: string;
  platform_name: string;
  username: string;
  followers: number;
  verified: boolean;
}

interface CreatorStats {
  id: string;
  total_earnings: number;
  total_campaigns: number;
  avg_rating: number;
  completed_campaigns: number;
}

interface StreamUpdate {
  id: string;
  stream_number: number;
  stream_date: string;
  duration: number;
  viewer_count: number;
  title?: string;
}

export function useCreator(creatorId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recentStreams, setRecentStreams] = useState<StreamUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetId = creatorId || user?.id;

  useEffect(() => {
    if (targetId) {
      fetchAllCreatorData();
    } else {
      setLoading(false);
    }
  }, [targetId]);

  const fetchAllCreatorData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile separately to avoid relationship errors
      await Promise.all([
        fetchProfile(),
        fetchPlatforms(),
        fetchStats(),
        fetchRecentStreams()
      ]);

    } catch (err) {
      console.error('Error fetching creator data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch creator data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      // Try to get from creator_profiles first
      let { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Try with user_id field if id doesn't work
        ({ data, error } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle());
      }

      if (!data) {
        // Check if there's a pending application
        const { data: application } = await supabase
          .from('creator_applications')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle();

        if (application) {
          data = {
            id: targetId,
            full_name: application.full_name,
            email: application.email,
            category: application.category,
            platform: application.platform,
            followers: application.followers,
            status: 'pending',
            created_at: application.created_at,
            user_id: targetId
          };
        }
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_platforms')
        .select('*')
        .eq('creator_id', targetId);

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Error fetching platforms:', err);
      // Don't throw, just log
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_stats')
        .select('*')
        .eq('creator_id', targetId)
        .maybeSingle();

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Set default stats if none exist
      setStats({
        id: targetId,
        total_earnings: 0,
        total_campaigns: 0,
        avg_rating: 0,
        completed_campaigns: 0
      });
    }
  };

  const fetchRecentStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_updates')
        .select('id, stream_number, stream_date, duration, viewer_count, title')
        .eq('creator_id', targetId)
        .order('stream_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentStreams(data || []);
    } catch (err) {
      console.error('Error fetching streams:', err);
    }
  };

  const applyToBeCreator = async (applicationData: Partial<CreatorProfile>) => {
    try {
      const { data, error } = await supabase
        .from('creator_applications')
        .insert([{
          user_id: targetId,
          ...applicationData,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error applying to be creator:', err);
      throw err;
    }
  };

  return {
    profile,
    platforms,
    stats,
    recentStreams,
    loading,
    error,
    refresh: fetchAllCreatorData,
    applyToBeCreator,
    isCreator: !!profile,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending'
  };
}
