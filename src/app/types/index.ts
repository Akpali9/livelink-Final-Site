export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: 'user' | 'creator' | 'business' | 'admin';
  is_live: boolean;
  stream_key: string | null;
  
  // Earnings (for creators)
  total_earned?: number;
  pending?: number;
  paid_out?: number;
  
  // Business fields
  business_name?: string;
  business_type?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface SocialConnection {
  id: string;
  user_id: string;
  provider: string;
  provider_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}