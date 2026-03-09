import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface BusinessFormData {
  fullName: string;
  jobTitle: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  phoneCountryCode: string;
  businessName: string;
  businessType: string;
  industry: string;
  description?: string;
  website?: string;
  socials: { platform: string; handle: string }[];
  country: string;
  city?: string;
  postcode?: string;
  operatingTime?: string;
  goals: string[];
  campaignType: string;
  budget: string;
  ageMin: number;
  ageMax: number;
  gender: string[];
  targetLocation?: string;
  referral?: string;
  agreeToTerms: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface RegistrationResult {
  success: boolean;
  user?: any;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export function useBusinessRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadIdDocument = async (file: File, userId: string): Promise<UploadResult> => {
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Invalid file type. Please upload JPG, PNG, or PDF.' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'File too large. Maximum size is 5MB.' };
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/id-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-verifications')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-verifications')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.error('ID upload error:', err);
      return { success: false, error: err.message || 'Failed to upload ID document' };
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim().toLowerCase());
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters long' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password should contain at least one uppercase letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Password should contain at least one number' };
    return { valid: true };
  };

  const submitRegistration = async (
    formData: BusinessFormData,
    idFile: File
  ): Promise<RegistrationResult> => {
    setLoading(true);
    setError(null);

    try {
      // ── Validate ──────────────────────────────────────────
      const cleanEmail = formData.email.trim().toLowerCase();
      if (!validateEmail(cleanEmail)) throw new Error('Please enter a valid email address');

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) throw new Error(passwordValidation.message);
      if (formData.password !== formData.confirmPassword) throw new Error('Passwords do not match');

      const requiredFields = [
        { field: formData.fullName,      name: 'Full name' },
        { field: formData.jobTitle,      name: 'Job title' },
        { field: formData.businessName,  name: 'Business name' },
        { field: formData.businessType,  name: 'Business type' },
        { field: formData.industry,      name: 'Industry' },
        { field: formData.country,       name: 'Country' },
        { field: formData.phoneNumber,   name: 'Phone number' },
      ];
      for (const req of requiredFields) {
        if (!req.field?.trim()) throw new Error(`${req.name} is required`);
      }
      if (!formData.goals?.length)  throw new Error('Please select at least one advertising goal');
      if (!formData.campaignType)   throw new Error('Please select a campaign type');
      if (!formData.budget)         throw new Error('Please select a monthly budget range');

      // ── Create auth user ──────────────────────────────────
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name:     formData.fullName.trim(),
            user_type:     'business',
            job_title:     formData.jobTitle.trim(),
            phone:         `${formData.phoneCountryCode}${formData.phoneNumber}`,
            business_name: formData.businessName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') ||
            signUpError.message.includes('already exists') ||
            signUpError.code === 'email_exists') {
          throw new Error('An account with this email already exists. Please login instead.');
        }
        throw new Error(`Signup failed: ${signUpError.message}`);
      }

      if (!authData?.user) throw new Error('Failed to create user account');

      const needsEmailConfirmation = !authData.user.confirmed_at;

      // ── Upload ID ─────────────────────────────────────────
      let idDocumentUrl = '';
      const uploadResult = await uploadIdDocument(idFile, authData.user.id);
      if (uploadResult.success) {
        idDocumentUrl = uploadResult.url || '';
      } else {
        console.warn('ID upload failed:', uploadResult.error);
        toast.warning('ID upload failed but we saved your application. Support will contact you.');
      }

      // ── Insert business profile ───────────────────────────
      // ✅ Uses actual column names from the businesses table
      const { error: profileError } = await supabase
        .from('businesses')
        .insert({
          user_id:              authData.user.id,
          name:                 formData.businessName.trim(),   // ✅ "name" not "business_name"
          website:              formData.website?.trim() || null,
          bio:                  formData.description?.trim() || null, // ✅ "bio" not "description"
          business_type:        formData.businessType,
          industry:             formData.industry,
          country:              formData.country,
          city:                 formData.city?.trim() || null,
          postcode:             formData.postcode?.trim() || null,
          operating_since:      formData.operatingTime || null,
          contact_name:         formData.fullName.trim(),
          contact_job_title:    formData.jobTitle.trim(),
          contact_email:        cleanEmail,
          contact_phone:        `${formData.phoneCountryCode}${formData.phoneNumber}`,
          id_verification_url:  idDocumentUrl || null,
          id_verified:          false,
          application_status:   'pending',
          submitted_at:         new Date().toISOString(),
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast.warning('Account created but profile setup incomplete. Support will contact you.');
        await supabase.from('notifications').insert({
          user_id: authData.user.id,
          title:   'Business Registration Issue',
          message: `Profile creation failed for ${formData.businessName}. Error: ${profileError.message}`,
          type:    'system',
          data:    { user_id: authData.user.id, email: cleanEmail },
        });
      }

      // ── Insert socials (non-critical) ─────────────────────
      const validSocials = formData.socials?.filter(s => s.handle?.trim());
      if (validSocials?.length) {
        await supabase.from('business_socials').insert(
          validSocials.map(s => ({
            user_id:  authData.user.id,
            platform: s.platform,
            handle:   s.handle.trim(),
          }))
        );
      }

      // ── Insert preferences (non-critical) ─────────────────
      if (formData.goals?.length) {
        await supabase.from('business_preferences').insert({
          user_id:         authData.user.id,
          goals:           formData.goals,
          campaign_type:   formData.campaignType,
          monthly_budget:  formData.budget,
          target_age_min:  formData.ageMin || 18,
          target_age_max:  formData.ageMax || 65,
          target_gender:   formData.gender || [],
          target_location: formData.targetLocation?.trim() || null,
          referral_code:   formData.referral?.trim() || null,
        });
      }

      // ── Confirmation notification ─────────────────────────
      await supabase.from('notifications').insert({
        user_id: authData.user.id,
        title:   'Registration Submitted',
        message: 'Your business registration has been submitted and is under review.',
        type:    'system',
        data:    { application_status: 'pending' },
      });

      toast.success(
        needsEmailConfirmation
          ? 'Registration submitted! Please check your email to confirm your account.'
          : 'Registration submitted successfully! You can now log in.'
      );

      return { success: true, user: authData.user, needsEmailConfirmation };

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resend({
        type:  'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.success('Confirmation email resent! Please check your inbox.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend confirmation email');
      return false;
    }
  };

  return { submitRegistration, resendConfirmationEmail, loading, error };
}
