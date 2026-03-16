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
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";

interface CreatorProfile {
  bio: string;
  niches: string[];
  platforms: {
    id?: string;
    name: string;
    handle: string;
    url?: string;
    followers?: number;
  }[];
  gigs: {
    id?: string;
    name: string;
    streams: number;
    price: number;
    description: string;
    enabled: boolean;
    is_default?: boolean;
  }[];
  notification_preferences: {
    campaigns: boolean;
    messages: boolean;
    payments: boolean;
    announcements: boolean;
  };
  phone_number: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url?: string;
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

  // Profile section state
  const [editingBio, setEditingBio] = useState(false);
  const [editingNiche, setEditingNiche] = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState(false);
  const [bio, setBio] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<{ id?: string; name: string; handle: string; url?: string }[]>([]);

  // Gig pricing state
  const [gigs, setGigs] = useState<{
    id?: string;
    name: string;
    streams: number;
    price: number;
    description: string;
    enabled: boolean;
    is_default?: boolean;
  }[]>([
    {
      name: "Bronze Package",
      streams: 4,
      price: 15000,
      description: "Perfect for testing the partnership",
      enabled: true,
      is_default: true
    },
    {
      name: "Silver Package",
      streams: 8,
      price: 28000,
      description: "Best value for ongoing campaigns",
      enabled: true
    },
    {
      name: "Gold Package",
      streams: 12,
      price: 40000,
      description: "Maximum exposure for premium brands",
      enabled: false
    }
  ]);

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
            *,
            platforms:creator_platforms(*),
            gigs:creator_gigs(*)
          `)
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile:", error);
        }

        if (profile) {
          setEmail(profile.email || user.email || "");
          setPhoneNumber(profile.phone_number || "+234 801 234 5678");
          setBio(profile.bio || "Gaming content creator specializing in FPS games. I stream 5 days a week with an engaged community that loves tech and gaming products.");
          setSelectedNiches(profile.niches || ["Gaming", "Tech Reviews", "Lifestyle"]);
          
          if (profile.platforms && profile.platforms.length > 0) {
            setPlatforms(profile.platforms.map((p: any) => ({
              id: p.id,
              name: p.platform_type,
              handle: p.username,
              url: p.profile_url
            })));
          }

          if (profile.gigs && profile.gigs.length > 0) {
            setGigs(profile.gigs.map((g: any) => ({
              id: g.id,
              name: g.name,
              streams: g.streams,
              price: g.price,
              description: g.description,
              enabled: g.enabled,
              is_default: g.is_default
            })));
          }

          if (profile.notification_preferences) {
            setNotifCampaigns(profile.notification_preferences.campaigns ?? true);
            setNotifMessages(profile.notification_preferences.messages ?? true);
            setNotifPayments(profile.notification_preferences.payments ?? true);
            setNotifAnnouncements(profile.notification_preferences.announcements ?? false);
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

  const handleUpdateEmail = () => {
    setEmail(newEmail);
    setEditingEmail(false);
    setNewEmail("");
    setConfirmEmail("");
    setCurrentPasswordEmail("");
    toast.success("Email updated successfully");
  };

  const handleUpdatePassword = () => {
    setEditingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully");
  };

  const handleSaveBio = () => {
    setBio(bioInput);
    setEditingBio(false);
    toast.success("Bio updated successfully");
  };

  const handleSaveNiche = () => {
    setEditingNiche(false);
    toast.success("Niches updated successfully");
  };

  const handleRemovePlatform = (index: number) => {
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const handleAddPlatform = () => {
    setPlatforms([...platforms, { name: "Twitch", handle: "" }]);
  };

  const handleUpdatePlatform = (index: number, field: 'name' | 'handle', value: string) => {
    const newPlatforms = [...platforms];
    newPlatforms[index][field] = value;
    setPlatforms(newPlatforms);
  };

  const handleSaveGig = (index: number) => {
    toast.success(`${gigs[index].name} saved successfully`);
  };

  const handleToggleGig = (index: number) => {
    const newGigs = [...gigs];
    newGigs[index].enabled = !newGigs[index].enabled;
    setGigs(newGigs);
  };

  const handleUpdateGig = (index: number, field: string, value: any) => {
    const newGigs = [...gigs];
    (newGigs[index] as any)[field] = value;
    setGigs(newGigs);
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
    setSaving(true);
    
    try {
      // Update creator profile
      const { error: profileError } = await supabase
        .from("creator_profiles")
        .upsert({
          user_id: user?.id,
          bio: bio,
          niches: selectedNiches,
          phone_number: phoneNumber,
          email: email,
          notification_preferences: {
            campaigns: notifCampaigns,
            messages: notifMessages,
            payments: notifPayments,
            announcements: notifAnnouncements
          },
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Update platforms
      for (const platform of platforms) {
        if (platform.id) {
          await supabase
            .from("creator_platforms")
            .update({
              platform_type: platform.name,
              username: platform.handle,
              profile_url: platform.url
            })
            .eq("id", platform.id);
        } else {
          await supabase
            .from("creator_platforms")
            .insert({
              creator_id: user?.id,
              platform_type: platform.name,
              username: platform.handle,
              profile_url: platform.url
            });
        }
      }

      // Update gigs
      for (const gig of gigs) {
        if (gig.id) {
          await supabase
            .from("creator_gigs")
            .update({
              name: gig.name,
              streams: gig.streams,
              price: gig.price,
              description: gig.description,
              enabled: gig.enabled
            })
            .eq("id", gig.id);
        } else {
          await supabase
            .from("creator_gigs")
            .insert({
              creator_id: user?.id,
              name: gig.name,
              streams: gig.streams,
              price: gig.price,
              description: gig.description,
              enabled: gig.enabled,
              is_default: gig.is_default || false
            });
        }
      }

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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CURRENT PASSWORD
                      </label>
                      <input
                        type="password"
                        value={currentPasswordEmail}
                        onChange={(e) => setCurrentPasswordEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateEmail}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      {newPassword && (
                        <div className="mt-1 flex gap-1">
                          <div className={`h-1 flex-1 ${newPassword.length >= 8 ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${newPassword.length >= 10 && /[A-Z]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdatePassword}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
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
              <p className="text-sm text-[#1D1D1D]/60 mb-2">
                {phoneNumber}
              </p>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-[#389C9A] mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-[#1D1D1D]/50 leading-relaxed">
                  To change your phone number please contact our team at{" "}
                  <a href="mailto:support@livelink.com" className="text-[#389C9A] underline">
                    support@livelink.com
                  </a>
                  {" "}— this requires identity verification.
                </p>
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
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                      />
                      <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                        {bioInput.length}/200
                      </div>
                    </div>
                    <button
                      onClick={handleSaveBio}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
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
                    CONTENT NICHE
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedNiches.map((niche, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic"
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
                            } else if (selectedNiches.length < 3) {
                              setSelectedNiches([...selectedNiches, niche]);
                            }
                          }}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                            selectedNiches.includes(niche)
                              ? "bg-[#389C9A] border-[#389C9A] text-white"
                              : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                          }`}
                        >
                          {niche}
                        </button>
                      ))}
                    </div>
                    <p className="text-[8px] text-[#1D1D1D]/50 italic">
                      Select up to 3 niches
                    </p>
                    <button
                      onClick={handleSaveNiche}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
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
                        <div className="px-3 py-1 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
                          {getPlatformIcon(platform.name)}
                          <span>{platform.name}</span>
                        </div>
                        <span className="text-xs text-[#1D1D1D]/60">{platform.handle}</span>
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
                      <div key={index} className="flex items-center gap-2 p-3 border border-[#1D1D1D]/10">
                        <select
                          value={platform.name}
                          onChange={(e) => handleUpdatePlatform(index, 'name', e.target.value)}
                          className="px-2 py-1 border border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider outline-none"
                        >
                          {platformOptions.map(opt => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={platform.handle}
                          onChange={(e) => handleUpdatePlatform(index, 'handle', e.target.value)}
                          placeholder="@username"
                          className="flex-1 px-2 py-1 border border-[#1D1D1D]/10 text-sm focus:border-[#389C9A] outline-none"
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
                      className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:border-[#389C9A] transition-colors"
                    >
                      + ADD PLATFORM
                    </button>
                    <button
                      onClick={() => setEditingPlatforms(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
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

        {/* SECTION 3: GIG PRICING */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-2 italic">
            GIG PRICING
          </h2>
          <p className="text-[9px] text-[#1D1D1D]/60 mb-4 leading-relaxed">
            Set up to 3 pricing tiers for your gigs. Each tier is priced per 4 live streams minimum. Businesses will see these when viewing your profile.
          </p>

          <div className="space-y-4">
            {gigs.map((gig, index) => (
              <div key={index} className="border-2 border-[#1D1D1D]/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1D1D1D] italic">
                    GIG {index + 1}
                  </h3>
                  <div className="flex items-center gap-2">
                    {gig.is_default && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#389C9A] italic">
                        DEFAULT
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleGig(index)}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                        gig.enabled ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                      }`}>
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </button>
                  </div>
                </div>

                {gig.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        PACKAGE NAME
                      </label>
                      <input
                        type="text"
                        value={gig.name}
                        onChange={(e) => handleUpdateGig(index, 'name', e.target.value)}
                        placeholder="e.g. Bronze"
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        NUMBER OF LIVE STREAMS
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateGig(index, 'streams', Math.max(4, gig.streams - 1))}
                          className="w-10 h-10 border-2 border-[#1D1D1D] flex items-center justify-center text-lg font-black"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center text-2xl font-black italic text-[#1D1D1D]">
                          {gig.streams}
                        </div>
                        <button
                          onClick={() => handleUpdateGig(index, 'streams', gig.streams + 1)}
                          className="w-10 h-10 border-2 border-[#1D1D1D] flex items-center justify-center text-lg font-black"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-1 italic">
                        Minimum 4 live streams per package
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        YOUR PRICE (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-[#1D1D1D]">
                          ₦
                        </span>
                        <input
                          type="number"
                          value={gig.price}
                          onChange={(e) => handleUpdateGig(index, 'price', parseInt(e.target.value) || 0)}
                          placeholder="Enter your price"
                          className="w-full pl-8 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-1 italic">
                        This is what you charge per package — not per stream.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        PACKAGE DESCRIPTION
                      </label>
                      <input
                        type="text"
                        value={gig.description}
                        onChange={(e) => handleUpdateGig(index, 'description', e.target.value.slice(0, 60))}
                        placeholder="e.g. Great for testing the partnership"
                        maxLength={60}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#1D1D1D]/10">
                      <button
                        onClick={() => handleSaveGig(index)}
                        className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                      >
                        SAVE GIG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pricing Note */}
            <div className="border border-[#389C9A]/30 bg-[#389C9A]/5 p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#389C9A] flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-[#1D1D1D]/70 leading-relaxed">
                Your pricing is reviewed by our team. Prices that do not reflect your viewer tier may be flagged. Minimum price per 4 streams is ₦5,000.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: NOTIFICATIONS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            NOTIFICATIONS
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">New campaign requests</span>
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

        {/* SECTION 5: ACCOUNT STATUS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT STATUS
          </h2>

          <div className="space-y-6">
            {/* Pause Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">PAUSE YOUR ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Pausing hides your profile from businesses and stops new campaign requests. Active campaigns are not affected.
              </p>
              <button
                onClick={() => setShowPauseModal(true)}
                className="w-full py-2.5 border-2 border-[#D2691E] text-[#D2691E] text-[10px] font-black uppercase tracking-wider italic hover:bg-[#D2691E] hover:text-white transition-colors"
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
                className="w-full py-2.5 border-2 border-red-600 text-red-600 text-[10px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors"
              >
                REQUEST ACCOUNT DELETION
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 6: SUPPORT */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            SUPPORT
          </h2>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Help Centre</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Terms of Service</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
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
                  className="w-full py-2.5 bg-[#D2691E] text-white text-[10px] font-black uppercase tracking-wider italic"
                >
                  YES, PAUSE ACCOUNT
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
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
                  className="w-full py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider italic"
                >
                  YES, DELETE MY ACCOUNT
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
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