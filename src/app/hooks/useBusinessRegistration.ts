import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ... (keep all your existing interfaces)

export function useBusinessRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ... (keep your existing helper functions)

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

      // Check if this is a re-registration for a rejected user
      if (isReRegister) {
        console.log('🔄 Re-registration detected for:', cleanEmail);
        
        // Try to find the user first
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === cleanEmail);
        
        if (existingUser) {
          // Delete the old business profile
          const { error: deleteError } = await supabase
            .from('businesses')
            .delete()
            .eq('user_id', existingUser.id);
            
          if (deleteError) {
            console.error('Error deleting old profile:', deleteError);
          } else {
            console.log('✅ Old rejected profile deleted');
          }
        }
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
            created_at: new Date().toISOString(),
            is_reapplication: isReRegister
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=business`
        }
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError);
        
        if (signUpError.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please login instead.');
        } else {
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
      const uploadResult = await uploadIdDocument(idFile, authData.user.id);
      
      if (uploadResult.success) {
        idDocumentUrl = uploadResult.url || '';
        console.log('✅ ID document uploaded successfully');
      } else {
        console.warn('⚠️ ID upload failed:', uploadResult.error);
        toast.warning('ID upload failed but we saved your application. Support will contact you.');
      }

      // Create business profile
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
          verification_document_url: idDocumentUrl || null,
          verification_status: 'pending',
          application_status: 'pending',
          status: 'pending_verification',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_reapplication: isReRegister
        });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        return { 
          success: false, 
          error: `Failed to create business profile: ${profileError.message}`,
          user: authData.user
        };
      }

      console.log('✅ Business profile created successfully');

      // Send appropriate notification
      const notificationMessage = isReRegister
        ? 'Your re-application has been submitted and is under review.'
        : 'Your business registration has been submitted and is under review.';

      await supabase.from('notifications').insert({
        user_id: authData.user.id,
        title: isReRegister ? 'Re-application Submitted' : 'Registration Submitted',
        message: notificationMessage,
        type: 'system',
        data: { application_status: 'pending', is_reapplication: isReRegister },
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
