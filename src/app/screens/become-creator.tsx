import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Instagram, 
  Twitter, 
  Youtube, 
  Video,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Zap,
  Users,
  Eye,
  Award,
  Plus,
  X
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../lib/contexts/AuthContext";

// Steps for the become creator flow
const STEPS = [
  "Basic Info",
  "Platforms & Niches", 
  "Social Links",
  "Review"
];

// Available platforms
const PLATFORMS = [
  "Twitch", "YouTube", "TikTok", "Instagram", "Twitter", "Facebook", "Kick", "Rumble"
];

// Available niches
const NICHES = [
  "Gaming", "Beauty", "Fashion", "Fitness", "Tech", "Comedy", 
  "Music", "Education", "Travel", "Food", "Sports", "Business"
];

export function BecomeCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    fullName: "",
    username: "",
    email: user?.email || "",
    phone: "",
    location: "",
    bio: "",
    
    // Platforms & Niches
    platforms: [] as string[],
    niches: [] as string[],
    
    // Stats
    followers: "",
    avgViewers: "",
    
    // Social Links
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    website: "",
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const toggleNiche = (niche: string) => {
    setFormData(prev => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...prev.niches, niche]
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
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

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `creator-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate("/login/portal");
      return;
    }

    // Validate required fields
    if (!formData.fullName || !formData.username) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Upload avatar if selected
      const avatarUrl = await uploadAvatar();

      // Prepare creator data for creator_profiles table
      const creatorProfileData = {
        user_id: user.id,
        full_name: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone || null,
        location: formData.location || null,
        bio: formData.bio || null,
        avatar_url: avatarUrl,
        platforms: formData.platforms,
        niches: formData.niches,
        social_links: {
          instagram: formData.instagram || null,
          twitter: formData.twitter || null,
          youtube: formData.youtube || null,
          tiktok: formData.tiktok || null,
          website: formData.website || null
        },
        stats: {
          followers: formData.followers ? parseInt(formData.followers) : 0,
          avgViewers: formData.avgViewers ? parseInt(formData.avgViewers) : 0
        },
        verified: false,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into creator_profiles (main table)
      const { error: profileError } = await supabase
        .from("creator_profiles")
        .insert(creatorProfileData);

      if (profileError) throw profileError;

      // Also insert into legacy creators table for backward compatibility
      const legacyCreatorData = {
        user_id: user.id,
        name: formData.fullName,
        username: formData.username,
        email: formData.email,
        avatar: avatarUrl,
        bio: formData.bio,
        location: formData.location,
        platforms: formData.platforms,
        niches: formData.niches,
        followers: formData.followers ? parseInt(formData.followers) : 0,
        avg_viewers: formData.avgViewers ? parseInt(formData.avgViewers) : 0,
        verified: false,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error: legacyError } = await supabase
        .from("creators")
        .insert(legacyCreatorData);

      if (legacyError) {
        console.error("Error inserting into legacy creators table:", legacyError);
        // Don't throw - this is just a fallback
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { 
          user_type: 'creator',
          full_name: formData.fullName,
          avatar_url: avatarUrl
        }
      });

      toast.success("Application submitted successfully!");
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error: any) {
      console.error("Error creating creator profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && !formData.fullName) {
      toast.error("Please enter your full name");
      return;
    }
    if (currentStep === 0 && !formData.username) {
      toast.error("Please choose a username");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader 
        showBack 
        showLogo 
        title="Become a Creator"
        subtitle="Join LiveLink"
      />

      <main className="max-w-[480px] mx-auto w-full px-6">

        {/* Progress Bar */}
        <div className="mt-6 mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                  index <= currentStep
                    ? "border-[#389C9A] bg-[#389C9A] text-white"
                    : "border-[#1D1D1D]/20 text-[#1D1D1D]/20"
                }`}>
                  {index < currentStep ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-[8px] font-black uppercase mt-1 ${
                  index <= currentStep ? "text-[#389C9A]" : "text-[#1D1D1D]/20"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-[#1D1D1D]/10 rounded-full mt-2">
            <div 
              className="h-1 bg-[#389C9A] rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-black uppercase tracking-tighter italic mb-6">Basic Information</h2>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#1D1D1D] transition-colors"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Profile Photo</p>
                <p className="text-[8px] opacity-40 mt-1">Recommended: Square, at least 400x400px</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateForm("fullName", e.target.value)}
                placeholder="John Doe"
                className="w-full bg-white border-2 border-[#1D1D1D] px-4 py-3 text-sm focus:outline-none focus:border-[#389C9A] transition-colors"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <span className="px-3 text-[#1D1D1D]/40 text-sm">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => updateForm("username", e.target.value.replace(/\s/g, ''))}
                  placeholder="username"
                  className="flex-1 py-3 pr-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Email</label>
              <div className="flex items-center border-2 border-[#1D1D1D] bg-[#F8F8F8]">
                <Mail className="w-4 h-4 ml-3 text-[#1D1D1D]/40" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="flex-1 py-3 px-3 bg-transparent text-sm opacity-60"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Phone (Optional)</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Phone className="w-4 h-4 ml-3 text-[#1D1D1D]/40" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="+234 123 456 7890"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Location (Optional)</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <MapPin className="w-4 h-4 ml-3 text-[#1D1D1D]/40" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  placeholder="City, Country"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Bio (Optional)</label>
              <textarea
                value={formData.bio}
                onChange={(e) => updateForm("bio", e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full bg-white border-2 border-[#1D1D1D] px-4 py-3 text-sm focus:outline-none focus:border-[#389C9A] transition-colors resize-none"
              />
            </div>
          </motion.div>
        )}

        {/* Step 2: Platforms & Niches */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-black uppercase tracking-tighter italic mb-6">Platforms & Niches</h2>

            {/* Platforms */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-3">
                Platforms You Use
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border-2 transition-colors ${
                      formData.platforms.includes(platform)
                        ? "bg-[#389C9A] border-[#389C9A] text-white"
                        : "border-[#1D1D1D]/20 hover:border-[#389C9A]"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Niches */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-3">
                Content Niches
              </label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(niche => (
                  <button
                    key={niche}
                    onClick={() => toggleNiche(niche)}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border-2 transition-colors ${
                      formData.niches.includes(niche)
                        ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]"
                        : "border-[#1D1D1D]/20 hover:border-[#FEDB71]"
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="pt-4">
              <label className="text-[9px] font-black uppercase tracking-widest block mb-3">
                Channel Stats (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                    <Users className="w-4 h-4 ml-3 text-[#1D1D1D]/40" />
                    <input
                      type="number"
                      value={formData.followers}
                      onChange={(e) => updateForm("followers", e.target.value)}
                      placeholder="Followers"
                      className="flex-1 py-3 px-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                    <Eye className="w-4 h-4 ml-3 text-[#1D1D1D]/40" />
                    <input
                      type="number"
                      value={formData.avgViewers}
                      onChange={(e) => updateForm("avgViewers", e.target.value)}
                      placeholder="Avg Viewers"
                      className="flex-1 py-3 px-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Social Links */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-black uppercase tracking-tighter italic mb-6">Social Links</h2>

            {/* Instagram */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Instagram</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Instagram className="w-4 h-4 ml-3 text-pink-500" />
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => updateForm("instagram", e.target.value)}
                  placeholder="@username"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Twitter */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Twitter/X</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Twitter className="w-4 h-4 ml-3 text-blue-400" />
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => updateForm("twitter", e.target.value)}
                  placeholder="@username"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* YouTube */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">YouTube</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Youtube className="w-4 h-4 ml-3 text-red-500" />
                <input
                  type="text"
                  value={formData.youtube}
                  onChange={(e) => updateForm("youtube", e.target.value)}
                  placeholder="@channel or URL"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* TikTok */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">TikTok</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Video className="w-4 h-4 ml-3 text-[#1D1D1D]" />
                <input
                  type="text"
                  value={formData.tiktok}
                  onChange={(e) => updateForm("tiktok", e.target.value)}
                  placeholder="@username"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest block mb-2">Website</label>
              <div className="flex items-center border-2 border-[#1D1D1D] focus-within:border-[#389C9A] transition-colors">
                <Globe className="w-4 h-4 ml-3 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://"
                  className="flex-1 py-3 px-3 text-sm focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-black uppercase tracking-tighter italic mb-6">Review Application</h2>

            <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-5 space-y-4">
              {/* Profile Summary */}
              <div className="flex items-center gap-4 pb-4 border-b border-[#1D1D1D]/10">
                <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden bg-white">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 opacity-20" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-black uppercase italic">{formData.fullName}</p>
                  <p className="text-[10px] opacity-40">@{formData.username}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div>
                  <p className="opacity-40 mb-1">Location</p>
                  <p className="font-bold">{formData.location || "Not specified"}</p>
                </div>
                <div>
                  <p className="opacity-40 mb-1">Phone</p>
                  <p className="font-bold">{formData.phone || "Not specified"}</p>
                </div>
              </div>

              {/* Platforms */}
              {formData.platforms.length > 0 && (
                <div>
                  <p className="text-[9px] opacity-40 mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.platforms.map(p => (
                      <span key={p} className="px-2 py-1 bg-[#389C9A] text-white text-[8px] font-black uppercase">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Niches */}
              {formData.niches.length > 0 && (
                <div>
                  <p className="text-[9px] opacity-40 mb-2">Niches</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.niches.map(n => (
                      <span key={n} className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              {(formData.followers || formData.avgViewers) && (
                <div className="grid grid-cols-2 gap-3">
                  {formData.followers && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[10px] font-bold">{parseInt(formData.followers).toLocaleString()} followers</span>
                    </div>
                  )}
                  {formData.avgViewers && (
                    <div className="flex items-center gap-2">
                      <Eye className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[10px] font-bold">{parseInt(formData.avgViewers).toLocaleString()} avg viewers</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[9px] text-[#1D1D1D]/40 italic">
              By submitting this application, you agree to our Terms of Service and confirm that the information provided is accurate.
            </p>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest italic hover:bg-[#F8F8F8] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          <button
            onClick={isLastStep ? handleSubmit : nextStep}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest italic transition-colors ${
              isLastStep
                ? "bg-[#389C9A] text-white hover:bg-[#1D1D1D]"
                : "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isLastStep ? "Submit Application" : "Continue"}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}
