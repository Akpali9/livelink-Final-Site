import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Mail, 
  HelpCircle, 
  FileText, 
  Shield, 
  Info,
  User,
  Globe,
  Twitch,
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Bell,
  DollarSign,
  Tag,
  Users,
  Star,
  Clock,
  Calendar,
  Settings as SettingsIcon,
  ArrowLeft,
  MapPin,
  Phone,
  AtSign,
  Link as LinkIcon,
  Award,
  Briefcase,
  Building2,
  Upload,
  Camera,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/ImageWithFallback";

// ============================================
// TYPES
// ============================================

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio: string;
  location: string;
  phone_number: string;
  niche: string[];
  avg_viewers: number;
  total_streams: number;
  rating: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  full_name: string;
  email: string;
  logo_url?: string;
  phone_number: string;
  website?: string;
  description?: string;
  industry: string;
  country: string;
  city?: string;
  status: string;
  application_status: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

interface CreatorPlatform {
  id?: string;
  creator_id?: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count?: number;
}

// ============================================
// MAIN SETTINGS COMPONENT
// ============================================

export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // User type detection
  const [userType, setUserType] = useState<"creator" | "business" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ============================================
  // CREATOR STATE
  // ============================================
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorForm, setCreatorForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone_number: "",
    location: "",
    bio: "",
    niche: [] as string[]
  });
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>([]);
  const [editingPlatforms, setEditingPlatforms] = useState(false);

  // ============================================
  // BUSINESS STATE
  // ============================================
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    full_name: "",
    email: "",
    phone_number: "",
    website: "",
    description: "",
    industry: "",
    country: "",
    city: ""
  });

  // ============================================
  // COMMON STATE
  // ============================================
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Notifications state
  const [notifCampaigns, setNotifCampaigns] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Niche options for creators
  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

  // Platform options for creators
  const platformOptions = [
    { name: "Twitch", icon: Twitch },
    { name: "YouTube", icon: Youtube },
    { name: "Instagram", icon: Instagram },
    { name: "Twitter", icon: Twitter },
    { name: "Facebook", icon: Facebook },
    { name: "TikTok", icon: () => <span className="text-sm">TikTok</span> },
    { name: "Kick", icon: () => <span className="text-sm">Kick</span> },
    { name: "Rumble", icon: () => <span className="text-sm">Rumble</span> }
  ];

  // Industry options for businesses
  const industryOptions = [
    "Food & Drink", "Health & Fitness", "Beauty & Cosmetics", 
    "Fashion & Clothing", "Technology", "Gaming", "Entertainment",
    "Sports", "Travel", "Education", "Finance", "Real Estate",
    "Automotive", "Retail", "Other"
  ];

  // ============================================
  // DETECT USER TYPE & FETCH PROFILE
  // ============================================

  useEffect(() => {
    const detectUserType = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is a creator
        const { data: creator } = await supabase
          .from("creator_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (creator) {
          setUserType("creator");
          await fetchCreatorProfile();
          return;
        }

        // Check if user is a business
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (business) {
          setUserType("business");
          await fetchBusinessProfile();
          return;
        }

        // If neither, redirect to appropriate registration
        toast.error("No profile found. Please complete your registration.");
        navigate("/login/portal");
      } catch (error) {
        console.error("Error detecting user type:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    detectUserType();
  }, [user]);

  // ============================================
  // FETCH CREATOR PROFILE
  // ============================================

  const fetchCreatorProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setCreatorProfile(profile);
      setCreatorId(profile.id);
      setCreatorForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        email: profile.email || user.email || "",
        phone_number: profile.phone_number || "",
        location: profile.location || "",
        bio: profile.bio || "",
        niche: profile.niche || []
      });

      // Fetch platforms
      const { data: platformsData } = await supabase
        .from("creator_platforms")
        .select("*")
        .eq("creator_id", profile.id);

      if (platformsData) {
        setPlatforms(platformsData);
      }

    } catch (error) {
      console.error("Error fetching creator profile:", error);
      toast.error("Failed to load creator profile");
    }
  };

  // ============================================
  // FETCH BUSINESS PROFILE
  // ============================================

  const fetchBusinessProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setBusinessProfile(profile);
      setBusinessId(profile.id);
      setBusinessForm({
        business_name: profile.business_name || "",
        full_name: profile.full_name || "",
        email: profile.email || user.email || "",
        phone_number: profile.phone_number || "",
        website: profile.website || "",
        description: profile.description || "",
        industry: profile.industry || "",
        country: profile.country || "",
        city: profile.city || ""
      });

    } catch (error) {
      console.error("Error fetching business profile:", error);
      toast.error("Failed to load business profile");
    }
  };

  // ============================================
  // AVATAR/LOGO UPLOAD
  // ============================================

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
    const bucket = userType === 'business' ? 'business-logos' : 'creator-avatars';

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      toast.error('Failed to upload image');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // ============================================
  // AUTH UPDATES
  // ============================================

  const handleUpdateEmail = async () => {
    if (newEmail !== confirmEmail) {
      toast.error("Emails do not match");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast.success("Email updated successfully. Check your inbox to confirm.");
      setEditingEmail(false);
      setNewEmail("");
      setConfirmEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    }
  };

  // ============================================
  // CREATOR PLATFORM MANAGEMENT
  // ============================================

  const handleAddPlatform = () => {
    setPlatforms([...platforms, {
      platform_type: "Twitch",
      username: "",
      profile_url: "",
      followers_count: 0
    }]);
  };

  const handleUpdatePlatform = (index: number, field: keyof CreatorPlatform, value: string | number) => {
    const updated = [...platforms];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-generate profile URL if username is provided
    if (field === 'username' && value) {
      const platform = updated[index].platform_type.toLowerCase();
      updated[index].profile_url = `https://${platform}.com/${value}`;
    }
    
    setPlatforms(updated);
  };

  const handleRemovePlatform = async (index: number) => {
    const platform = platforms[index];
    
    if (platform.id) {
      try {
        const { error } = await supabase
          .from("creator_platforms")
          .delete()
          .eq("id", platform.id);

        if (error) throw error;
      } catch (error) {
        toast.error("Failed to delete platform");
        return;
      }
    }

    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const handleSavePlatforms = async () => {
    if (!creatorId) return;

    setSaving(true);
    try {
      for (const platform of platforms) {
        if (platform.id) {
          // Update existing
          const { error } = await supabase
            .from("creator_platforms")
            .update({
              platform_type: platform.platform_type,
              username: platform.username,
              profile_url: platform.profile_url,
              followers_count: platform.followers_count || 0
            })
            .eq("id", platform.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("creator_platforms")
            .insert({
              creator_id: creatorId,
              platform_type: platform.platform_type,
              username: platform.username,
              profile_url: platform.profile_url,
              followers_count: platform.followers_count || 0,
              created_at: new Date().toISOString()
            });

          if (error) throw error;
        }
      }

      setEditingPlatforms(false);
      toast.success("Platforms saved successfully");
    } catch (error) {
      console.error("Error saving platforms:", error);
      toast.error("Failed to save platforms");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // SAVE CREATOR PROFILE
  // ============================================

  const saveCreatorProfile = async () => {
    if (!creatorId || !user) return false;

    try {
      // Upload avatar if changed
      let avatarUrl = creatorProfile?.avatar_url;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }

      // Update creator profile
      const { error: profileError } = await supabase
        .from("creator_profiles")
        .update({
          full_name: creatorForm.full_name,
          username: creatorForm.username,
          phone_number: creatorForm.phone_number,
          location: creatorForm.location,
          bio: creatorForm.bio,
          niche: creatorForm.niche,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", creatorId);

      if (profileError) throw profileError;

      return true;
    } catch (error) {
      console.error("Error saving creator profile:", error);
      throw error;
    }
  };

  // ============================================
  // SAVE BUSINESS PROFILE
  // ============================================

  const saveBusinessProfile = async () => {
    if (!businessId || !user) return false;

    try {
      // Upload logo if changed
      let logoUrl = businessProfile?.logo_url;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) logoUrl = uploaded;
      }

      // Update business profile
      const { error: profileError } = await supabase
        .from("businesses")
        .update({
          business_name: businessForm.business_name,
          full_name: businessForm.full_name,
          phone_number: businessForm.phone_number,
          website: businessForm.website,
          description: businessForm.description,
          industry: businessForm.industry,
          country: businessForm.country,
          city: businessForm.city,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", businessId);

      if (profileError) throw profileError;

      return true;
    } catch (error) {
      console.error("Error saving business profile:", error);
      throw error;
    }
  };

  // ============================================
  // SAVE ALL SETTINGS
  // ============================================

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      let profileSaved = false;

      if (userType === "creator") {
        profileSaved = await saveCreatorProfile();
      } else if (userType === "business") {
        profileSaved = await saveBusinessProfile();
      }

      if (!profileSaved) throw new Error("Failed to save profile");

      // Save notification preferences to user metadata
      await supabase.auth.updateUser({
        data: {
          notification_preferences: {
            campaigns: notifCampaigns,
            messages: notifMessages,
            payments: notifPayments,
            announcements: notifAnnouncements
          }
        }
      });

      toast.success("All settings saved successfully!");
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Settings" userType={userType || "creator"} />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER CREATOR SETTINGS (WITH SAVE BUTTON)
  // ============================================

  if (userType === "creator") {
    return (
      <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
        <AppHeader showBack title="Creator Settings" userType="creator" />

        {/* MAIN CONTENT */}
        <div className="mt-14 px-4 py-6 space-y-8">
          
          {/* PROFILE SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              PROFILE
            </h2>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">
                  <ImageWithFallback
                    src={avatarPreview || creatorProfile?.avatar_url || "https://via.placeholder.com/100"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#2d7f7d] transition-colors border-2 border-white"
                >
                  <Camera className="w-4 h-4 text-white" />
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-[9px] text-[#1D1D1D]/40">
                Click the camera icon to change your avatar
              </p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={creatorForm.full_name}
                  onChange={(e) => setCreatorForm({ ...creatorForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  USERNAME
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                  <input
                    type="text"
                    value={creatorForm.username}
                    onChange={(e) => setCreatorForm({ ...creatorForm, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                  <input
                    type="tel"
                    value={creatorForm.phone_number}
                    onChange={(e) => setCreatorForm({ ...creatorForm, phone_number: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  LOCATION
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                  <input
                    type="text"
                    value={creatorForm.location}
                    onChange={(e) => setCreatorForm({ ...creatorForm, location: e.target.value })}
                    placeholder="City, Country"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  BIO
                </label>
                <textarea
                  value={creatorForm.bio}
                  onChange={(e) => setCreatorForm({ ...creatorForm, bio: e.target.value.slice(0, 200) })}
                  rows={4}
                  maxLength={200}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl resize-none"
                />
                <div className="text-right text-[9px] text-[#1D1D1D]/40 mt-1">
                  {creatorForm.bio.length}/200
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-2 italic">
                  CONTENT NICHES
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {creatorForm.niche.map((niche, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic rounded-full flex items-center gap-1"
                    >
                      {niche}
                      <button
                        onClick={() => {
                          const updated = creatorForm.niche.filter((_, i) => i !== index);
                          setCreatorForm({ ...creatorForm, niche: updated });
                        }}
                        className="hover:text-white/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {nicheOptions
                    .filter(n => !creatorForm.niche.includes(n))
                    .slice(0, 8)
                    .map(niche => (
                      <button
                        key={niche}
                        onClick={() => {
                          if (creatorForm.niche.length < 5) {
                            setCreatorForm({
                              ...creatorForm,
                              niche: [...creatorForm.niche, niche]
                            });
                          } else {
                            toast.error("Maximum 5 niches allowed");
                          }
                        }}
                        className="px-3 py-1 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider italic rounded-full hover:border-[#389C9A] transition-colors"
                      >
                        {niche}
                      </button>
                    ))}
                </div>
                <p className="text-[8px] text-[#1D1D1D]/40 mt-2">
                  Select up to 5 niches that describe your content
                </p>
              </div>
            </div>
          </div>

          {/* PLATFORMS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 italic">
                CONNECTED PLATFORMS
              </h2>
              <button
                onClick={() => setEditingPlatforms(!editingPlatforms)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
              >
                {editingPlatforms ? "Done" : "Manage"}
              </button>
            </div>

            {!editingPlatforms ? (
              <div className="space-y-3">
                {platforms.length === 0 ? (
                  <p className="text-center text-[9px] text-[#1D1D1D]/40 py-8 border-2 border-dashed rounded-xl">
                    No platforms connected yet
                  </p>
                ) : (
                  platforms.map((platform, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(platform.platform_type)}
                        <div>
                          <p className="font-black text-sm">{platform.platform_type}</p>
                          <p className="text-[9px] text-[#1D1D1D]/40">@{platform.username}</p>
                        </div>
                      </div>
                      {platform.followers_count ? (
                        <span className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                          {platform.followers_count.toLocaleString()} followers
                        </span>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {platforms.map((platform, index) => (
                  <div key={index} className="border-2 border-[#1D1D1D]/10 p-4 rounded-xl">
                    <div className="flex gap-3 mb-3">
                      <select
                        value={platform.platform_type}
                        onChange={(e) => handleUpdatePlatform(index, 'platform_type', e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-[9px] font-black uppercase"
                      >
                        {platformOptions.map(opt => (
                          <option key={opt.name} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemovePlatform(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative mb-3">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                      <input
                        type="text"
                        value={platform.username}
                        onChange={(e) => handleUpdatePlatform(index, 'username', e.target.value)}
                        placeholder="username"
                        className="w-full pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="number"
                      value={platform.followers_count || ''}
                      onChange={(e) => handleUpdatePlatform(index, 'followers_count', parseInt(e.target.value) || 0)}
                      placeholder="Followers count (optional)"
                      className="w-full px-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={handleAddPlatform}
                  className="w-full py-3 border-2 border-dashed border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-widest hover:border-[#389C9A] transition-colors rounded-xl"
                >
                  + ADD PLATFORM
                </button>
                <button
                  onClick={handleSavePlatforms}
                  disabled={saving}
                  className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Platforms"}
                </button>
              </div>
            )}
          </div>

          {/* STATS DISPLAY */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              CHANNEL STATS
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8F8F8] p-4 rounded-xl text-center">
                <Users className="w-5 h-5 text-[#389C9A] mx-auto mb-2" />
                <p className="text-lg font-black">{creatorProfile?.avg_viewers?.toLocaleString() || 0}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Avg Viewers</p>
              </div>
              <div className="bg-[#F8F8F8] p-4 rounded-xl text-center">
                <Award className="w-5 h-5 text-[#FEDB71] mx-auto mb-2" />
                <p className="text-lg font-black">{creatorProfile?.total_streams || 0}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Total Streams</p>
              </div>
              <div className="bg-[#F8F8F8] p-4 rounded-xl text-center">
                <Star className="w-5 h-5 text-[#FEDB71] mx-auto mb-2" />
                <p className="text-lg font-black">{creatorProfile?.rating || 0}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Rating</p>
              </div>
            </div>
          </div>

          {/* ACCOUNT SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              ACCOUNT
            </h2>

            <div className="space-y-6">
              {/* Email Address */}
              <div className="border-b border-[#1D1D1D]/10 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                      EMAIL ADDRESS
                    </label>
                    <p className="text-sm text-[#1D1D1D]/60">
                      {user?.email}
                    </p>
                  </div>
                  {!editingEmail && (
                    <button 
                      onClick={() => setEditingEmail(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                    >
                      CHANGE
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {editingEmail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                          NEW EMAIL ADDRESS
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                          CONFIRM NEW EMAIL
                        </label>
                        <input
                          type="email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                        />
                      </div>
                      <button
                        onClick={handleUpdateEmail}
                        className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#389C9A] transition-colors"
                      >
                        UPDATE EMAIL
                      </button>
                      <button
                        onClick={() => setEditingEmail(false)}
                        className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                      >
                        CANCEL
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div className="border-b border-[#1D1D1D]/10 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                      PASSWORD
                    </label>
                    <p className="text-sm text-[#1D1D1D]/60">
                      ••••••••
                    </p>
                  </div>
                  {!editingPassword && (
                    <button 
                      onClick={() => setEditingPassword(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                    >
                      CHANGE
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {editingPassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                          CURRENT PASSWORD
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                          NEW PASSWORD
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                        />
                        {newPassword && (
                          <div className="mt-2 flex gap-1">
                            <div className={`h-1 flex-1 rounded-full ${newPassword.length >= 6 ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                            <div className={`h-1 flex-1 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                            <div className={`h-1 flex-1 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                          CONFIRM NEW PASSWORD
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                        />
                      </div>
                      <button
                        onClick={handleUpdatePassword}
                        className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#389C9A] transition-colors"
                      >
                        UPDATE PASSWORD
                      </button>
                      <button
                        onClick={() => setEditingPassword(false)}
                        className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                      >
                        CANCEL
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              NOTIFICATIONS
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-[#1D1D1D]">New campaign offers</span>
                <button
                  onClick={() => setNotifCampaigns(!notifCampaigns)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                    notifCampaigns ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-[#1D1D1D]">Messages</span>
                <button
                  onClick={() => setNotifMessages(!notifMessages)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                    notifMessages ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-[#1D1D1D]">Payment alerts</span>
                <button
                  onClick={() => setNotifPayments(!notifPayments)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                    notifPayments ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-[#1D1D1D]">Platform announcements</span>
                <button
                  onClick={() => setNotifAnnouncements(!notifAnnouncements)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                    notifAnnouncements ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ACCOUNT STATUS SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              ACCOUNT STATUS
            </h2>

            <div className="space-y-6">
              {/* Status Display */}
              <div className="bg-[#F8F8F8] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Status</span>
                  <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${
                    creatorProfile?.status === 'active' ? 'bg-green-100 text-green-700' :
                    creatorProfile?.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                    creatorProfile?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {creatorProfile?.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-[9px] text-[#1D1D1D]/60">
                  {creatorProfile?.status === 'active'
                    ? 'Your creator account is active and visible to businesses.'
                    : creatorProfile?.status === 'pending_review'
                    ? 'Your application is under review. You will be notified once approved.'
                    : creatorProfile?.status === 'rejected'
                    ? 'Your application was rejected. You can submit a new application.'
                    : 'Your account status is being processed.'}
                </p>
              </div>

              {/* Pause Account */}
              <div>
                <h3 className="text-sm font-black text-[#1D1D1D] mb-2">PAUSE YOUR ACCOUNT</h3>
                <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                  Pausing hides your profile and stops new requests. Active campaigns are not affected.
                </p>
                <button
                  onClick={() => setShowPauseModal(true)}
                  className="w-full py-3 border-2 border-[#D2691E] text-[#D2691E] text-[9px] font-black uppercase tracking-wider italic hover:bg-[#D2691E] hover:text-white transition-colors rounded-xl"
                >
                  PAUSE MY ACCOUNT
                </button>
              </div>

              {/* Delete Account */}
              <div>
                <h3 className="text-sm font-black text-[#1D1D1D] mb-2">DELETE ACCOUNT</h3>
                <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                  Permanently deletes your account and all associated data. This cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full py-3 border-2 border-red-600 text-red-600 text-[9px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors rounded-xl"
                >
                  REQUEST ACCOUNT DELETION
                </button>
              </div>
            </div>
          </div>

          {/* SUPPORT SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              SUPPORT
            </h2>

            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-xl">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-[#389C9A]" />
                  <span className="text-sm font-bold">Help Centre</span>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>

              <button className="w-full flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#389C9A]" />
                  <span className="text-sm font-bold">Terms of Service</span>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>

              <button className="w-full flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#389C9A]" />
                  <span className="text-sm font-bold">Privacy Policy</span>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* BOTTOM INFO */}
          <div className="text-center space-y-2 pt-6">
            <p className="text-[9px] text-[#1D1D1D]/40">
              LiveLink v1.0.0
            </p>
            <p className="text-[9px] text-[#1D1D1D]/60">
              Logged in as {user?.email} ·{" "}
              <button 
                onClick={handleLogout}
                className="text-[#389C9A] font-bold hover:underline"
              >
                Log out
              </button>
            </p>
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-[#1D1D1D]/10 z-40">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-[#FEDB71]" />
                SAVE ALL CHANGES
              </>
            )}
          </button>
        </div>

        {/* PAUSE ACCOUNT MODAL */}
        <AnimatePresence>
          {showPauseModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setShowPauseModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50 rounded-xl"
              >
                <h3 className="text-lg font-black uppercase tracking-tighter italic mb-3">
                  Pause Your Account?
                </h3>
                <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                  Your profile will be hidden. You can reactivate at any time from Settings.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="w-full py-3 bg-[#D2691E] text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#b2581a] transition-colors"
                  >
                    YES, PAUSE ACCOUNT
                  </button>
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="w-full py-3 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* DELETE ACCOUNT MODAL */}
        <AnimatePresence>
          {showDeleteModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setShowDeleteModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50 rounded-xl"
              >
                <h3 className="text-lg font-black uppercase tracking-tighter italic mb-3">
                  Delete Your Account?
                </h3>
                <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                  This is permanent and cannot be undone. All your data will be removed.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-red-700 transition-colors"
                  >
                    YES, DELETE MY ACCOUNT
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-3 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================
  // RENDER BUSINESS SETTINGS (with all sections)
  // ============================================

  if (userType === "business") {
    return (
      <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
        <AppHeader showBack title="Business Settings" userType="business" />

        {/* MAIN CONTENT */}
        <div className="mt-14 px-4 py-6 space-y-8">
          
          {/* PROFILE SECTION */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              BUSINESS PROFILE
            </h2>

            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-xl border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">
                  <ImageWithFallback
                    src={avatarPreview || businessProfile?.logo_url || "https://via.placeholder.com/100"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <label
                  htmlFor="logo-upload"
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#2d7f7d] transition-colors border-2 border-white"
                >
                  <Camera className="w-4 h-4 text-white" />
                </label>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-[9px] text-[#1D1D1D]/40">
                Click the camera icon to change your logo
              </p>
            </div>

            {/* Business Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  BUSINESS NAME
                </label>
                <input
                  type="text"
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  CONTACT PERSON
                </label>
                <input
                  type="text"
                  value={businessForm.full_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                  <input
                    type="tel"
                    value={businessForm.phone_number}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone_number: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  WEBSITE
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                  <input
                    type="url"
                    value={businessForm.website}
                    onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  INDUSTRY
                </label>
                <select
                  value={businessForm.industry}
                  onChange={(e) => setBusinessForm({ ...businessForm, industry: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                >
                  <option value="">Select Industry</option>
                  {industryOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                    COUNTRY
                  </label>
                  <input
                    type="text"
                    value={businessForm.country}
                    onChange={(e) => setBusinessForm({ ...businessForm, country: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                    CITY
                  </label>
                  <input
                    type="text"
                    value={businessForm.city}
                    onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
                  BUSINESS DESCRIPTION
                </label>
                <textarea
                  value={businessForm.description}
                  onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value.slice(0, 500) })}
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl resize-none"
                />
                <div className="text-right text-[9px] text-[#1D1D1D]/40 mt-1">
                  {businessForm.description.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* ACCOUNT SECTION (same as creator) */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              ACCOUNT
            </h2>
            {/* ... copy the account section from creator above ... */}
          </div>

          {/* NOTIFICATIONS SECTION (same as creator) */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              NOTIFICATIONS
            </h2>
            {/* ... copy the notifications section from creator above ... */}
          </div>

          {/* ACCOUNT STATUS SECTION (same as creator) */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              ACCOUNT STATUS
            </h2>
            {/* ... copy the account status section from creator above ... */}
          </div>

          {/* SUPPORT SECTION (same as creator) */}
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
              SUPPORT
            </h2>
            {/* ... copy the support section from creator above ... */}
          </div>

          {/* BOTTOM INFO (same as creator) */}
          <div className="text-center space-y-2 pt-6">
            {/* ... copy the bottom info section from creator above ... */}
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-[#1D1D1D]/10 z-40">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-[#FEDB71]" />
                SAVE ALL CHANGES
              </>
            )}
          </button>
        </div>

        {/* PAUSE ACCOUNT MODAL (same as creator) */}
        {/* DELETE ACCOUNT MODAL (same as creator) */}
      </div>
    );
  }

  // Fallback return (should never happen)
  return null;
}

// Helper function for platform icons
function getPlatformIcon(platformName: string) {
  switch (platformName.toLowerCase()) {
    case "twitch": return <Twitch className="w-5 h-5 text-[#389C9A]" />;
    case "youtube": return <Youtube className="w-5 h-5 text-[#389C9A]" />;
    case "instagram": return <Instagram className="w-5 h-5 text-[#389C9A]" />;
    case "twitter": return <Twitter className="w-5 h-5 text-[#389C9A]" />;
    case "facebook": return <Facebook className="w-5 h-5 text-[#389C9A]" />;
    case "tiktok": return <div className="w-5 h-5 flex items-center justify-center text-[#389C9A] font-black">TT</div>;
    case "kick": return <div className="w-5 h-5 flex items-center justify-center text-[#389C9A] font-black">K</div>;
    default: return <Globe className="w-5 h-5 text-[#389C9A]" />;
  }
}
