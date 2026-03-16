// src/app/hooks/useEarnings.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Earnings {
  id: string;
  creator_id: string;
  amount: number;
  type: 'campaign' | 'bonus' | 'withdrawal';
  status: 'pending' | 'paid' | 'cancelled';
  campaign_id?: string;
  description?: string;
  created_at: string;
  paid_at?: string;
}

export function useEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earnings[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, set empty array
        if (error.code === '42P01') { // undefined_table
          setEarnings([]);
          setTotalEarned(0);
          setPendingEarnings(0);
          return;
        }
        throw error;
      }

      setEarnings(data || []);

      // Calculate totals
      const total = (data || [])
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.amount, 0);

      const pending = (data || [])
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0);

      setTotalEarned(total);
      setPendingEarnings(pending);

    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch earnings'));
    } finally {
      setLoading(false);
    }
  };

  return {
    earnings,
    totalEarned,
    pendingEarnings,
    loading,
    error,
    refresh: fetchEarnings
  };
}
