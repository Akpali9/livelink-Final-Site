import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface CreatorPlatform {
  id: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count: number;
  verified: boolean;
}

interface CreatorCampaign {
  id: string;
  campaign_id: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  campaign: {
    id: string;
    name: string;
    type: string;
    business: {
      id: string;
      business_name: string;
      logo_url: string;
    };
  };
}

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  phone_number: string;
  niche: string[];
  avg_viewers: number;
  total_streams: number;
  rating: number;
  status: 'pending_review' | 'active' | 'suspended' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  
  // Joined data
  platforms?: CreatorPlatform[];
  campaigns?: CreatorCampaign[];
}

export function useCreatorData(creatorId?: string) {
  const { user } = useAuth();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [creatorInternalId, setCreatorInternalId] = useState<string | null>(null);

  // Determine which ID to use and resolve to internal creator ID
  useEffect(() => {
    const resolveCreatorId = async () => {
      const targetUserId = creatorId || user?.id;
      
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        // If creatorId is provided directly, it might be the profile ID
        if (creatorId) {
          setCreatorInternalId(creatorId);
        } else {
          // Otherwise, look up by user_id
          const { data, error } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', targetUserId)
            .maybeSingle();

          if (error) throw error;
          
          if (data) {
            setCreatorInternalId(data.id);
          } else {
            // No creator profile found
            setCreator(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error resolving creator ID:', err);
        setError(err instanceof Error ? err : new Error('Failed to resolve creator ID'));
        setLoading(false);
      }
    };

    resolveCreatorId();
  }, [creatorId, user]);

  // Fetch creator data once we have the internal ID
  useEffect(() => {
    if (creatorInternalId) {
      fetchCreatorData();
    }
  }, [creatorInternalId]);

  const fetchCreatorData = async () => {
    if (!creatorInternalId) return;

    try {
      setLoading(true);

      // Fetch creator profile with platforms and campaigns
      const { data: profile, error: profileError } = await supabase
        .from('creator_profiles')
        .select(`
          id,
          user_id,
          full_name,
          username,
          email,
          avatar_url,
          bio,
          location,
          phone_number,
          niche,
          avg_viewers,
          total_streams,
          rating,
          status,
          created_at,
          updated_at,
          approved_at,
          rejected_at,
          platforms:creator_platforms(*)
        `)
        .eq('id', creatorInternalId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        // Fetch campaigns separately with proper joins
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaign_creators')
          .select(`
            id,
            campaign_id,
            status,
            streams_completed,
            streams_target,
            total_earnings,
            paid_out,
            created_at,
            accepted_at,
            completed_at,
            campaign:campaigns (
              id,
              name,
              type,
              business:businesses (
                id,
                business_name,
                logo_url
              )
            )
          `)
          .eq('creator_id', creatorInternalId)
          .order('created_at', { ascending: false });

        if (campaignsError) throw campaignsError;

        // Transform campaigns data
        const campaigns = (campaignsData || []).map((item: any) => ({
          ...item,
          campaign: item.campaign ? {
            ...item.campaign,
            business: item.campaign.business
          } : undefined
        }));

        setCreator({
          ...profile,
          campaigns
        });
      } else {
        setCreator(null);
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
      // Filter out fields that shouldn't be updated directly
      const { id, user_id, created_at, updated_at, approved_at, rejected_at, platforms, campaigns, ...safeUpdates } = updates;

      const { data, error } = await supabase
        .from('creator_profiles')
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString()
        })
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

  // Calculate stats from campaigns
  const getStats = () => {
    if (!creator?.campaigns?.length) {
      return {
        totalEarnings: 0,
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        pendingCampaigns: 0,
        totalStreams: creator?.total_streams || 0,
        avgViewers: creator?.avg_viewers || 0,
        rating: creator?.rating || 0
      };
    }

    const campaigns = creator.campaigns;
    const totalEarnings = campaigns.reduce((sum, c) => sum + (c.total_earnings || 0), 0);
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;

    return {
      totalEarnings,
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      pendingCampaigns,
      totalStreams: creator.total_streams || 0,
      avgViewers: creator.avg_viewers || 0,
      rating: creator.rating || 0
    };
  };

  const stats = getStats();

  return {
    creator,
    stats,
    loading,
    error,
    updateCreatorProfile,
    refresh: fetchCreatorData,
    isCreator: !!creator,
    isPending: creator?.status === 'pending_review',
    isApproved: creator?.status === 'active',
    isSuspended: creator?.status === 'suspended',
    isRejected: creator?.status === 'rejected'
  };
}
