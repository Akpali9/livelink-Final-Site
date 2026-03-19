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
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password should contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password should contain at least one number' };
    }
    return { valid: true };
  };

  const submitRegistration = async (
    formData: BusinessFormData, 
    idFile: File,
    isReRegister: boolean = false
  ): Promise<RegistrationResult> => {
    setLoading(true);
    setError(null);

    try {
      // Validate email
      const cleanEmail = formData.email.trim().toLowerCase();
      if (!validateEmail(cleanEmail)) {
        throw new Error('Please enter a valid email address (e.g., name@company.com)');
      }

      // Validate password
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate required fields
      const requiredFields = [
        { field: formData.fullName, name: 'Full name' },
        { field: formData.jobTitle, name: 'Job title' },
        { field: formData.businessName, name: 'Business name' },
        { field: formData.businessType, name: 'Business type' },
        { field: formData.industry, name: 'Industry' },
        { field: formData.country, name: 'Country' },
        { field: formData.phoneNumber, name: 'Phone number' }
      ];

      for (const req of requiredFields) {
        if (!req.field || req.field.trim() === '') {
          throw new Error(`${req.name} is required`);
        }
      }

      if (!formData.goals || formData.goals.length === 0) {
        throw new Error('Please select at least one advertising goal');
      }

      if (!formData.campaignType) {
        throw new Error('Please select a campaign type');
      }

      if (!formData.budget) {
        throw new Error('Please select a monthly budget range');
      }

      // Create auth user
      console.log('📝 Creating auth user for:', cleanEmail);

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            user_type: 'business',
            role: 'business',
            job_title: formData.jobTitle.trim(),
            phone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
            business_name: formData.businessName.trim(),
            created_at: new Date().toISOString()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=business`
        }
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError);
        
        if (signUpError.message.includes('User already registered') || 
            signUpError.code === 'email_exists' ||
            signUpError.message.includes('already exists')) {
          throw new Error('An account with this email already exists. Please login instead.');
        } 
        else if (signUpError.message.includes('email_provider_disabled')) {
          throw new Error('Email signups are currently disabled. Please contact support.');
        }
        else if (signUpError.message.includes('Unable to validate email')) {
          throw new Error('Please enter a valid email address');
        }
        else if (signUpError.message.includes('Password should be at least 6 characters')) {
          throw new Error('Password must be at least 6 characters long');
        }
        else {
          throw new Error(`Signup failed: ${signUpError.message}`);
        }
      }

      if (!authData?.user) {
        throw new Error('Failed to create user account - no user returned');
      }

      console.log('✅ Auth user created successfully:', authData.user.id);

      const needsEmailConfirmation = !authData.user?.confirmed_at;

      // Upload ID document
      let idDocumentUrl = '';
      if (idFile) {
        console.log('📝 Uploading ID document...');
        const uploadResult = await uploadIdDocument(idFile, authData.user.id);
        
        if (uploadResult.success) {
          idDocumentUrl = uploadResult.url || '';
          console.log('✅ ID document uploaded successfully');
        } else {
          console.warn('⚠️ ID upload failed:', uploadResult.error);
          toast.warning('ID upload failed but we saved your application. Support will contact you.');
        }
      }

      // Create business profile - REMOVED is_reapplication field
      console.log('📝 Creating business profile...');

      const { error: profileError } = await supabase
        .from('businesses')
        .insert({
          user_id: authData.user.id,
          business_name: formData.businessName.trim(),
          full_name: formData.fullName.trim(),
          job_title: formData.jobTitle.trim(),
          email: cleanEmail,
          phone_number: `${formData.phoneCountryCode}${formData.phoneNumber}`,
          industry: formData.industry,
          description: formData.description?.trim() || null,
          website: formData.website?.trim() || null,
          country: formData.country,
          city: formData.city?.trim() || null,
          postcode: formData.postcode?.trim() || null,
          operating_since: formData.operatingTime || null,
          verification_document_url: idDocumentUrl || null,
          verification_status: 'pending',
          application_status: 'pending',
          status: 'pending_verification',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('❌ Profile creation error:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // If the error is about a missing column, try a minimal insert
        if (profileError.message.includes('operating_since')) {
          console.log('🔄 Retrying without operating_since field...');
          
          // Retry without operating_since
          const { error: retryError } = await supabase
            .from('businesses')
            .insert({
              user_id: authData.user.id,
              business_name: formData.businessName.trim(),
              full_name: formData.fullName.trim(),
              job_title: formData.jobTitle.trim(),
              email: cleanEmail,
              phone_number: `${formData.phoneCountryCode}${formData.phoneNumber}`,
              industry: formData.industry,
              description: formData.description?.trim() || null,
              website: formData.website?.trim() || null,
              country: formData.country,
              city: formData.city?.trim() || null,
              postcode: formData.postcode?.trim() || null,
              verification_document_url: idDocumentUrl || null,
              verification_status: 'pending',
              application_status: 'pending',
              status: 'pending_verification',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (retryError) {
            return { 
              success: false, 
              error: `Failed to create business profile: ${retryError.message}`,
              user: authData.user
            };
          }
        } else {
          return { 
            success: false, 
            error: `Failed to create business profile: ${profileError.message}`,
            user: authData.user
          };
        }
      }

      console.log('✅ Business profile created successfully');

      // Update user metadata with preferences
      await supabase.auth.updateUser({
        data: {
          goals: formData.goals,
          campaign_type_preference: formData.campaignType,
          budget_range: formData.budget,
          target_age_range: { min: formData.ageMin, max: formData.ageMax },
          target_gender: formData.gender,
          target_location: formData.targetLocation?.trim() || null,
          referral_code: formData.referral?.trim() || null,
          application_submitted: true,
          application_status: 'pending'
        }
      });

      // Send confirmation notification
      const notificationMessage = isReRegister
        ? 'Your re-application has been submitted and is under review.'
        : 'Your business registration has been submitted and is under review.';

      await supabase.from('notifications').insert({
        user_id: authData.user.id,
        title: isReRegister ? 'Re-application Submitted' : 'Registration Submitted',
        message: notificationMessage,
        type: 'system',
        data: { application_status: 'pending' },
        created_at: new Date().toISOString()
      });

      // Send admin notification
      await supabase.from('notifications').insert({
        user_id: 'admin',
        title: isReRegister ? 'New Business Re-application' : 'New Business Application',
        message: `${formData.businessName} has submitted ${isReRegister ? 'a re-application' : 'an application'} for review.`,
        type: 'admin_notification',
        data: { 
          business_name: formData.businessName, 
          user_id: authData.user.id
        },
        created_at: new Date().toISOString()
      });

      const successMessage = needsEmailConfirmation
        ? 'Registration submitted! Please check your email to confirm your account.'
        : 'Registration submitted successfully! You can now log in.';
      
      toast.success(successMessage);
      
      return { 
        success: true, 
        user: authData.user,
        needsEmailConfirmation 
      };

    } catch (err: any) {
      console.error('❌ Registration error:', err);
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
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?role=business`
        }
      });

      if (error) throw error;
      
      toast.success('Confirmation email resent! Please check your inbox.');
      return true;
    } catch (err: any) {
      console.error('Resend error:', err);
      toast.error(err.message || 'Failed to resend confirmation email');
      return false;
    }
  };

  return { 
    submitRegistration, 
    resendConfirmationEmail,
    loading, 
    error 
  };
}
