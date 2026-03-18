import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  location: string;
  niche: string[];
  avg_viewers: number;
  total_streams: number;
  rating: number;
  status: 'pending_review' | 'active' | 'suspended' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
}

interface CreatorPlatform {
  id: string;
  creator_id: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count: number;
  verified: boolean;
  created_at: string;
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
    budget: number;
    pay_rate: number;
    business: {
      id: string;
      business_name: string;
      logo_url: string;
    };
  };
}

export function useCreator(creatorId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>([]);
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [creatorInternalId, setCreatorInternalId] = useState<string | null>(null);

  const targetUserId = creatorId || user?.id;

  // First, get the creator's internal ID if we have a user ID
  useEffect(() => {
    const getCreatorId = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        // If creatorId is provided directly, use it
        if (creatorId) {
          setCreatorInternalId(creatorId);
          return;
        }

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
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting creator ID:', err);
        setError(err instanceof Error ? err : new Error('Failed to get creator ID'));
        setLoading(false);
      }
    };

    getCreatorId();
  }, [targetUserId, creatorId]);

  // Fetch all creator data once we have the internal ID
  useEffect(() => {
    if (creatorInternalId) {
      fetchAllCreatorData();
    }
  }, [creatorInternalId]);

  const fetchAllCreatorData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      await Promise.all([
        fetchProfile(),
        fetchPlatforms(),
        fetchCampaigns()
      ]);

    } catch (err) {
      console.error('Error fetching creator data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch creator data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!creatorInternalId) return;

    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('id', creatorInternalId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchPlatforms = async () => {
    if (!creatorInternalId) return;

    try {
      const { data, error } = await supabase
        .from('creator_platforms')
        .select('*')
        .eq('creator_id', creatorInternalId);

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Error fetching platforms:', err);
    }
  };

  const fetchCampaigns = async () => {
    if (!creatorInternalId) return;

    try {
      const { data, error } = await supabase
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
            budget,
            pay_rate,
            bid_amount,
            business:businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq('creator_id', creatorInternalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const formattedCampaigns = (data || []).map((item: any) => ({
        ...item,
        campaign: item.campaign ? {
          ...item.campaign,
          business: item.campaign.business
        } : undefined
      }));

      setCampaigns(formattedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  // Calculate stats from campaigns
  const getStats = () => {
    if (!campaigns.length) {
      return {
        totalEarnings: 0,
        totalCampaigns: 0,
        completedCampaigns: 0,
        activeCampaigns: 0,
        pendingCampaigns: 0,
        averageRating: profile?.rating || 0,
        avgViewers: profile?.avg_viewers || 0
      };
    }

    const totalEarnings = campaigns.reduce((sum, c) => sum + (c.total_earnings || 0), 0);
    const totalCampaigns = campaigns.length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;

    return {
      totalEarnings,
      totalCampaigns,
      completedCampaigns,
      activeCampaigns,
      pendingCampaigns,
      averageRating: profile?.rating || 0,
      avgViewers: profile?.avg_viewers || 0
    };
  };

  const stats = getStats();

  return {
    profile,
    platforms,
    campaigns,
    stats,
    loading,
    error,
    refresh: fetchAllCreatorData,
    isCreator: !!profile,
    isApproved: profile?.status === 'active',
    isPending: profile?.status === 'pending_review',
    isSuspended: profile?.status === 'suspended',
    isRejected: profile?.status === 'rejected'
  };
}
