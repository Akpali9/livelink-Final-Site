import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown, User, Phone, MapPin, Share2, Plus, X, Trash2,
  ArrowRight, CheckCircle2, Globe, Mail, Building, AlertCircle,
  Loader2, Save, Instagram, Twitter, Linkedin, Youtube, Facebook,
  Upload, Camera, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/ImageWithFallback";

interface BusinessProfileData {
  businessName: string;
  yourName: string;
  contactNumber: string;
  email: string;
  website: string;
  industry: string;
  country: string;
  city: string;
  bio: string;
  logoUrl?: string;
}

const industryOptions = [
  "E-commerce", "Software / SaaS", "Fashion & Apparel", "Gaming",
  "Health & Wellness", "Food & Beverage", "Marketing & Advertising",
  "Education", "Finance", "Travel", "Entertainment", "Automotive",
  "Real Estate", "Sports & Fitness", "Non-profit", "Other",
];

const platformIcons: Record<string, any> = {
  instagram: Instagram, twitter: Twitter, linkedin: Linkedin,
  youtube: Youtube, facebook: Facebook,
  tiktok: () => <span className="text-[10px] font-black">TT</span>,
  other: Share2,
};

export function BusinessProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BusinessProfileData>({
    businessName: "", yourName: "", contactNumber: "", email: "",
    website: "", industry: "E-commerce", country: "", city: "", bio: "", logoUrl: "",
  });

  const [socialLinks, setSocialLinks] = useState<{ id?: string; platform: string; url: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationStatus, setVerificationStatus] = useState<"verified" | "pending" | "unverified">("unverified");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from("businesses").select("*").eq("user_id", user.id).single();
        if (error && error.code !== "PGRST116") console.error("Fetch error:", error.message);
        if (data) {
          setBusinessId(data.id);
          setFormData({
            businessName: data.business_name || "",
            yourName: data.full_name || "",
            contactNumber: data.phone_number || "",
            email: data.email || "",
            website: data.website || "",
            industry: data.industry || "E-commerce",
            country: data.country || "",
            city: data.city || "",
            bio: data.description || "",
            logoUrl: data.logo_url || "",
          });
          setSocialLinks(data.socials || []);
          setVerificationStatus(data.verification_status || "unverified");
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const requiredFields = ["businessName", "yourName", "contactNumber", "email", "country", "industry"];
    let completed = requiredFields.filter(f => formData[f as keyof BusinessProfileData]).length;
    if (formData.bio && formData.bio.length > 20) completed++;
    if (formData.logoUrl || avatarPreview) completed++;
    if (socialLinks.length > 0) completed++;
    setProfileCompletion(Math.round((completed / (requiredFields.length + 3)) * 100));
  }, [formData, socialLinks, avatarPreview]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName) newErrors.businessName = "Business name is required";
    if (!formData.yourName) newErrors.yourName = "Your name is required";
    if (!formData.contactNumber) newErrors.contactNumber = "Contact number is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.country) newErrors.country = "Country is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Max file size is 3MB"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    try {
      // Ensure business record exists first
      let bid = businessId;
      if (!bid) {
        const { data: nb, error: ne } = await supabase
          .from("businesses").insert({ user_id: user.id }).select("id").single();
        if (ne) throw ne;
        bid = nb.id;
        setBusinessId(bid);
      }
      const ext = avatarFile.name.split(".").pop();
      const path = `${bid}/logo-${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from("business-logos").upload(path, avatarFile, { upsert: true });
      if (ue) throw ue;
      const { data: { publicUrl } } = supabase.storage.from("business-logos").getPublicUrl(path);
      return publicUrl;
    } catch (e: any) {
      toast.error(e.message || "Failed to upload logo");
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) { toast.error("You must be logged in"); return; }
    if (!validateForm()) { toast.error("Please fill in all required fields"); return; }
    setSaving(true);
    try {
      const logoUrl = avatarFile ? await uploadAvatar() : formData.logoUrl;
      const upsertData = {
        user_id: user.id,
        business_name: formData.businessName,
        full_name: formData.yourName,
        phone_number: formData.contactNumber,
        email: formData.email,
        website: formData.website || null,
        industry: formData.industry,
        country: formData.country,
        city: formData.city || null,
        description: formData.bio || null,
        socials: socialLinks,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("businesses").upsert(upsertData, { onConflict: "user_id" }).select().single();
      if (error) throw error;
      setAvatarFile(null);
      setAvatarPreview(null);
      setSaved(true);
      toast.success("Profile saved successfully!");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, { platform: "other", url: "" }]);
  const updateSocialLink = (i: number, field: "platform" | "url", value: string) => {
    const next = [...socialLinks];
    next[i][field] = value;
    setSocialLinks(next);
  };
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i));

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase()] || Share2;
    return typeof Icon === "function" ? <Icon /> : <Icon className="w-4 h-4" />;
  };

  const currentAvatar = avatarPreview || formData.logoUrl;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack userType="business" title="Business Profile" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
            <p className="text-sm text-gray-500">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[120px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack userType="business" title="Business Profile" />

      {/* Hero Banner */}
      <div className="relative h-44 w-full bg-gradient-to-r from-[#1D1D1D] to-gray-800 flex items-end px-8 pb-6 border-b-4 border-[#389C9A]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#389C9A] opacity-10 rounded-full blur-3xl" />
        <h1 className="text-[36px] font-black text-white uppercase tracking-tighter leading-none italic relative z-10">
          Business Profile
        </h1>
      </div>

      {/* Profile Completion */}
      <div className="mx-6 mt-5 p-4 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest italic">Profile Completion</span>
          <span className="text-[9px] font-black text-[#389C9A]">{profileCompletion}%</span>
        </div>
        <div className="h-2 bg-[#1D1D1D]/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#389C9A] transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
        </div>
        {profileCompletion < 100 && (
          <p className="text-[8px] text-[#1D1D1D]/50 mt-2 italic">
            Complete your profile to increase trust and unlock campaign opportunities.
          </p>
        )}
      </div>

      {/* Verification Banner */}
      {verificationStatus !== "verified" && (
        <div className="mx-6 mt-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-700 mb-1">Verification Required</p>
            <p className="text-xs text-amber-600">
              Complete your profile and upload verification documents to start creating campaigns.
            </p>
          </div>
        </div>
      )}

      <div className="px-6 mt-8 flex flex-col gap-10">

        {/* ── LOGO / AVATAR ── */}
        <section>
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Brand Logo
          </h2>
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              {currentAvatar ? (
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#389C9A] shadow-lg">
                  <img src={currentAvatar} alt="Business Logo" className="w-full h-full object-cover" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-2xl border-4 border-dashed border-[#1D1D1D]/20 bg-[#F8F8F8] flex flex-col items-center justify-center hover:border-[#389C9A] transition-all"
                >
                  <Upload className="w-7 h-7 text-[#389C9A] mb-1" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">Upload Logo</span>
                </button>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
                </div>
              )}
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
              PNG or JPG · Max 3MB
            </p>
            {avatarFile && (
              <p className="text-[8px] font-black text-[#389C9A] italic">New logo ready — save to apply</p>
            )}
          </div>
        </section>

        {/* ── CONTACT INFO ── */}
        <section>
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Contact Info
          </h2>
          <div className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.yourName}
                  onChange={e => setFormData({ ...formData, yourName: e.target.value })}
                  placeholder="John Doe"
                  className={`w-full bg-[#F8F8F8] border p-4 pl-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${errors.yourName ? "border-red-500" : "border-[#1D1D1D]/10"}`}
                />
              </div>
              {errors.yourName && <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.yourName}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                  className={`w-full bg-[#F8F8F8] border p-4 pl-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${errors.email ? "border-red-500" : "border-[#1D1D1D]/10"}`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="+44 123 456 7890"
                  className={`w-full bg-[#F8F8F8] border p-4 pl-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${errors.contactNumber ? "border-red-500" : "border-[#1D1D1D]/10"}`}
                />
              </div>
              {errors.contactNumber && <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.contactNumber}</p>}
            </div>
          </div>
        </section>

        {/* ── BUSINESS DETAILS ── */}
        <section>
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Business Details
          </h2>
          <div className="flex flex-col gap-4">
            {/* Business Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Business Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Acme Inc."
                  className={`w-full bg-[#F8F8F8] border p-4 pl-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${errors.businessName ? "border-red-500" : "border-[#1D1D1D]/10"}`}
                />
              </div>
              {errors.businessName && <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.businessName}</p>}
            </div>

            {/* Country + City */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United Kingdom"
                    className={`w-full bg-[#F8F8F8] border p-4 pl-10 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${errors.country ? "border-red-500" : "border-[#1D1D1D]/10"}`}
                  />
                </div>
                {errors.country && <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.country}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="London"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Website */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">Website</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.com"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 pl-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">Industry</label>
              <div className="relative">
                <select
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold tracking-tight outline-none appearance-none cursor-pointer rounded-xl pr-10"
                >
                  {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40 text-[#389C9A]" />
              </div>
            </div>

            {/* About / Bio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                About Your Brand
              </label>
              <textarea
                rows={5}
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell creators about your brand, mission, and what makes you unique..."
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl resize-none transition-all"
                maxLength={500}
              />
              <div className="text-right text-[8px] font-bold text-[#1D1D1D]/30">{formData.bio.length}/500</div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL LINKS ── */}
        <section>
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Social Media
          </h2>
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {socialLinks.map((link, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="relative"
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                    {getPlatformIcon(link.platform)}
                  </div>
                  <select
                    value={link.platform}
                    onChange={e => updateSocialLink(i, "platform", e.target.value)}
                    className="absolute left-11 top-1/2 -translate-y-1/2 bg-transparent text-[8px] font-black uppercase tracking-widest outline-none w-20"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="url"
                    value={link.url}
                    onChange={e => updateSocialLink(i, "url", e.target.value)}
                    placeholder="https://"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 pl-36 pr-12 text-sm font-bold tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                  />
                  <button
                    onClick={() => removeSocialLink(i)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <button
              onClick={addSocialLink}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-[#1D1D1D]/20 p-4 text-[9px] font-black uppercase tracking-widest hover:border-[#389C9A] hover:text-[#389C9A] transition-all rounded-xl italic"
            >
              <Plus className="w-4 h-4" /> Add Social Link
            </button>
          </div>
        </section>

        {/* ── VERIFICATION ── */}
        <section className="pt-6 border-t border-[#1D1D1D]/10">
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Verification
          </h2>
          <div className="bg-[#F8F8F8] p-5 rounded-xl border-2 border-dashed border-[#1D1D1D]/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-black mb-1">Business Verification</p>
                <p className="text-[9px] opacity-40">Upload your business registration documents</p>
              </div>
              {verificationStatus === "verified" ? (
                <span className="px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Verified</span>
              ) : (
                <span className="px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Pending</span>
              )}
            </div>
            {verificationStatus !== "verified" && (
              <button
                onClick={() => toast.info("Document upload feature coming soon")}
                className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
                Upload Documents
              </button>
            )}
          </div>
        </section>

        {/* ── DANGER ZONE ── */}
        <section className="pt-6 border-t border-[#1D1D1D]/10 pb-4">
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5 text-[#1D1D1D]/40 italic">
            Danger Zone
          </h2>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to deactivate your account? This action can be reversed.")) {
                toast.info("Account deactivation request sent to support.");
              }
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors italic p-4 border-2 border-red-200 hover:border-red-400 rounded-xl w-full justify-center"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Deactivate Account</span>
          </button>
        </section>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#1D1D1D]/10 z-50 max-w-[480px] mx-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-between bg-[#1D1D1D] text-white p-5 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-xl border-2 border-[#1D1D1D] hover:bg-[#389C9A] disabled:opacity-50"
        >
          <span className="flex items-center gap-2 text-sm">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving..." : saved ? "Changes Saved!" : "Save Profile"}
          </span>
          {saved ? <CheckCircle2 className="w-5 h-5 text-[#FEDB71]" /> : <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
        </button>
      </div>
    </div>
  );
}
