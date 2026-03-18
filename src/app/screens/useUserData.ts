import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type UserType = 'creator' | 'business' | 'admin';

interface UserData {
  // Common fields
  id: string;
  user_id: string;
  email?: string;
  
  // Creator specific
  creator_profile?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    location: string;
    niche: string[];
    avg_viewers: number;
    total_streams: number;
    rating: number;
    status: string;
    created_at: string;
  };
  
  // Business specific
  business_profile?: {
    id: string;
    business_name: string;
    full_name: string;
    email: string;
    logo_url: string;
    website: string;
    description: string;
    industry: string;
    status: string;
    application_status: string;
    created_at: string;
  };
  
  // Related data
  platforms?: {
    id: string;
    platform_type: string;
    username: string;
    profile_url: string;
    followers_count: number;
  }[];
  
  campaigns?: {
    id: string;
    name: string;
    type: string;
    status: string;
    campaign_creators: {
      id: string;
      status: string;
      streams_completed: number;
      streams_target: number;
      total_earnings: number;
    }[];
  }[];
  
  notifications?: {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }[];
}

export function useUserData(userId: string) {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<UserType | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // First determine user type from auth metadata
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setLoading(false);
          return;
        }

        const metadata = user.user_metadata;
        const type = metadata?.user_type || metadata?.role || 'creator';
        setUserType(type);

        let userData: UserData = {
          id: userId,
          user_id: userId,
          email: user.email
        };

        // Fetch based on user type
        if (type === 'creator') {
          // Get creator profile
          const { data: creator, error: creatorError } = await supabase
            .from('creator_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (creatorError) throw creatorError;
          userData.creator_profile = creator;

          // Get creator platforms
          const { data: platforms, error: platformsError } = await supabase
            .from('creator_platforms')
            .select('*')
            .eq('creator_id', creator.id);

          if (!platformsError) {
            userData.platforms = platforms;
          }

          // Get creator campaigns
          const { data: campaigns, error: campaignsError } = await supabase
            .from('campaign_creators')
            .select(`
              id,
              status,
              streams_completed,
              streams_target,
              total_earnings,
              paid_out,
              campaign:campaigns (
                id,
                name,
                type,
                status
              )
            `)
            .eq('creator_id', creator.id)
            .order('created_at', { ascending: false });

          if (!campaignsError) {
            userData.campaigns = campaigns.map((cc: any) => ({
              id: cc.campaign.id,
              name: cc.campaign.name,
              type: cc.campaign.type,
              status: cc.campaign.status,
              campaign_creators: [{
                id: cc.id,
                status: cc.status,
                streams_completed: cc.streams_completed,
                streams_target: cc.streams_target,
                total_earnings: cc.total_earnings
              }]
            }));
          }

        } else if (type === 'business') {
          // Get business profile
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (businessError) throw businessError;
          userData.business_profile = business;

          // Get business campaigns
          const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select(`
              id,
              name,
              type,
              status,
              budget,
              pay_rate,
              bid_amount,
              start_date,
              end_date,
              campaign_creators (
                id,
                status,
                streams_completed,
                streams_target,
                total_earnings
              )
            `)
            .eq('business_id', business.id)
            .order('created_at', { ascending: false });

          if (!campaignsError) {
            userData.campaigns = campaigns;
          }
        }

        // Get notifications for all user types
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!notifError) {
          userData.notifications = notifications;
        }

        setData(userData);

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [userId]);

  return { 
    data, 
    loading, 
    userType,
    isCreator: userType === 'creator',
    isBusiness: userType === 'business',
    isAdmin: userType === 'admin'
  };
}

// Optional: Specialized hooks for common use cases
export function useCreatorData(creatorId: string) {
  const { data, loading } = useUserData(creatorId);
  return {
    creator: data?.creator_profile,
    platforms: data?.platforms,
    campaigns: data?.campaigns,
    loading,
    isCreator: true
  };
}

export function useBusinessData(businessId: string) {
  const { data, loading } = useUserData(businessId);
  return {
    business: data?.business_profile,
    campaigns: data?.campaigns,
    loading,
    isBusiness: true
  };
}
