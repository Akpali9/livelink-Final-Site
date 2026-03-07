import { supabase } from "../lib/supabase"; 

export async function submitCampaign(userId: string, campaignData: any) {
  const transactionId = `LL-CAM-${Math.floor(Math.random() * 100000)}-SUCCESS`;
  
  const { data, error } = await supabase
    .from("business_campaigns")
    .insert([
      {
        user_id: userId,
        title: campaignData.title,
        status: "under_review",
        payment_status: "held",
        transaction_id: transactionId,
        notes: campaignData.notes || null,
      }
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}
export async function getLatestCampaign(userId: string) {
  const { data, error } = await supabase
    .from("business_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}
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