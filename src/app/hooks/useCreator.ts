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
  bio?: string;
  avatar_url?: string;
}

interface CreatorPlatform {
  id: string;
  creator_id: string;
  platform_name: string;
  username: string;
  followers: number;
  verified: boolean;
  created_at: string;
}

interface CreatorStats {
  id: string;
  creator_id: string;
  total_earnings: number;
  total_campaigns: number;
  avg_rating: number;
  completed_campaigns: number;
  updated_at: string;
}

interface StreamUpdate {
  id: string;
  creator_id: string;
  stream_number: number;
  stream_date: string;
  duration: number;
  viewer_count: number;
  title?: string;
  created_at: string;
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
      
      // Fetch all data in parallel
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
    if (!targetId) return;

    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchPlatforms = async () => {
    if (!targetId) return;

    try {
      const { data, error } = await supabase
        .from('creator_platforms')
        .select('*')
        .eq('creator_id', targetId);

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Error fetching platforms:', err);
    }
  };

  const fetchStats = async () => {
    if (!targetId) return;

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
    }
  };

  const fetchRecentStreams = async () => {
    if (!targetId) return;

    try {
      const { data, error } = await supabase
        .from('stream_updates')
        .select('*')
        .eq('creator_id', targetId)
        .order('stream_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentStreams(data || []);
    } catch (err) {
      console.error('Error fetching streams:', err);
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
    isCreator: !!profile,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending'
  };
}
