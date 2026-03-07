import { supabase } from '../lib/supabase';
import { BusinessProfile, BusinessApplication } from '../types/business.types';

export const businessService = {
  async createBusinessProfile(userId: string, data: any) {
    // First, create auth user if not exists (handled by signup)
    // Then create business profile
    const { data: profile, error } = await supabase
      .from('business_profiles')
      .insert({
        user_id: userId,
        full_name: data.fullName,
        job_title: data.jobTitle,
        email: data.email,
        phone_number: data.phoneNumber,
        phone_country_code: data.phoneCountryCode || '+44',
        
        business_name: data.businessName,
        business_type: data.businessType,
        industry: data.industry,
        description: data.description,
        website: data.website,
        operating_time: data.operatingTime,
        country: data.country,
        city: data.city,
        postcode: data.postcode,
        
        socials: data.socials || [],
        goals: data.goals || [],
        campaign_type: data.campaignType,
        budget: data.budget,
        age_min: data.ageMin,
        age_max: data.ageMax,
        gender: data.gender || [],
        target_location: data.targetLocation,
        
        referral_code: data.referral,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return profile;
  },

  async uploadIdDocument(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-id-${Date.now()}.${fileExt}`;
    const filePath = `business-ids/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('business-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-documents')
      .getPublicUrl(filePath);

    // Update business profile with ID document URL
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({ id_document_url: publicUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return publicUrl;
  },

  async getBusinessProfile(userId: string) {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as BusinessProfile;
  },

  async getBusinessApplications(businessId: string) {
    const { data, error } = await supabase
      .from('business_applications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BusinessApplication[];
  },

  async checkBusinessStatus(userId: string) {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.status || null;
  }
};