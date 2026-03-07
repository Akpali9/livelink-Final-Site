import { supabase } from '../lib/supabase';

// Create a held payment for a campaign
export async function holdPayment(campaignId: string, amount: number) {
  const { data, error } = await supabase
    .from("payments")
    .insert([{ campaign_id: campaignId, amount, status: "held" }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fetch campaign info including creator
export async function getCampaignById(campaignId: string) {
  const { data, error } = await supabase
    .from("business_campaigns")
    .select(`
      *,
      creator:creator_id (full_name, username, avatar_url)
    `)
    .eq("id", campaignId)
    .single();

  if (error) throw error;
  return data;
}