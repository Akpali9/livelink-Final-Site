// src/app/hooks/useCampaignApplications.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Business {
  id: string;
  business_name: string;
  logo_url?: string;
  email?: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  budget: number;
  pay_rate?: number;
  bid_amount?: number;
  description: string;
  business_id: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  streams_target: number;
  streams_completed: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  declined_at?: string;
  campaign?: Campaign & { business?: Business };
}

export function useCampaignApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Get creator profile ID from user ID
  useEffect(() => {
    const getCreatorId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setCreatorId(data.id);
      }
    };

    getCreatorId();
  }, [user?.id]);

  useEffect(() => {
    if (creatorId) {
      fetchApplications();
    }
  }, [creatorId]);

  const fetchApplications = async () => {
    if (!creatorId) return;

    try {
      setLoading(true);

      // Get all campaign_creators entries for this creator
      const { data: applicationsData, error: appsError } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table name
        .select(`
          id,
          campaign_id,
          creator_id,
          status,
          streams_target,
          streams_completed,
          total_earnings,
          paid_out,
          created_at,
          accepted_at,
          completed_at,
          declined_at,
          cancelled_at
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      if (applicationsData && applicationsData.length > 0) {
        // Get unique campaign IDs
        const campaignIds = [...new Set(applicationsData.map(app => app.campaign_id))];

        // Fetch campaign details
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select(`
            id,
            name,
            type,
            budget,
            pay_rate,
            bid_amount,
            description,
            business_id,
            status,
            start_date,
            end_date,
            created_at
          `)
          .in('id', campaignIds);

        if (campaignsError) throw campaignsError;

        // Get unique business IDs from campaigns
        const businessIds = [...new Set(campaignsData?.map(c => c.business_id) || [])];

        // Fetch business details if there are business IDs
        let businessesData: Business[] = [];
        if (businessIds.length > 0) {
          const { data, error: businessesError } = await supabase
            .from('businesses')
            .select('id, business_name, logo_url, email')
            .in('id', businessIds);

          if (!businessesError) {
            businessesData = data || [];
          }
        }

        // Combine all data
        const applicationsWithDetails = applicationsData.map(app => {
          const campaign = campaignsData?.find(c => c.id === app.campaign_id);
          const business = businessesData.find(b => b.id === campaign?.business_id);
          
          return {
            ...app,
            status: app.status.toLowerCase() as CampaignApplication['status'], // Normalize status
            campaign: campaign ? {
              ...campaign,
              business
            } : undefined
          };
        });

        setApplications(applicationsWithDetails);
      } else {
        setApplications([]);
      }

    } catch (err) {
      console.error('Error fetching campaign applications:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch applications'));
    } finally {
      setLoading(false);
    }
  };

  const applyToCampaign = async (campaignId: string, proposedAmount: number, streamsTarget: number = 4) => {
    if (!user?.id) throw new Error('User not authenticated');
    if (!creatorId) throw new Error('Creator profile not found');

    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('campaign_creators')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (existing) {
        throw new Error('You have already applied to this campaign');
      }

      // Insert into campaign_creators
      const { data, error } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table name
        .insert([{
          campaign_id: campaignId,
          creator_id: creatorId,
          status: 'pending',
          streams_target: streamsTarget,
          streams_completed: 0,
          total_earnings: proposedAmount,
          paid_out: 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Create notification for business
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('business_id, name')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase.from('notifications').insert({
          user_id: campaign.business_id,
          type: 'new_application',
          title: 'New Campaign Application! 🎉',
          message: `A creator applied to your campaign "${campaign.name}"`,
          data: { 
            campaign_id: campaignId,
            creator_id: creatorId
          },
          created_at: new Date().toISOString()
        });
      }

      await fetchApplications();
      return data;
    } catch (err) {
      console.error('Error applying to campaign:', err);
      throw err;
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'active' | 'completed' | 'declined') => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const updates: any = { status: newStatus.toUpperCase() };
      
      if (newStatus === 'active') {
        updates.accepted_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (newStatus === 'declined') {
        updates.declined_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
      return true;
    } catch (err) {
      console.error('Error updating application status:', err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    refresh: fetchApplications,
    applyToCampaign,
    updateApplicationStatus
  };
}
