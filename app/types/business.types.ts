export interface BusinessProfile {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string;
  email: string;
  phone_number: string;
  phone_country_code: string;
  
  // Business Info
  business_name: string;
  business_type: 'Sole Trader' | 'Limited Company' | 'Partnership' | 'Other / Not Registered';
  industry: string;
  description: string;
  website: string;
  operating_time: string;
  country: string;
  city: string;
  postcode: string;
  
  // Social Media
  socials: { platform: string; handle: string }[];
  
  // Goals & Targeting
  goals: string[];
  campaign_type: string;
  budget: string;
  age_min: number;
  age_max: number;
  gender: string[];
  target_location: string;
  
  // Verification
  referral_code: string;
  id_verified: boolean;
  id_document_url: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BusinessApplication {
  id: string;
  business_id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewer_notes: string;
  reviewed_at: string;
  reviewed_by: string;
  created_at: string;
}