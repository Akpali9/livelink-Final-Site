import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface CreatorFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  country: string;
  city: string;
  bio?: string;
  niches?: string[];
  avgViewers?: number;
  platforms?: { type: string; username: string; url: string; followers?: number }[];
}

export function useCreatorRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const uploadVerificationDocument = async (userId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('creator-verifications')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('creator-verifications')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading verification document:', err);
      return null;
    }
  };

  const createCreatorProfile = async (userId: string, formData: CreatorFormData, verificationUrl?: string) => {
    // Create username from email or full name
    const username = formData.email.split('@')[0] || 
                     formData.fullName.toLowerCase().replace(/\s+/g, '_');

    const { data, error } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: userId,
        full_name: formData.fullName,
        username: username,
        email: formData.email,
        bio: formData.bio || '',
        location: `${formData.city || ''}, ${formData.country || ''}`,
        country: formData.country,
        city: formData.city,
        phone_number: formData.phoneNumber,
        niche: formData.niches || [],
        avg_viewers: formData.avgViewers || 0,
        total_streams: 0,
        rating: 0,
        status: 'pending_review',
        verification_document_url: verificationUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const createCreatorPlatforms = async (creatorId: string, platforms: { type: string; username: string; url: string; followers?: number }[]) => {
    if (!platforms?.length) return;

    const platformInserts = platforms.map(p => ({
      creator_id: creatorId,
      platform_type: p.type,
      username: p.username,
      profile_url: p.url,
      followers_count: p.followers || 0,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('creator_platforms')
      .insert(platformInserts);

    if (error) {
      console.error('Error creating platforms:', error);
      // Don't throw - non-critical
    }
  };

  const submitRegistration = async (formData: CreatorFormData, verificationFile?: File) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Step 2: Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: 'creator',
            role: 'creator'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=creator`
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Step 3: Upload verification document if provided
      let verificationUrl: string | undefined;
      if (verificationFile) {
        verificationUrl = await uploadVerificationDocument(authData.user.id, verificationFile) || undefined;
      }

      // Step 4: Create creator profile
      const creatorProfile = await createCreatorProfile(authData.user.id, formData, verificationUrl);

      // Step 5: Create platforms if provided
      if (formData.platforms?.length) {
        await createCreatorPlatforms(creatorProfile.id, formData.platforms);
      }

      // Step 6: Send welcome notification
      await supabase.from('notifications').insert({
        user_id: authData.user.id,
        type: 'welcome',
        title: 'Welcome to LiveLink! 🎉',
        message: 'Your creator application has been submitted and is under review.',
        data: { status: 'pending_review' },
        created_at: new Date().toISOString()
      });

      toast.success('Registration submitted successfully! Please check your email to verify your account.');
      
      return { 
        success: true, 
        creatorProfile,
        needsEmailConfirmation: !authData.user.confirmed_at
      };

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    submitRegistration,
    loading,
    error
  };
}
