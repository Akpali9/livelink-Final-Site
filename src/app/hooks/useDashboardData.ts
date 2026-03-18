import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  avg_viewers: number;
  rating: number;
  status: string;
}

interface EarningsData {
  totalEarned: number;
  pendingEarnings: number;
  paidOut: number;
}

interface StatusCounts {
  requested: number; // pending offers
  active: number;    // active campaigns
  completed: number; // completed campaigns
}

interface IncomingRequest {
  id: string;
  business_id: string;
  business: string;
  logo: string | null;
  name: string;
  type: string;
  price: number;
  streams: number;
  status: 'pending' | 'active' | 'completed' | 'declined';
  created_at: string;
}

interface LiveCampaign {
  id: string;
  campaign_id: string;
  business: string;
  business_id: string;
  name: string;
  logo: string | null;
  session_earnings: number;
  stream_time: string;
  progress: number;
  remaining_mins: number;
  streams_completed: number;
  streams_target: number;
}

interface Application {
  id: string;
  campaign_id: string;
  business: string;
  business_id: string;
  logo: string | null;
  type: string;
  status: string;
  amount?: number;
  applied_at: string;
}

interface UpcomingCampaign {
  id: string;
  campaign_id: string;
  business: string;
  business_id: string;
  logo: string | null;
  start_date: string;
  package: string;
  streams_target: number;
}

