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
  description: string;
  business_id: string;
  status: string;
  created_at: string;
}

interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  proposed_amount: number;
  created_at: string;
  updated_at?: string;
  campaign?: Campaign & { business?: Business };
}

export function useCampaignApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchApplications();
    }
  }, [user?.id]);

  const fetchApplications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // First get all applications for this creator
      const { data: applicationsData, error: appsError } = await supabase
        .from('campaign_applications')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      if (applicationsData && applicationsData.length > 0) {
        // Get unique campaign IDs
        const campaignIds = [...new Set(applicationsData.map(app => app.campaign_id))];

        // Fetch campaign details
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
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
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('campaign_applications')
        .insert([{
          campaign_id: campaignId,
          creator_id: user.id,
          proposed_amount: proposedAmount,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchApplications();
      return data;
    } catch (err) {
      console.error('Error applying to campaign:', err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    refresh: fetchApplications,
    applyToCampaign
  };
}
