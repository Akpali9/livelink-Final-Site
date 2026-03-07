// ============================================
// Creator Profile Types
// ============================================

export interface CreatorProfile {
  id: string;
  user_id: string;
  
  // Personal Information
  full_name: string;
  dob: string; // ISO date string
  email: string;
  phone_number: string;
  phone_country_code: string;
  country: string;
  city: string;
  
  // Streaming Platforms
  platforms: CreatorPlatform[];
  
  // Streaming Habits
  frequency: StreamingFrequency;
  duration: StreamDuration;
  days: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  time_of_day: TimeOfDay;
  avg_concurrent: number;
  avg_peak: number;
  avg_weekly: number;
  categories: ContentCategory[];
  audience_bio: string;
  
  // Verification
  referral_code?: string;
  verification_document_url?: string;
  verification_status: VerificationStatus;
  
  // Earnings
  total_earned: number;
  pending: number;
  paid_out: number;
  
  // Status
  status: CreatorStatus;
  rejection_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// Streaming Platform Types
// ============================================

export interface CreatorPlatform {
  id?: string;
  type: PlatformType;
  username: string;
  url: string;
  followers?: number;
  verified: boolean;
  verified_at?: string;
}

export type PlatformType = 
  | 'Twitch'
  | 'Kick'
  | 'YouTube'
  | 'TikTok'
  | 'Instagram'
  | 'Facebook'
  | 'Trovo'
  | 'Other';

// ============================================
// Streaming Habit Types
// ============================================

export type StreamingFrequency = 
  | 'Daily'
  | 'Several times a week'
  | 'Weekly'
  | 'A few times a month'
  | 'Monthly or less';

export type StreamDuration = 
  | 'Under 30 minutes'
  | '30 to 45 minutes'
  | '45 minutes to 1 hour'
  | '1 to 2 hours'
  | 'Over 2 hours';

export type TimeOfDay = 
  | 'Morning (6am–12pm)'
  | 'Afternoon (12pm–5pm)'
  | 'Evening (5pm–9pm)'
  | 'Late Night (9pm–12am)'
  | 'Varies';

export type ContentCategory = 
  | 'Gaming'
  | 'Beauty & Makeup'
  | 'Fashion'
  | 'Fitness & Health'
  | 'Food & Cooking'
  | 'Music'
  | 'Comedy'
  | 'Education'
  | 'Business & Finance'
  | 'Lifestyle'
  | 'Sports'
  | 'Tech'
  | 'Travel'
  | 'Other';

// ============================================
// Status Types
// ============================================

export type CreatorStatus = 
  | 'pending'      // Application submitted, awaiting review
  | 'under_review' // Being reviewed by admin
  | 'approved'     // Application approved
  | 'rejected'     // Application rejected
  | 'suspended';   // Account suspended

export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'rejected';

// ============================================
// Campaign/Request Types
// ============================================

export interface CampaignRequest {
  id: string;
  creator_id: string;
  business_id: string;
  business_name: string;
  business_logo: string;
  campaign_name: string;
  campaign_type: CampaignType;
  streams_required: number;
  price: number;
  days_left: number;
  requirements: CampaignRequirements;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export type CampaignType = 
  | 'Banner Only'
  | 'Promo Code'
  | 'Banner + Promo'
  | 'Product Placement'
  | 'Sponsored Stream';

export interface CampaignRequirements {
  min_duration_minutes: number;
  required_mentions: number;
  required_actions: string[];
  content_guidelines: string;
  target_demographics?: TargetDemographics;
}

export interface TargetDemographics {
  age_range: [number, number]; // [min, max]
  genders: string[];
  locations: string[];
  interests: string[];
}

export type RequestStatus = 
  | 'pending'      // New request from business
  | 'accepted'     // Creator accepted
  | 'declined'     // Creator declined
  | 'expired'      // Request expired
  | 'completed';   // Campaign completed

// ============================================
// Live Campaign Types
// ============================================

export interface LiveCampaign {
  id: string;
  creator_id: string;
  request_id: string;
  business_name: string;
  business_logo: string;
  campaign_name: string;
  session_earnings: number;
  stream_time: string; // ISO time
  progress: number; // Percentage 0-100
  remaining_mins: number;
  started_at: string;
  is_live: boolean;
}

// ============================================
// Creator Application Types
// ============================================

export interface CreatorApplication {
  id: string;
  creator_id: string;
  status: ApplicationReviewStatus;
  reviewer_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

export type ApplicationReviewStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

// ============================================
// Creator Analytics Types
// ============================================

export interface CreatorAnalytics {
  id: string;
  creator_id: string;
  month: string; // YYYY-MM
  avg_concurrent: number;
  avg_peak: number;
  total_views: number;
  total_streams: number;
  total_hours: number;
  screenshot_url?: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
}

// ============================================
// Earnings & Payout Types
// ============================================

export interface EarningsSummary {
  total_earned: number;
  pending: number;
  paid_out: number;
  this_month: number;
  last_month: number;
}

export interface PayoutHistory {
  id: string;
  creator_id: string;
  amount: number;
  status: PayoutStatus;
  payment_method: PaymentMethod;
  paid_at?: string;
  created_at: string;
}

export type PayoutStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type PaymentMethod = 
  | 'bank_transfer'
  | 'paypal'
  | 'crypto';

// ============================================
// Upcoming Campaign Types
// ============================================

export interface UpcomingCampaign {
  id: string;
  creator_id: string;
  business_name: string;
  business_logo: string;
  start_date: string; // ISO date
  package: string;
  requirements: string;
  status: UpcomingStatus;
}

export type UpcomingStatus = 
  | 'scheduled'
  | 'preparing'
  | 'ready'
  | 'starting_soon';

// ============================================
// Dashboard Status Counts
// ============================================

export interface StatusCounts {
  requested: number;  // New requests from businesses
  pending: number;    // Accepted but not started
  completed: number;  // Completed campaigns
}

// ============================================
// Form Data Types (for registration)
// ============================================

export interface CreatorFormData {
  // Step 1 - Personal
  fullName: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  phoneCountryCode: string;
  country: string;
  city: string;
  
