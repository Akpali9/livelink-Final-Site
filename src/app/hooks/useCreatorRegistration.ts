import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { creatorService } from '../services/creator.service';
import { authService } from '../services/auth.service';

export function useCreatorRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submitRegistration = async (formData: any, verificationFile?: File) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Sign up the user
      const { user } = await authService.signUp(
        formData.email,
        formData.password,
        {
          username: formData.fullName?.toLowerCase().replace(/\s+/g, '_'),
          full_name: formData.fullName,
          role: 'creator'
        }
      );

      if (!user) throw new Error('Failed to create user account');

      // Step 2: Create creator profile
      const creatorProfile = await creatorService.createCreatorProfile(
        user.id,
        formData
      );

      // Step 3: Upload verification document if provided
      if (verificationFile) {
        await creatorService.uploadVerificationDocument(user.id, verificationFile);
      }

      return { success: true, creatorProfile };
    } catch (err: any) {
      setError(err.message);
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