export function useDashboardData(creatorId: string | null) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [liveCampaign, setLiveCampaign] = useState<LiveCampaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [upcomingCampaigns, setUpcomingCampaigns] = useState<UpcomingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    const newErrors: Record<string, string> = {};

    try {
      // ============================================
      // 1. Fetch creator profile
      // ============================================
      const { data: creatorData, error: profileError } = await supabase
        .from('creator_profiles') // ✅ Fixed: correct table name
        .select('id, full_name, username, avatar_url, avg_viewers, rating, status')
        .eq('id', creatorId)
        .single();

      if (profileError) {
        newErrors.profile = 'Could not load profile';
        console.error('Profile error:', profileError);
      } else {
        setProfile(creatorData);
      }
    } catch (err) {
      newErrors.profile = 'Could not load profile';
    }

    try {
      // ============================================
      // 2. Fetch earnings from campaign_creators
      // ============================================
      const { data: earningsRows, error: earningsError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select('total_earnings, paid_out')
        .eq('creator_id', creatorId);

      if (earningsError) {
        newErrors.earnings = 'Could not load earnings';
        console.error('Earnings error:', earningsError);
      } else if (earningsRows) {
        const totalEarned = earningsRows.reduce((sum, r) => sum + (r.total_earnings || 0), 0);
        const paidOut = earningsRows.reduce((sum, r) => sum + (r.paid_out || 0), 0);
        const pendingEarnings = totalEarned - paidOut;

        setEarnings({ totalEarned, pendingEarnings, paidOut });
      }
    } catch (err) {
      newErrors.earnings = 'Could not load earnings';
    }

    try {
      // ============================================
      // 3. Fetch status counts from campaign_creators
      // ============================================
      const { data: campaigns, error: countsError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select('status')
        .eq('creator_id', creatorId);

      if (countsError) {
        newErrors.counts = 'Could not load counts';
        console.error('Counts error:', countsError);
      } else if (campaigns) {
        const normalize = (s: string) => s?.toLowerCase();
        setStatusCounts({
          requested: campaigns.filter(c => normalize(c.status) === 'pending').length,
          active: campaigns.filter(c => normalize(c.status) === 'active').length,
          completed: campaigns.filter(c => normalize(c.status) === 'completed').length,
        });
      }
    } catch (err) {
      newErrors.counts = 'Could not load counts';
    }

    try {
      // ============================================
      // 4. Fetch incoming requests (pending offers)
      // ============================================
      const { data: requests, error: requestsError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select(`
          id,
          status,
          streams_target,
          created_at,
          campaigns!inner (
            id,
            name,
            type,
            pay_rate,
            bid_amount,
            budget,
            businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq('creator_id', creatorId)
        .in('status', ['pending', 'PENDING']);

      if (requestsError) {
        newErrors.requests = 'Could not load requests';
        console.error('Requests error:', requestsError);
      } else if (requests) {
        const formatted = requests
          .filter((r: any) => r.campaigns !== null)
          .map((r: any) => ({
            id: r.id,
            business_id: r.campaigns.businesses?.id || '',
            business: r.campaigns.businesses?.business_name || 'Unknown Business',
            logo: r.campaigns.businesses?.logo_url || null,
            name: r.campaigns.name,
            type: r.campaigns.type,
            price: r.campaigns.pay_rate ?? r.campaigns.bid_amount ?? r.campaigns.budget ?? 0,
            streams: r.streams_target || 4,
            status: r.status.toLowerCase(),
            created_at: r.created_at,
          }));
        
        setIncomingRequests(formatted);
      }
    } catch (err) {
      newErrors.requests = 'Could not load requests';
    }

    try {
      // ============================================
      // 5. Fetch live campaign
      // ============================================
      const { data: live, error: liveError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select(`
          id,
          streams_completed,
          streams_target,
          total_earnings,
          status,
          campaigns (
            id,
            name,
            pay_rate,
            bid_amount,
            businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq('creator_id', creatorId)
        .in('status', ['active', 'ACTIVE'])
        .maybeSingle();

      if (liveError) {
        newErrors.live = 'Could not load live campaign';
        console.error('Live error:', liveError);
      } else if (live && live.campaigns) {
        const camp = live.campaigns;
        const biz = camp.businesses;
        const progress = live.streams_target > 0
          ? (live.streams_completed / live.streams_target) * 100
          : 0;

        const formatStreamTime = (completed: number): string => {
          const totalMins = completed * 45;
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          return `${hours}h ${mins}m`;
        };

        setLiveCampaign({
          id: live.id,
          campaign_id: camp.id,
          business_id: biz?.id || '',
          business: biz?.business_name || 'Unknown',
          name: camp.name,
          logo: biz?.logo_url || null,
          session_earnings: live.total_earnings || 0,
          stream_time: formatStreamTime(live.streams_completed || 0),
          progress,
          remaining_mins: (live.streams_target - live.streams_completed) * 45,
          streams_completed: live.streams_completed || 0,
          streams_target: live.streams_target || 4,
        });
      }
    } catch (err) {
      newErrors.live = 'Could not load live campaign';
    }

    try {
      // ============================================
      // 6. Fetch applications (non-live campaign_creators)
      // ============================================
      const { data: apps, error: appsError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select(`
          id,
          status,
          total_earnings,
          created_at,
          campaigns (
            id,
            name,
            type,
            pay_rate,
            bid_amount,
            businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq('creator_id', creatorId)
        .not('status', 'in', '("active","ACTIVE")')
        .order('created_at', { ascending: false })
        .limit(10);

      if (appsError) {
        newErrors.applications = 'Could not load applications';
        console.error('Applications error:', appsError);
      } else if (apps) {
        const formatted = apps
          .filter((a: any) => a.campaigns !== null)
          .map((a: any) => ({
            id: a.id,
            campaign_id: a.campaigns.id,
            business_id: a.campaigns.businesses?.id || '',
            business: a.campaigns.businesses?.business_name || 'Unknown',
            logo: a.campaigns.businesses?.logo_url || null,
            type: a.campaigns.type,
            status: a.status,
            amount: a.campaigns.pay_rate ?? a.campaigns.bid_amount ?? null,
            applied_at: a.created_at,
          }));
        
        setApplications(formatted);
      }
    } catch (err) {
      newErrors.applications = 'Could not load applications';
    }

    try {
      // ============================================
      // 7. Fetch upcoming campaigns (accepted but not started)
      // ============================================
      const { data: upcoming, error: upcomingError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select(`
          id,
          status,
          streams_target,
          accepted_at,
          campaigns (
            id,
            name,
            type,
            start_date,
            businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .gte('campaigns.start_date', new Date().toISOString())
        .order('campaigns.start_date', { ascending: true })
        .limit(5);

      if (upcomingError) {
        newErrors.upcoming = 'Could not load upcoming campaigns';
        console.error('Upcoming error:', upcomingError);
      } else if (upcoming) {
        const formatted = upcoming
          .filter((u: any) => u.campaigns !== null)
          .map((u: any) => ({
            id: u.id,
            campaign_id: u.campaigns.id,
            business_id: u.campaigns.businesses?.id || '',
            business: u.campaigns.businesses?.business_name || 'Unknown',
            logo: u.campaigns.businesses?.logo_url || null,
            start_date: u.campaigns.start_date,
            package: u.campaigns.type,
            streams_target: u.streams_target || 4,
          }));
        
        setUpcomingCampaigns(formatted);
      }
    } catch (err) {
      newErrors.upcoming = 'Could not load upcoming campaigns';
    }

    setErrors(newErrors);
    setLoading(false);
  }, [creatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    earnings,
    statusCounts,
    incomingRequests,
    setIncomingRequests,
    liveCampaign,
    applications,
    upcomingCampaigns,
    loading,
    errors,
    refetch: fetchData,
  };
}

interface CreatorProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  avg_viewers: number;
  rating: number;
  status: string;
}
