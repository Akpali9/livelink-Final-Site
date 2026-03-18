import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface EarningsItem {
  id: string;
  creator_id: string;
  campaign_id: string;
  campaign_name: string;
  business_name: string;
  amount: number;
  paid_out: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  completed_at?: string;
  paid_at?: string;
}

interface CampaignEarnings {
  id: string;
  campaign_id: string;
  creator_id: string;
  total_earnings: number;
  paid_out: number;
  status: string;
  created_at: string;
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

export function useEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [paidOut, setPaidOut] = useState(0);
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
  }, [user]);

  useEffect(() => {
    if (creatorId) {
      fetchEarnings();
    } else if (user && !creatorId) {
      // User exists but no creator profile - set loading to false
      setLoading(false);
    }
  }, [creatorId, user]);

  const fetchEarnings = async () => {
    if (!creatorId) return;

    try {
      setLoading(true);

      // Fetch earnings from campaign_creators with campaign and business details
      const { data, error } = await supabase
        .from('campaign_creators') // ✅ Fixed: correct table
        .select(`
          id,
          campaign_id,
          creator_id,
          total_earnings,
          paid_out,
          status,
          created_at,
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
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching earnings:', error);
        throw error;
      }

      if (data) {
        // Transform data to earnings items
        const earningsItems: EarningsItem[] = data.map((item: any) => ({
          id: item.id,
          creator_id: item.creator_id,
          campaign_id: item.campaign_id,
          campaign_name: item.campaign?.name || 'Unknown Campaign',
          business_name: item.campaign?.business?.business_name || 'Unknown Business',
          amount: item.total_earnings || 0,
          paid_out: item.paid_out || 0,
          status: item.status === 'completed' ? 'paid' : 
                  item.status === 'active' ? 'pending' : 
                  'cancelled',
          created_at: item.created_at,
          completed_at: item.completed_at,
          paid_at: item.completed_at // Use completed_at as paid_at
        }));

        setEarnings(earningsItems);

        // Calculate totals
        const total = earningsItems.reduce((sum, e) => sum + e.amount, 0);
        const paid = earningsItems.reduce((sum, e) => sum + e.paid_out, 0);
        const pending = total - paid;

        setTotalEarned(total);
        setPaidOut(paid);
        setPendingEarnings(pending);
      } else {
        setEarnings([]);
        setTotalEarned(0);
        setPaidOut(0);
        setPendingEarnings(0);
      }

    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch earnings'));
    } finally {
      setLoading(false);
    }
  };

  // Get earnings grouped by status
  const getEarningsByStatus = () => {
    const pending = earnings.filter(e => e.status === 'pending');
    const paid = earnings.filter(e => e.status === 'paid');
    const cancelled = earnings.filter(e => e.status === 'cancelled');

    return {
      pending,
      paid,
      cancelled,
      pendingTotal: pending.reduce((sum, e) => sum + (e.amount - e.paid_out), 0),
      paidTotal: paid.reduce((sum, e) => sum + e.paid_out, 0),
      cancelledTotal: cancelled.reduce((sum, e) => sum + e.amount, 0)
    };
  };

  // Get earnings by month for charts
  const getEarningsByMonth = () => {
    const monthlyData: Record<string, { month: string; earnings: number; paid: number }> = {};

    earnings.forEach(e => {
      const date = new Date(e.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, earnings: 0, paid: 0 };
      }

      monthlyData[monthKey].earnings += e.amount;
      if (e.status === 'paid') {
        monthlyData[monthKey].paid += e.paid_out;
      }
    });

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  };

  const byStatus = getEarningsByStatus();
  const monthlyEarnings = getEarningsByMonth();

  return {
    earnings,
    totalEarned,
    pendingEarnings,
    paidOut,
    byStatus,
    monthlyEarnings,
    loading,
    error,
    refresh: fetchEarnings
  };
}
