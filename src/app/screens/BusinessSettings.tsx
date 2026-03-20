import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Camera,
  Save,
  LogOut,
  Bell,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Lock,
  User,
  FileText,
  DollarSign,
  Target,
  Tag,
  Info,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  full_name: string;
  job_title: string;
  email: string;
  phone_number: string;
  industry: string;
  city: string;
  country: string;
  postcode: string;
  website: string;
  description: string;
  logo_url: string;
  status: string;
  application_status: string;
}

const INDUSTRIES = [
  "Technology", "Fashion & Beauty", "Food & Beverage", "Gaming",
  "Health & Fitness", "Entertainment", "Education", "Finance",
  "Travel & Hospitality", "Retail", "Automotive", "Sports",
  "Music", "Art & Design", "Media", "Real Estate", "Other",
];

const COUNTRIES = [
  "United Kingdom", "United States", "Nigeria", "Canada",
  "Australia", "Germany", "France", "South Africa", "Other",
];

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "profile" | "account" | "notifications" | "security" | "danger"
  >("profile");

  const [profile, setProfile] = useState<Partial<BusinessProfile>>({});
  const [originalProfile, setOriginalProfile] = useState<Partial<BusinessProfile>>({});
  const [hasChanges, setHasChanges]     = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showCurrentPw, setShowCurrentPw]       = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);
  const [changingPw, setChangingPw]             = useState(false);

  // Notification prefs (stored locally / user metadata)
  const [notifPrefs, setNotifPrefs] = useState({
    email_offers:       true,
    email_campaigns:    true,
    email_payments:     true,
    push_offers:        true,
    push_campaigns:     true,
    push_payments:      true,
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const changed = JSON.stringify(profile) !== JSON.stringify(originalProfile);
    setHasChanges(changed);
  }, [profile, originalProfile]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setOriginalProfile(data);
      } else {
        // Pre-fill from user metadata
        const meta = user!.user_metadata || {};
        const prefilled: Partial<BusinessProfile> = {
          business_name: meta.business_name || "",
          full_name:     meta.full_name     || "",
          job_title:     meta.job_title     || "",
          email:         user!.email        || "",
          phone_number:  meta.phone         || "",
          industry:      meta.industry      || "",
          city:          meta.city          || "",
          country:       meta.country       || "",
          description:   meta.description   || "",
          website:       meta.website       || "",
          logo_url:      meta.logo_url      || "",
        };
        setProfile(prefilled);
        setOriginalProfile(prefilled);
      }
    } catch (err) {
      console.error("Error fetching business profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        ...profile,
        user_id:    user.id,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("businesses")
          .update(payload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("businesses")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }

      // Sync relevant fields to user metadata
      await supabase.auth.updateUser({
        data: {
          full_name:     profile.full_name,
          business_name: profile.business_name,
          job_title:     profile.job_title,
          phone:         profile.phone_number,
        },
      });

      setOriginalProfile({ ...profile });
      setHasChanges(false);
      toast.success("Profile saved successfully");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Logo upload ────────────────────────────────────────────────────────────

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext      = file.name.split(".").pop();
      const fileName = `business-logos/${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, logo_url: publicUrl }));

      // Save immediately
      await supabase.from("businesses").update({ logo_url: publicUrl }).eq("user_id", user.id);
      toast.success("Logo updated");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Password change ────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  // ── Logout / Delete ────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    if (!confirm("This will permanently delete all your campaigns and data. Type YES to confirm.")) return;
    toast.error("Please contact support to delete your account.");
  };

  const update = (field: keyof BusinessProfile, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  // ── Nav sections ───────────────────────────────────────────────────────────

  const sections = [
    { id: "profile",       label: "Business Profile",   icon: Building2 },
    { id: "account",       label: "Account Details",    icon: User },
    { id: "notifications", label: "Notifications",      icon: Bell },
    { id: "security",      label: "Security",           icon: Lock },
    { id: "danger",        label: "Danger Zone",        icon: AlertCircle },
  ] as const;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Settings" userType="business" />
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24">
      <AppHeader showBack title="Settings" userType="business" />

      <div className="max-w-[480px] mx-auto">

        {/* Section Nav */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 no-scrollbar">
          {sections.map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[8px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-colors ${
                  activeSection === sec.id
                    ? "bg-[#1D1D1D] text-white"
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/50 hover:text-[#1D1D1D]"
                }`}
              >
                <Icon className="w-3 h-3" />
                {sec.label}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* ── PROFILE SECTION ── */}
          {activeSection === "profile" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Logo */}
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Business Logo</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-2 border-[#1D1D1D] rounded-xl overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
                      {profile.logo_url ? (
                        <img src={profile.logo_url} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#1D1D1D] text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-[#389C9A] transition-colors"
                    >
                      {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase">{profile.business_name || "Your Business"}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">JPG, PNG or WebP · Max 5MB</p>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="mt-2 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                    >
                      Change Logo
                    </button>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest">Business Information</h3>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Business Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.business_name || ""}
                      onChange={e => update("business_name", e.target.value)}
                      placeholder="Your business name"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Industry</label>
                  <select
                    value={profile.industry || ""}
                    onChange={e => update("industry", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors bg-white"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={profile.website || ""}
                      onChange={e => update("website", e.target.value)}
                      placeholder="https://yourbusiness.com"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">About Your Business</label>
                  <textarea
                    value={profile.description || ""}
                    onChange={e => update("description", e.target.value)}
                    placeholder="Describe your business, what you do, and what you're looking for in creators..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors resize-none"
                  />
                  <p className="text-[8px] text-gray-400 mt-1">{(profile.description || "").length}/500 characters</p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest">Location</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={profile.city || ""}
                        onChange={e => update("city", e.target.value)}
                        placeholder="City"
                        className="w-full pl-10 pr-3 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Postcode</label>
                    <input
                      type="text"
                      value={profile.postcode || ""}
                      onChange={e => update("postcode", e.target.value)}
                      placeholder="Postcode"
                      className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Country</label>
                  <select
                    value={profile.country || ""}
                    onChange={e => update("country", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors bg-white"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT SECTION ── */}
          {activeSection === "account" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Contact Person */}
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest">Contact Person</h3>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.full_name || ""}
                      onChange={e => update("full_name", e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.job_title || ""}
                      onChange={e => update("job_title", e.target.value)}
                      placeholder="e.g. Marketing Manager"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email || user?.email || ""}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 outline-none rounded-xl text-sm bg-[#F8F8F8] text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1">Email cannot be changed here. Contact support.</p>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={profile.phone_number || ""}
                      onChange={e => update("phone_number", e.target.value)}
                      placeholder="+44 7700 900000"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Account Status</h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Application Status",
                      value: profile.application_status || "pending",
                      color: profile.application_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : profile.application_status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700",
                    },
                    {
                      label: "Account Status",
                      value: profile.status || "pending",
                      color: profile.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#1D1D1D]/5 last:border-0">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{item.label}</span>
                      <span className={`text-[8px] font-black px-3 py-1 rounded-full capitalize ${item.color}`}>
                        {item.value.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full bg-white border-2 border-[#1D1D1D] rounded-xl p-4 flex items-center justify-between hover:bg-[#1D1D1D] hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-500 group-hover:text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 group-hover:text-white">Sign Out</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            </motion.div>
          )}

          {/* ── NOTIFICATIONS SECTION ── */}
          {activeSection === "notifications" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {[
                {
                  group: "Email Notifications",
                  items: [
                    { key: "email_offers",    label: "New creator applications",  desc: "When creators apply to your campaigns" },
                    { key: "email_campaigns", label: "Campaign updates",          desc: "Status changes for your campaigns" },
                    { key: "email_payments",  label: "Payment receipts",          desc: "Payment confirmations and invoices" },
                  ],
                },
                {
                  group: "Push Notifications",
                  items: [
                    { key: "push_offers",    label: "Creator activity",  desc: "Live updates from creators" },
                    { key: "push_campaigns", label: "Campaign alerts",   desc: "Real-time campaign notifications" },
                    { key: "push_payments",  label: "Payment alerts",    desc: "Instant payment notifications" },
                  ],
                },
              ].map((section) => (
                <div key={section.group} className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">{section.group}</h3>
                  <div className="space-y-4">
                    {section.items.map(item => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer">
                        <div className="flex-1 pr-4">
                          <p className="text-xs font-black uppercase tracking-tight">{item.label}</p>
                          <p className="text-[8px] text-gray-400 mt-0.5">{item.desc}</p>
                        </div>
                        <div
                          onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-[#389C9A]" : "bg-gray-200"
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-5" : "translate-x-0.5"
                          }`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── SECURITY SECTION ── */}
          {activeSection === "security" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest">Change Password</h3>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-10 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-10 pr-10 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[8px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Passwords don't match
                    </p>
                  )}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changingPw || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </div>

              {/* Security tips */}
              <div className="bg-[#389C9A]/5 border border-[#389C9A]/20 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-[#389C9A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#389C9A]">Security Tips</p>
                  <p className="text-[8px] text-gray-600 leading-relaxed">
                    Use a strong password with uppercase, lowercase, numbers and symbols. Never share your password with anyone.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── DANGER ZONE ── */}
          {activeSection === "danger" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600">Danger Zone</h3>
                </div>
                <p className="text-[9px] text-red-600/70 mb-6 leading-relaxed">
                  These actions are irreversible. Please be absolutely sure before proceeding.
                </p>

                <div className="space-y-3">
                  <div className="bg-white border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-black uppercase mb-1">Delete Account</p>
                    <p className="text-[8px] text-gray-500 mb-3">
                      Permanently delete your business account, all campaigns, and associated data.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SAVE BUTTON ── */}
          {(activeSection === "profile" || activeSection === "account") && (
            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] z-40"
                >
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors shadow-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
