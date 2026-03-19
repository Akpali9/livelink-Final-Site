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
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";

interface CreatorPlatform {
  id?: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count?: number;
}

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

export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Account section state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");

  // Profile section state
  const [editingBio, setEditingBio] = useState(false);
  const [editingNiche, setEditingNiche] = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState(false);
  const [bio, setBio] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>([]);

  // Creator profile data
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Notifications state
  const [notifCampaigns, setNotifCampaigns] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

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

  // Fetch creator profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch creator profile
        const { data: profile, error } = await supabase
          .from("creator_profiles")
          .select(`
            id,
            user_id,
            full_name,
            username,
            email,
            avatar_url,
            bio,
            location,
            phone_number,
            niche,
            avg_viewers,
            total_streams,
            rating,
            status,
            created_at,
            updated_at
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        }

        if (profile) {
          setCreatorProfile(profile);
          setCreatorId(profile.id);
          setEmail(profile.email || user.email || "");
          setPhoneNumber(profile.phone_number || "");
          setLocation(profile.location || "");
          setBio(profile.bio || "Content creator passionate about engaging with audiences through live streams.");
          setSelectedNiches(profile.niche || ["Gaming"]);
          
          // Fetch platforms separately
          const { data: platformsData } = await supabase
            .from("creator_platforms")
            .select("*")
            .eq("creator_id", profile.id);

          if (platformsData) {
            setPlatforms(platformsData);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const truncateBio = (text: string, lines: number = 2) => {
    const words = text.split(" ");
    if (words.length <= 15) return text;
    return bioExpanded ? text : words.slice(0, 15).join(" ") + "...";
  };

  const handleUpdateEmail = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setEmail(newEmail);
      setEditingEmail(false);
      setNewEmail("");
      setConfirmEmail("");
      setCurrentPasswordEmail("");
      toast.success("Email updated successfully. Check your inbox to confirm.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
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

      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    }
  };

  const handleSaveBio = async () => {
    if (!creatorId) return;

    try {
      const { error } = await supabase
        .from("creator_profiles")
        .update({ 
          bio: bioInput,
          updated_at: new Date().toISOString()
        })
        .eq("id", creatorId);

      if (error) throw error;

      setBio(bioInput);
      setEditingBio(false);
      toast.success("Bio updated successfully");
    } catch (error) {
      toast.error("Failed to update bio");
    }
  };

  const handleSaveNiche = async () => {
    if (!creatorId) return;

    try {
      const { error } = await supabase
        .from("creator_profiles")
        .update({ 
          niche: selectedNiches,
          updated_at: new Date().toISOString()
        })
        .eq("id", creatorId);

      if (error) throw error;

      setEditingNiche(false);
      toast.success("Niches updated successfully");
    } catch (error) {
      toast.error("Failed to update niches");
    }
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

  const handleAddPlatform = () => {
    setPlatforms([...platforms, { 
      platform_type: "Twitch", 
      username: "", 
      profile_url: "",
      followers_count: 0 
    }]);
  };

  const handleUpdatePlatform = (index: number, field: keyof CreatorPlatform, value: string) => {
    const newPlatforms = [...platforms];
    (newPlatforms[index] as any)[field] = value;
    setPlatforms(newPlatforms);
  };

  const handleSavePlatforms = async () => {
    if (!creatorId) return;

    try {
      for (const platform of platforms) {
        if (platform.id) {
          // Update existing platform
          const { error } = await supabase
            .from("creator_platforms")
            .update({
              platform_type: platform.platform_type,
              username: platform.username,
              profile_url: platform.profile_url || `https://${platform.platform_type.toLowerCase()}.com/${platform.username}`,
              followers_count: platform.followers_count || 0
            })
            .eq("id", platform.id);

          if (error) throw error;
        } else {
          // Insert new platform
          const { error } = await supabase
            .from("creator_platforms")
            .insert({
              creator_id: creatorId,
              platform_type: platform.platform_type,
              username: platform.username,
              profile_url: platform.profile_url || `https://${platform.platform_type.toLowerCase()}.com/${platform.username}`,
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
    }
  };

  const getPlatformIcon = (platformName: string) => {
    const platform = platformOptions.find(p => p.name === platformName);
    if (!platform) return <Globe className="w-4 h-4" />;
    
    if (typeof platform.icon === 'function') {
      return platform.icon();
    }
    const Icon = platform.icon;
    return <Icon className="w-4 h-4" />;
  };

  const handleSaveAll = async () => {
    if (!creatorId || !user) return;
    
    setSaving(true);
    
    try {
      // Update creator profile
      const { error: profileError } = await supabase
        .from("creator_profiles")
        .update({
          bio: bio,
          niche: selectedNiches,
          phone_number: phoneNumber,
          location: location,
          updated_at: new Date().toISOString()
        })
        .eq("id", creatorId);

      if (profileError) throw profileError;

      // Update notification preferences in user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          notification_preferences: {
            campaigns: notifCampaigns,
            messages: notifMessages,
            payments: notifPayments,
            announcements: notifAnnouncements
          }
        }
      });

      if (metadataError) throw metadataError;

      toast.success("All settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Settings" userType="creator" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      <AppHeader showBack title="Settings" userType="creator" />

      {/* MAIN CONTENT */}
      <div className="mt-14 px-4 py-6 space-y-8">
        
        {/* SECTION 1: ACCOUNT */}
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
                    {email}
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg"
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg"
                      />
                    </div>
                    <button
                      onClick={handleUpdateEmail}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
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
                        NEW PASSWORD
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg"
                      />
                      {newPassword && (
                        <div className="mt-1 flex gap-1">
                          <div className={`h-1 flex-1 ${newPassword.length >= 6 ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${/[A-Z]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${/[0-9]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg"
                      />
                    </div>
                    <button
                      onClick={handleUpdatePassword}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
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

            {/* Phone Number */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                PHONE NUMBER
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Your phone number"
                className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg mb-2"
              />
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-[#389C9A] mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-[#1D1D1D]/50 leading-relaxed">
                  Used for account security and important notifications.
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                LOCATION
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PROFILE */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            PROFILE
          </h2>

          <div className="space-y-6">
            {/* Bio */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    YOUR BIO
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60 leading-relaxed">
                    {truncateBio(bio)}
                    {bio.split(" ").length > 15 && !editingBio && (
                      <button 
                        onClick={() => setBioExpanded(!bioExpanded)}
                        className="ml-1 text-[#389C9A] text-xs font-bold"
                      >
                        {bioExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>
                </div>
                {!editingBio && (
                  <button 
                    onClick={() => {
                      setBioInput(bio);
                      setEditingBio(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingBio && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <textarea
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value.slice(0, 200))}
                        rows={4}
                        maxLength={200}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none rounded-lg"
                      />
                      <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                        {bioInput.length}/200
                      </div>
                    </div>
                    <button
                      onClick={handleSaveBio}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
                    >
                      SAVE BIO
                    </button>
                    <button
                      onClick={() => setEditingBio(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content Niche */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    CONTENT NICHES
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedNiches.map((niche, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic rounded-full"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
                {!editingNiche && (
                  <button 
                    onClick={() => setEditingNiche(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingNiche && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2">
                      {nicheOptions.map((niche) => (
                        <button
                          key={niche}
                          onClick={() => {
                            if (selectedNiches.includes(niche)) {
                              setSelectedNiches(selectedNiches.filter(n => n !== niche));
                            } else if (selectedNiches.length < 5) {
                              setSelectedNiches([...selectedNiches, niche]);
                            }
                          }}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border-2 transition-colors rounded-full ${
                            selectedNiches.includes(niche)
                              ? "bg-[#389C9A] border-[#389C9A] text-white"
                              : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D] hover:border-[#389C9A]"
                          }`}
                        >
                          {niche}
                        </button>
                      ))}
                    </div>
                    <p className="text-[8px] text-[#1D1D1D]/50 italic">
                      Select up to 5 niches that best describe your content
                    </p>
                    <button
                      onClick={handleSaveNiche}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
                    >
                      SAVE NICHES
                    </button>
                    <button
                      onClick={() => setEditingNiche(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Streaming Platforms */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    YOUR PLATFORMS
                  </label>
                  <div className="space-y-2">
                    {platforms.map((platform, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1 rounded-full">
                          {getPlatformIcon(platform.platform_type)}
                          <span>{platform.platform_type}</span>
                        </div>
                        <span className="text-xs text-[#1D1D1D]/60">@{platform.username}</span>
                        {platform.followers_count ? (
                          <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full">
                            {platform.followers_count.toLocaleString()} followers
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {!editingPlatforms && (
                  <button 
                    onClick={() => setEditingPlatforms(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    MANAGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingPlatforms && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {platforms.map((platform, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border border-[#1D1D1D]/10 rounded-lg">
                        <select
                          value={platform.platform_type}
                          onChange={(e) => handleUpdatePlatform(index, 'platform_type', e.target.value)}
                          className="px-2 py-1 border border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider outline-none rounded"
                        >
                          {platformOptions.map(opt => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <AtSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <input
                            type="text"
                            value={platform.username}
                            onChange={(e) => handleUpdatePlatform(index, 'username', e.target.value)}
                            placeholder="username"
                            className="w-full pl-6 pr-2 py-1 border border-[#1D1D1D]/10 text-sm focus:border-[#389C9A] outline-none rounded"
                          />
                        </div>
                        <input
                          type="number"
                          value={platform.followers_count || ''}
                          onChange={(e) => handleUpdatePlatform(index, 'followers_count', e.target.value)}
                          placeholder="Followers"
                          className="w-20 px-2 py-1 border border-[#1D1D1D]/10 text-sm focus:border-[#389C9A] outline-none rounded"
                        />
                        <button
                          onClick={() => handleRemovePlatform(index)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddPlatform}
                      className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:border-[#389C9A] transition-colors rounded-lg"
                    >
                      + ADD PLATFORM
                    </button>
                    <button
                      onClick={handleSavePlatforms}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
                    >
                      SAVE PLATFORMS
                    </button>
                    <button
                      onClick={() => setEditingPlatforms(false)}
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

        {/* Stats Display */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            CHANNEL STATS
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
              <Users className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
              <p className="text-sm font-black">{creatorProfile?.avg_viewers?.toLocaleString() || 0}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Avg Viewers</p>
            </div>
            <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
              <Award className="w-4 h-4 text-[#FEDB71] mx-auto mb-1" />
              <p className="text-sm font-black">{creatorProfile?.total_streams || 0}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Total Streams</p>
            </div>
            <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
              <Star className="w-4 h-4 text-[#FEDB71] mx-auto mb-1" />
              <p className="text-sm font-black">{creatorProfile?.rating || 0}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Rating</p>
            </div>
          </div>
          <p className="text-[8px] text-center text-[#1D1D1D]/40 mt-2">
            Stats update automatically based on your campaign performance
          </p>
        </div>

        {/* SECTION 3: NOTIFICATIONS */}
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
              <span className="text-sm font-bold text-[#1D1D1D]">Messages from businesses</span>
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
              <span className="text-sm font-bold text-[#1D1D1D]">Payment and payout alerts</span>
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

        {/* SECTION 4: ACCOUNT STATUS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT STATUS
          </h2>

          <div className="space-y-6">
            {/* Account Status Display */}
            <div className="bg-[#F8F8F8] p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Current Status</span>
                <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${
                  creatorProfile?.status === 'active' ? 'bg-green-100 text-green-700' :
                  creatorProfile?.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {creatorProfile?.status || 'Unknown'}
                </span>
              </div>
              <p className="text-[9px] text-[#1D1D1D]/60">
                {creatorProfile?.status === 'active' 
                  ? 'Your account is active and visible to businesses.'
                  : creatorProfile?.status === 'pending_review'
                  ? 'Your account is under review. You will be notified once approved.'
                  : 'Your account status is being processed.'}
              </p>
            </div>

            {/* Pause Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">PAUSE YOUR ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Pausing hides your profile from businesses and stops new campaign requests. Active campaigns are not affected.
              </p>
              <button
                onClick={() => setShowPauseModal(true)}
                className="w-full py-2.5 border-2 border-[#D2691E] text-[#D2691E] text-[10px] font-black uppercase tracking-wider italic hover:bg-[#D2691E] hover:text-white transition-colors rounded-lg"
              >
                PAUSE MY ACCOUNT
              </button>
            </div>

            {/* Delete Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">DELETE ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Permanently deletes your account and all associated data. This cannot be undone. Any pending payouts will be processed before deletion.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 border-2 border-red-600 text-red-600 text-[10px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors rounded-lg"
              >
                REQUEST ACCOUNT DELETION
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 5: SUPPORT */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            SUPPORT
          </h2>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-lg">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Help Centre</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Terms of Service</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Privacy Policy</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>
          </div>
        </div>

        {/* BOTTOM INFO */}
        <div className="text-center space-y-2 pt-6">
          <p className="text-[9px] text-[#1D1D1D]/40">
            LiveLink v1.0.0
          </p>
          <p className="text-[9px] text-[#1D1D1D]/60">
            Logged in as {user?.email} · Not you?{" "}
            <button 
              onClick={handleLogout}
              className="text-[#389C9A] font-bold"
            >
              Log out
            </button>
          </p>
        </div>
         {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#1D1D1D]/10 z-40">
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
              <CheckCircle2 className="w-5 h-5 text-[#FEDB71]" />
              SAVE ALL CHANGES
            </>
          )}
        </button>
      </div>
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
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-3">
                Pause Your Account?
              </h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                Your profile will be hidden from businesses. You can reactivate at any time from Settings.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 bg-[#D2691E] text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
                >
                  YES, PAUSE ACCOUNT
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic rounded-lg"
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
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-3">
                Delete Your Account?
              </h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                This is permanent and cannot be undone. All your data, campaigns and earnings history will be removed. Any pending payouts will be processed within 5 business days.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider italic rounded-lg"
                >
                  YES, DELETE MY ACCOUNT
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic rounded-lg"
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
