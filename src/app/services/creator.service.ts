import { supabase } from '../lib/supabase';
import { CreatorProfile, CreatorApplication } from '../types/creator.types';

export const creatorService = {
  async createCreatorProfile(userId: string, data: any) {
    const { data: profile, error } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: userId,
        full_name: data.fullName,
        dob: data.dob,
        email: data.email,
        phone_number: data.phoneNumber,
        phone_country_code: data.phoneCountryCode || '+44',
        country: data.country,
        city: data.city,
        
        platforms: data.platforms || [],
        frequency: data.frequency,
        duration: data.duration,
        days: data.days || [],
        time_of_day: data.timeOfDay,
        avg_concurrent: parseInt(data.avgConcurrent) || 0,
        avg_peak: parseInt(data.avgPeak) || 0,
        avg_weekly: parseInt(data.avgWeekly) || 0,
        categories: data.categories || [],
        audience_bio: data.audienceBio,
        
        referral_code: data.referral,
        verification_status: 'pending',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return profile;
  },

  async uploadVerificationDocument(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-verification-${Date.now()}.${fileExt}`;
    const filePath = `creator-verification/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('creator-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('creator-documents')
      .getPublicUrl(filePath);

    // Update creator profile with document URL
    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update({ verification_document_url: publicUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return publicUrl;
  },

  async getCreatorProfile(userId: string) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as CreatorProfile;
  },

  async updateCreatorProfile(userId: string, updates: Partial<CreatorProfile>) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPendingApplications() {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select(`
        *,
        user:auth.users!user_id(email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async reviewApplication(creatorId: string, status: 'approved' | 'rejected', notes: string) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Create application record
    const { error: appError } = await supabase
      .from('creator_applications')
      .insert({
        creator_id: creatorId,
        status: status === 'approved' ? 'approved' : 'rejected',
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (appError) throw appError;

    return data;
  },

  async checkCreatorStatus(userId: string) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.status || null;
  }
};