  // Step 2 - Platforms
  platforms: { type: PlatformType; username: string; url: string }[];
  
  // Step 3 - Habits
  frequency: StreamingFrequency;
  duration: StreamDuration;
  days: string[];
  timeOfDay: TimeOfDay;
  avgConcurrent: string;
  avgPeak: string;
  avgWeekly: string;
  categories: ContentCategory[];
  audienceBio: string;
  
  // Step 4 - Verification
  referral: string;
  agreeToTerms: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface CreatorApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreatorListResponse {
  creators: CreatorProfile[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// Filter & Search Types
// ============================================

export interface CreatorFilters {
  categories?: ContentCategory[];
  minFollowers?: number;
  maxFollowers?: number;
  countries?: string[];
  languages?: string[];
  platforms?: PlatformType[];
  status?: CreatorStatus;
  verificationStatus?: VerificationStatus;
}

export interface CreatorSortOptions {
  field: 'total_earned' | 'avg_concurrent' | 'created_at' | 'full_name';
  direction: 'asc' | 'desc';
}

// ============================================
// Notification Types
// ============================================

export interface CreatorNotification {
  id: string;
  creator_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'new_request'
  | 'request_accepted'
  | 'campaign_starting'
  | 'payment_received'
  | 'application_approved'
  | 'application_rejected'
  | 'system';

// ============================================
// Constants
// ============================================

export const PLATFORM_OPTIONS: PlatformType[] = [
  'Twitch',
  'Kick',
  'YouTube',
  'TikTok',
  'Instagram',
  'Facebook',
  'Trovo',
  'Other'
];

export const FREQUENCY_OPTIONS: StreamingFrequency[] = [
  'Daily',
  'Several times a week',
  'Weekly',
  'A few times a month',
  'Monthly or less'
];

export const DURATION_OPTIONS: StreamDuration[] = [
  'Under 30 minutes',
  '30 to 45 minutes',
  '45 minutes to 1 hour',
  '1 to 2 hours',
  'Over 2 hours'
];

export const TIME_OF_DAY_OPTIONS: TimeOfDay[] = [
  'Morning (6am–12pm)',
  'Afternoon (12pm–5pm)',
  'Evening (5pm–9pm)',
  'Late Night (9pm–12am)',
  'Varies'
];

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'Gaming',
  'Beauty & Makeup',
  'Fashion',
  'Fitness & Health',
  'Food & Cooking',
  'Music',
  'Comedy',
  'Education',
  'Business & Finance',
  'Lifestyle',
  'Sports',
  'Tech',
  'Travel',
  'Other'
];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================
// Type Guards
// ============================================

export function isPlatformType(value: any): value is PlatformType {
  return PLATFORM_OPTIONS.includes(value);
}

export function isContentCategory(value: any): value is ContentCategory {
  return CONTENT_CATEGORIES.includes(value);
}

export function isCreatorStatus(value: any): value is CreatorStatus {
  return ['pending', 'under_review', 'approved', 'rejected', 'suspended'].includes(value);
}

// ============================================
// Helper Functions
// ============================================

export function getCreatorStatusColor(status: CreatorStatus): string {
  switch (status) {
    case 'approved':
      return 'text-[#389C9A]';
    case 'pending':
    case 'under_review':
      return 'text-[#FEDB71]';
    case 'rejected':
    case 'suspended':
      return 'text-red-500';
    default:
      return 'text-[#1D1D1D]/40';
  }
}

export function getCreatorStatusLabel(status: CreatorStatus): string {
  switch (status) {
    case 'approved':
      return 'Active';
    case 'pending':
      return 'Pending Review';
    case 'under_review':
      return 'Under Review';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('NGN', '₦');
}

export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function isOver18(dob: string): boolean {
  return calculateAge(dob) >= 18;
}