// src/app/hooks/useCampaignApplications.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Campaign {
  id: string;
  name: string;
  type: string;
  budget: number;
  description: string;
  business_id: string;
  business?: {
    id: string;
    business_name: string;
    logo_url?: string;
  };
}

interface CampaignApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  proposed_amount: number;
  created_at: string;
  campaign_id: string;
  creator_id: string;
  campaign?: Campaign;
}

export function useCampaignApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      // First, get all applications
      const { data: applicationsData, error: appsError } = await supabase
        .from('campaign_applications')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      if (applicationsData && applicationsData.length > 0) {
        // Get unique campaign IDs
        const campaignIds = [...new Set(applicationsData.map(app => app.campaign_id))];

        // Fetch campaign details separately
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select(`
            id,
            name,
            type,
            budget,
            description,
            business_id
          `)
          .in('id', campaignIds);

        if (campaignsError) throw campaignsError;

        // Get unique business IDs
        const businessIds = [...new Set(campaignsData?.map(c => c.business_id) || [])];

        // Fetch business details
        const { data: businessesData, error: businessesError } = await supabase
          .from('businesses')
          .select('id, business_name, logo_url')
          .in('id', businessIds);

        if (businessesError) throw businessesError;

        // Combine all data
        const applicationsWithDetails = applicationsData.map(app => {
          const campaign = campaignsData?.find(c => c.id === app.campaign_id);
          const business = businessesData?.find(b => b.id === campaign?.business_id);
          
          return {
            ...app,
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

  const applyToCampaign = async (campaignId: string, proposedAmount: number) => {
    try {
      const { data, error } = await supabase
        .from('campaign_applications')
        .insert([{
          campaign_id: campaignId,
          creator_id: user?.id,
          proposed_amount: proposedAmount,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh applications
      await fetchApplications();
      return data;
    } catch (err) {
      console.error('Error applying to campaign:', err);
      throw err;
    }
  };

  const withdrawApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_applications')
        .delete()
        .eq('id', applicationId)
        .eq('creator_id', user?.id);

      if (error) throw error;
      
      // Refresh applications
      await fetchApplications();
    } catch (err) {
      console.error('Error withdrawing application:', err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    refresh: fetchApplications,
    applyToCampaign,
    withdrawApplication
  };
}
