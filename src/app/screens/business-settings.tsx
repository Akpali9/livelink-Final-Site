import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Mail, 
  HelpCircle, 
  FileText, 
  Shield, 
  Info,
  Globe,
  Upload,
  CreditCard,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Save,
  Loader2,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface BusinessProfileData {
  businessName: string;
  yourName: string;
  contactNumber: string;
  email: string;
  website: string;
  industry: string;
  country: string;
  bio: string;
  city?: string;
  registrationNumber?: string;
  taxId?: string;
  yearFounded?: string;
  employeeCount?: string;
  socialLinks?: {platform: string, url: string}[];
  logo?: string;
}

interface CreatorPreferences {
  ageMin: number;
  ageMax: number;
  targetGenders: string[];
  preferredNiches: string[];
  defaultCampaignType: string;
}

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Account section state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  
  // Form states - initialize as empty strings
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerJobTitle, setOwnerJobTitle] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerJobTitle, setNewOwnerJobTitle] = useState("");
  const [currentPasswordOwner, setCurrentPasswordOwner] = useState("");

  // Business Profile section state
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingSocial, setEditingSocial] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteInput, setWebsiteInput] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState<{platform: string, url: string, id: string}[]>([]);

  // Payment section state
  const [editingPayment, setEditingPayment] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);

  // Campaign Preferences state
  const [editingAgeRange, setEditingAgeRange] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [editingNiches, setEditingNiches] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [targetGenders, setTargetGenders] = useState(["All Genders"]);
  const [preferredNiches, setPreferredNiches] = useState<string[]>([]);
  const [defaultCampaignType, setDefaultCampaignType] = useState("BANNER");

  // Notifications state
  const [notifAccepts, setNotifAccepts] = useState(true);
  const [notifDeclines, setNotifDeclines] = useState(true);
  const [notifPayouts, setNotifPayouts] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Verification status
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'unverified' | 'rejected'>('unverified');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const industryOptions = [
    "Marketing & Advertising",
    "E-commerce & Retail",
    "Technology & Software",
    "Food & Beverage",
    "Fashion & Beauty",
    "Health & Wellness",
    "Education & Training",
    "Finance & Banking",
    "Entertainment & Media",
    "Travel & Hospitality",
    "Real Estate",
    "Automotive",
    "Sports & Fitness",
    "Other"
  ];

  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

  const genderOptions = ["Male", "Female", "Non-binary", "All Genders"];

  // Fetch business data on mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) {
        navigate('/login/portal');
        return;
      }

      try {
        // Fetch business profile
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error("Fetch error:", businessError);
        }

        if (businessData) {
          // Only set values that exist in the database
          setBusinessName(businessData.business_name || "");
          setOwnerName(businessData.contact_name || "");
          setPhoneNumber(businessData.contact_phone || "");
          setEmail(businessData.contact_email || user.email || "");
          setWebsite(businessData.website || "");
          setIndustry(businessData.industry || "");
          setCountry(businessData.country || "");
          setBusinessDescription(businessData.description || "");
          setCity(businessData.city || "");
          setBusinessLogo(businessData.logo_url || "");
          
          // Parse social links
          if (businessData.social_links && businessData.social_links.length > 0) {
            setSocialPlatforms(businessData.social_links.map((link: any, index: number) => ({
              ...link,
              id: `social-${index}-${Date.now()}`
            })));
          }

          setVerificationStatus(businessData.verification_status || 'unverified');
          setRejectionReason(businessData.rejection_reason || null);

          // Fetch preferences
          const { data: prefsData } = await supabase
            .from("business_preferences")
            .select("*")
            .eq("business_id", businessData.id)
            .single();

          if (prefsData) {
            setAgeMin(prefsData.age_min || 18);
            setAgeMax(prefsData.age_max || 35);
            setTargetGenders(prefsData.target_genders || ["All Genders"]);
            setPreferredNiches(prefsData.preferred_niches || []);
            setDefaultCampaignType(prefsData.default_campaign_type || "BANNER");
          }

          // Fetch notification settings
          const { data: notifData } = await supabase
            .from("business_notifications")
            .select("*")
            .eq("business_id", businessData.id)
            .single();

          if (notifData) {
            setNotifAccepts(notifData.campaign_accepts ?? true);
            setNotifDeclines(notifData.campaign_declines ?? true);
            setNotifPayouts(notifData.payout_released ?? true);
            setNotifMessages(notifData.new_messages ?? true);
            setNotifAnnouncements(notifData.announcements ?? false);
          }

          // Fetch saved cards (from payments table)
          const { data: cardsData } = await supabase
            .from("business_payment_methods")
            .select("*")
            .eq("business_id", businessData.id);

          if (cardsData) {
            setSavedCards(cardsData);
          }
        }
      } catch (error) {
        console.error("Error fetching business data:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [user, navigate]);

  // Save business profile changes
  const saveBusinessProfile = async (updates: Partial<BusinessProfileData>) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Handle email update
  const handleUpdateEmail = async () => {
    if (newEmail !== confirmEmail) {
      toast.error("Emails do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      // Update in businesses table
      await supabase
        .from("businesses")
        .update({ contact_email: newEmail })
        .eq("user_id", user?.id);

      setEmail(newEmail);
      setEditingEmail(false);
      toast.success("Verification email sent to new address");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
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
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle owner update
  const handleUpdateOwner = async () => {
    await saveBusinessProfile({
      yourName: newOwnerName,
      contact_name: newOwnerName,
      contact_job_title: newOwnerJobTitle
    });
    setOwnerName(newOwnerName);
    setOwnerJobTitle(newOwnerJobTitle);
    setEditingOwner(false);
  };

  // Handle business name update
  const handleSaveBusinessName = async () => {
    await saveBusinessProfile({ businessName: businessNameInput });
    setBusinessName(businessNameInput);
    setEditingBusinessName(false);
  };

  // Handle description update
  const handleSaveDescription = async () => {
    await saveBusinessProfile({ bio: descriptionInput });
    setBusinessDescription(descriptionInput);
    setEditingDescription(false);
  };

  // Handle website update
  const handleSaveWebsite = async () => {
    await saveBusinessProfile({ website: websiteInput });
    setWebsite(websiteInput);
    setEditingWebsite(false);
  };

  // Handle location update
  const handleSaveLocation = async () => {
    await saveBusinessProfile({ 
      city: cityInput,
      country: countryInput 
    });
    setCity(cityInput);
    setCountry(countryInput);
    setEditingLocation(false);
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      await supabase
        .from("businesses")
        .update({ logo_url: urlData.publicUrl })
        .eq("user_id", user.id);

      setBusinessLogo(urlData.publicUrl);
      toast.success("Logo updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingLogo(false);
      setEditingLogo(false);
    }
  };

  // Handle social links update
  const handleSaveSocialLinks = async () => {
    const socialLinks = socialPlatforms.map(({ platform, url }) => ({ platform, url }));
    await saveBusinessProfile({ socialLinks });
    setEditingSocial(false);
  };

  // Handle preferences update
  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessData) {
        const { error } = await supabase
          .from("business_preferences")
          .upsert({
            business_id: businessData.id,
            age_min: ageMin,
            age_max: ageMax,
            target_genders: targetGenders,
            preferred_niches: preferredNiches,
            default_campaign_type: defaultCampaignType,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Preferences saved");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle notification settings update
  const saveNotifications = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessData) {
        const { error } = await supabase
          .from("business_notifications")
          .upsert({
            business_id: businessData.id,
            campaign_accepts: notifAccepts,
            campaign_declines: notifDeclines,
            payout_released: notifPayouts,
            new_messages: notifMessages,
            announcements: notifAnnouncements,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Notification settings saved");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const truncateDescription = (text: string, lines: number = 2) => {
    const words = text.split(" ");
    if (words.length <= 15) return text;
    return descriptionExpanded ? text : words.slice(0, 15).join(" ") + "...";
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <span className="px-3 py-1 bg-green-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> VERIFIED
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> NOT VERIFIED
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
          <p className="text-[10px] font-mono text-[#1D1D1D]/30 uppercase tracking-widest">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto relative">
      {/* TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center justify-center relative">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute left-0 p-1"
          >
            <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
          </button>
          <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            SETTINGS
          </h1>
          {saving && (
            <div className="absolute right-0">
              <Loader2 className="w-4 h-4 animate-spin text-[#389C9A]" />
            </div>
          )}
        </div>
      </header>

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
                    {email || "Not set"}
                  </p>
                </div>
                {!editingEmail && (
                  <button 
                    onClick={() => setEditingEmail(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {email ? "CHANGE" : "ADD"}
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
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "UPDATING..." : "UPDATE EMAIL"}
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
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "UPDATING..." : "UPDATE PASSWORD"}
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
                {phoneNumber || "Not set"}
              </p>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-[#389C9A] mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-[#1D1D1D]/50 leading-relaxed">
                  To change your phone number contact our team at{" "}
                  <a href="mailto:support@livelink.com" className="text-[#389C9A] underline">
                    support@livelink.com
                  </a>
                  {" "}— this requires identity verification.
                </p>
              </div>
            </div>

            {/* Account Owner Name */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    ACCOUNT OWNER
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {ownerName || "Not set"}
                  </p>
                  <p className="text-xs text-[#1D1D1D]/40 mt-0.5">
                    {ownerJobTitle || "No job title"}
                  </p>
                </div>
                {!editingOwner && (
                  <button 
                    onClick={() => {
                      setNewOwnerName(ownerName);
                      setNewOwnerJobTitle(ownerJobTitle);
                      setEditingOwner(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {ownerName ? "CHANGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingOwner && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        FULL NAME
                      </label>
                      <input
                        type="text"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        JOB TITLE / ROLE
                      </label>
                      <input
                        type="text"
                        value={newOwnerJobTitle}
                        onChange={(e) => setNewOwnerJobTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CURRENT PASSWORD
                      </label>
                      <input
                        type="password"
                        value={currentPasswordOwner}
                        onChange={(e) => setCurrentPasswordOwner(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateOwner}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "UPDATING..." : ownerName ? "UPDATE DETAILS" : "ADD OWNER"}
                    </button>
                    <button
                      onClick={() => setEditingOwner(false)}
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

        {/* SECTION 2: BUSINESS PROFILE */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            BUSINESS PROFILE
          </h2>

          <div className="space-y-6">
            {/* Business Name */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BUSINESS NAME
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {businessName || "Not set"}
                  </p>
                </div>
                {!editingBusinessName && (
                  <button 
                    onClick={() => {
                      setBusinessNameInput(businessName);
                      setEditingBusinessName(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {businessName ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingBusinessName && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        placeholder="Enter business name"
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-2 italic">
                        Changing your business name will be reviewed by our team before going live.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveBusinessName}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : businessName ? "SAVE" : "ADD BUSINESS NAME"}
                    </button>
                    <button
                      onClick={() => setEditingBusinessName(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Logo */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                  BUSINESS LOGO
                </label>
                <div className="flex items-center gap-3">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Business logo" className="w-10 h-10 border border-[#1D1D1D]/10 object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-[#1D1D1D]/5 border border-[#1D1D1D]/10 flex items-center justify-center">
                      <span className="text-[10px] font-black text-[#1D1D1D]/30">LOGO</span>
                    </div>
                  )}
                  {!editingLogo && (
                    <button 
                      onClick={() => setEditingLogo(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                    >
                      {businessLogo ? "CHANGE" : "ADD"}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {editingLogo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="border-2 border-dashed border-[#1D1D1D]/20 p-8 text-center">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="w-8 h-8 text-[#1D1D1D]/40 mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#1D1D1D] mb-1">
                          {uploadingLogo ? "UPLOADING..." : "Tap to upload logo"}
                        </p>
                        <p className="text-[9px] text-[#1D1D1D]/50">PNG recommended · Max 2MB</p>
                      </label>
                    </div>
                    <button
                      onClick={() => setEditingLogo(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Description */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BUSINESS DESCRIPTION
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60 leading-relaxed">
                    {businessDescription ? truncateDescription(businessDescription) : "No description set"}
                    {businessDescription && businessDescription.split(" ").length > 15 && !editingDescription && (
                      <button 
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="ml-1 text-[#389C9A] text-xs font-bold"
                      >
                        {descriptionExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>
                </div>
                {!editingDescription && (
                  <button 
                    onClick={() => {
                      setDescriptionInput(businessDescription);
                      setEditingDescription(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    {businessDescription ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingDescription && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <textarea
                        value={descriptionInput}
                        onChange={(e) => setDescriptionInput(e.target.value.slice(0, 200))}
                        rows={4}
                        maxLength={200}
                        placeholder="Tell creators about your brand, mission, and what makes you unique..."
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                      />
                      <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                        {descriptionInput.length}/200
                      </div>
                    </div>
                    <button
                      onClick={handleSaveDescription}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : businessDescription ? "SAVE DESCRIPTION" : "ADD DESCRIPTION"}
                    </button>
                    <button
                      onClick={() => setEditingDescription(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Industry Category */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    INDUSTRY
                  </label>
                  {industry ? (
                    <span className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic inline-block">
                      {industry}
                    </span>
                  ) : (
                    <p className="text-sm text-[#1D1D1D]/60">Not set</p>
                  )}
                </div>
                {!editingIndustry && (
                  <button 
                    onClick={() => setEditingIndustry(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {industry ? "CHANGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingIndustry && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                    >
                      <option value="">Select industry</option>
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        await saveBusinessProfile({ industry });
                        setEditingIndustry(false);
                      }}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE"}
                    </button>
                    <button
                      onClick={() => setEditingIndustry(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Website URL */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    WEBSITE
                  </label>
                  {website ? (
                    <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#389C9A] underline">
                      {website}
                    </a>
                  ) : (
                    <p className="text-sm text-[#1D1D1D]/60">Not set</p>
                  )}
                </div>
                {!editingWebsite && (
                  <button 
                    onClick={() => {
                      setWebsiteInput(website);
                      setEditingWebsite(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {website ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingWebsite && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
                      <input
                        type="text"
                        value={websiteInput}
                        onChange={(e) => setWebsiteInput(e.target.value)}
                        placeholder="example.com"
                        className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveWebsite}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE"}
                    </button>
                    <button
                      onClick={() => setEditingWebsite(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Location */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    LOCATION
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {city || country ? `${city ? city + ', ' : ''}${country}` : "Not set"}
                  </p>
                </div>
                {!editingLocation && (
                  <button 
                    onClick={() => {
                      setCityInput(city);
                      setCountryInput(country);
                      setEditingLocation(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {city || country ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingLocation && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CITY
                      </label>
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder="e.g. Lagos"
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        COUNTRY
                      </label>
                      <select
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      >
                        <option value="">Select country</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Kenya">Kenya</option>
                        <option value="South Africa">South Africa</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSaveLocation}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE LOCATION"}
                    </button>
                    <button
                      onClick={() => setEditingLocation(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Social Media */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    SOCIAL MEDIA
                  </label>
                  {socialPlatforms.length > 0 ? (
                    <div className="space-y-2">
                      {socialPlatforms.map((platform) => (
                        <div key={platform.id} className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic">
                            {platform.platform}
                          </div>
                          <span className="text-xs text-[#1D1D1D]/60 truncate">{platform.url}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#1D1D1D]/60">No social links added</p>
                  )}
                </div>
                {!editingSocial && (
                  <button 
                    onClick={() => setEditingSocial(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    {socialPlatforms.length > 0 ? "MANAGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingSocial && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {socialPlatforms.map((platform) => (
                      <div key={platform.id} className="flex items-center justify-between p-3 border border-[#1D1D1D]/10">
                        <div>
                          <p className="text-xs font-bold text-[#1D1D1D] capitalize">{platform.platform}</p>
                          <p className="text-[10px] text-[#1D1D1D]/60 truncate max-w-[150px]">{platform.url}</p>
                        </div>
                        <button
                          onClick={() => setSocialPlatforms(prev => prev.filter(p => p.id !== platform.id))}
                          className="text-[9px] font-black uppercase tracking-wider text-red-600 italic"
                        >
                          REMOVE
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newPlatform = window.prompt("Enter platform name (e.g., Twitter, Instagram):");
                        if (newPlatform) {
                          const newUrl = window.prompt(`Enter ${newPlatform} URL:`);
                          if (newUrl) {
                            setSocialPlatforms(prev => [...prev, {
                              platform: newPlatform.toLowerCase(),
                              url: newUrl,
                              id: `social-${Date.now()}-${Math.random()}`
                            }]);
                          }
                        }
                      }}
                      className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      ADD PLATFORM
                    </button>
                    <button
                      onClick={handleSaveSocialLinks}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE CHANGES"}
                    </button>
                    <button
                      onClick={() => setEditingSocial(false)}
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

        {/* ... REST OF THE SECTIONS (PAYMENT, PREFERENCES, NOTIFICATIONS, ETC) ... */}
        {/* They should follow the same pattern - showing "Not set" when no data exists */}

        {/* BOTTOM INFO */}
        <div className="text-center space-y-2 pt-6">
          <p className="text-[9px] text-[#1D1D1D]/40">
            LiveLink v1.0.0
          </p>
          <p className="text-[9px] text-[#1D1D1D]/60">
            Logged in as {email || businessName || "Business Account"} ·{" "}
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login/portal');
              }}
              className="text-[#389C9A] font-bold"
            >
              Log out
            </button>
          </p>
        </div>
      </div>

      {/* Modals... */}
    </div>
  );
}
