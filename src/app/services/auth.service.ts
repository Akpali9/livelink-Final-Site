import { supabase } from '../lib/supabase';
import { Profile } from '../types/index';

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, userData: Partial<Profile>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role || 'user' // Default role is 'user'
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    
    // Create profile in profiles table if user was created
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: userData.username,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url || `https://ui-avatars.com/api/?name=${userData.username || userData.full_name}&background=random`,
          role: userData.role || 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw here - user is created but profile failed
        // You might want to handle this differently in production
      }
    }
    
    return data;
  },

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Get the current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get a user's profile by ID
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Get a user's profile by username
   */
  async getProfileByUsername(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Update a user's profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Upload a profile avatar
   */
  async uploadAvatar(userId: string, file: File) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile with new avatar URL
    await this.updateProfile(userId, { avatar_url: publicUrl });

    return publicUrl;
  },

  /**
   * Delete a user's avatar
   */
  async deleteAvatar(userId: string, avatarUrl: string) {
    // Extract file path from URL
    const urlParts = avatarUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `avatars/${fileName}`;

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (deleteError) throw deleteError;

    // Update profile to remove avatar URL
    await this.updateProfile(userId, { avatar_url: null });

    return true;
  },

  /**
   * Send a password reset email
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  },

  /**
   * Update user email
   */
  async updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });
    
    if (error) throw error;
  },

  /**
   * Check if a username is available
   */
  async isUsernameAvailable(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    
    if (error) throw error;
    return !data;
  },

  /**
   * Get user role
   */
  async getUserRole(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data?.role;
  },

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, role: string | string[]) {
    const userRole = await this.getUserRole(userId);
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    
    return userRole === role;
  },

  /**
   * Refresh the user's session
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  },

  /**
   * Sign in with magic link (email only)
   */
  async signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  },

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'facebook' | 'twitter') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete user account (requires authentication)
   */
  async deleteAccount(userId: string) {
    // Note: This requires a Supabase Edge Function or admin API
    // as users cannot delete themselves through the client SDK
    
    // First, delete profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;

    // Then delete auth user (this requires admin privileges)
    // You might want to use an Edge Function for this
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;
  },

  /**
   * Get user's social connections
   */
  async getSocialConnections(userId: string) {
    const { data, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  /**
   * Link social account to user
   */
  async linkSocialAccount(provider: string, accessToken: string) {
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  },

  /**
   * Unlink social account
   */
  async unlinkSocialAccount(providerId: string) {
    const { error } = await supabase.auth.unlinkIdentity(providerId);
    if (error) throw error;
  },

  /**
   * Check if email is verified
   */
  async isEmailVerified() {
    const user = await this.getCurrentUser();
    return user?.email_confirmed_at ? true : false;
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  }
};