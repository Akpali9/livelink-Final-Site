import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { IncomingRequest } from '../types/dashboard';

interface DashboardProfile {
  total_earned: number;
  pending: number;
  paid_out: number;
}

interface StatusCounts {
  requested: number;
  pending: number;
  completed: number;
}

interface LiveCampaign {
  id: string;
  business: string;
  name: string;
  logo: string | null;
  session_earnings: number;
  stream_time: string;
  progress: number;
  remaining_mins: number;
}

interface Application {
  id: string;
  business: string;
  logo: string | null;
  type: string;
  status: string;
  amount?: number;
  applied_at: string;
}

interface UpcomingCampaign {
  id: string;
  business: string;
  logo: string | null;
  start_date: string;
  package: string;
}

export function useDashboardData(creatorId: string | null) {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
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
      // Fetch creator profile stats
      const { data: creatorData, error: profileError } = await supabase
        .from('creators')
        .select('total_earned, pending, paid_out')
        .eq('user_id', creatorId)
        .single();

      if (profileError) newErrors.profile = 'Could not load earnings';
      else setProfile(creatorData as DashboardProfile);
    } catch { newErrors.profile = 'Could not load earnings'; }

    try {
      // Fetch campaign status counts
      const { data: campaigns } = await supabase
        .from('campaign_requests')
        .select('status')
        .eq('creator_id', creatorId);

      if (campaigns) {
        setStatusCounts({
          requested: campaigns.filter(c => c.status === 'requested').length,
          pending: campaigns.filter(c => c.status === 'pending').length,
          completed: campaigns.filter(c => c.status === 'completed').length,
        });
      }
    } catch { newErrors.counts = 'Could not load counts'; }

    try {
      // Fetch incoming requests
      const { data: requests } = await supabase
        .from('campaign_requests')
        .select(`
          id,
          status,
          price,
          campaign_type,
          streams_required,
          expires_at,
          campaigns(id, name, type),
          businesses(id, name, logo)
        `)
        .eq('creator_id', creatorId)
        .eq('status', 'pending');

      if (requests) {
        setIncomingRequests(requests.map((r: any) => ({
          id: r.id,
          business: r.businesses?.name || 'Unknown',
          logo: r.businesses?.logo || null,
          name: r.campaigns?.name || 'Campaign',
          type: r.campaign_type || r.campaigns?.type || 'Banner',
          price: r.price || 0,
          streams: r.streams_required || 4,
          days_left: r.expires_at
            ? Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86400000))
            : 3,
        })));
      }
    } catch { newErrors.requests = 'Could not load requests'; }

    try {
      // Fetch applications
      const { data: apps } = await supabase
        .from('campaign_requests')
        .select(`
          id, status, price, campaign_type, created_at,
          businesses(id, name, logo)
        `)
        .eq('creator_id', creatorId)
        .in('status', ['applied', 'under_review', 'accepted', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (apps) {
        setApplications(apps.map((a: any) => ({
          id: a.id,
          business: a.businesses?.name || 'Unknown',
          logo: a.businesses?.logo || null,
          type: a.campaign_type || 'Banner',
          status: a.status,
          amount: a.price,
          applied_at: a.created_at,
        })));
      }
    } catch { newErrors.applications = 'Could not load applications'; }

    try {
      // Fetch upcoming campaigns
      const { data: upcoming } = await supabase
        .from('campaign_requests')
        .select(`
          id, starts_at, campaign_type,
          businesses(id, name, logo)
        `)
        .eq('creator_id', creatorId)
        .eq('status', 'accepted')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5);

      if (upcoming) {
        setUpcomingCampaigns(upcoming.map((u: any) => ({
          id: u.id,
          business: u.businesses?.name || 'Unknown',
          logo: u.businesses?.logo || null,
          start_date: u.starts_at,
          package: u.campaign_type || 'Banner',
        })));
      }
    } catch { newErrors.upcoming = 'Could not load upcoming campaigns'; }

    setErrors(newErrors);
    setLoading(false);
  }, [creatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
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
