import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
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
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Users,
  Eye,
  X,
  ArrowRight,
  Info,
  LogIn,
  Upload,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useAuth } from "../lib/contexts/AuthContext";

const PLATFORMS = ["Twitch", "YouTube", "TikTok", "Instagram", "Twitter", "Facebook", "Kick", "Rumble"];
const NICHES = ["Gaming", "Beauty", "Fashion", "Fitness", "Tech", "Comedy", "Music", "Education", "Travel", "Food", "Sports", "Business"];
const TOTAL_STEPS = 4;

export function BecomeCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: user?.email || "",
    phone: "",
    location: "",
    bio: "",
    platforms: [] as string[],
    niches: [] as string[],
    followers: "",
    avgViewers: "",
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    website: "",
    agreeToTerms: false,
  });

  const update = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const togglePlatform = (p: string) =>
    update("platforms", formData.platforms.includes(p)
      ? formData.platforms.filter(x => x !== p)
      : [...formData.platforms, p]);

  const toggleNiche = (n: string) =>
    update("niches", formData.niches.includes(n)
      ? formData.niches.filter(x => x !== n)
      : [...formData.niches, n]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be less than 2MB"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => { setAvatarFile(null); setAvatarPreview(null); };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `creator-avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1: return formData.fullName.trim() && formData.username.trim();
      case 2: return formData.platforms.length > 0 && formData.niches.length > 0;
      case 3: return true;
      case 4: return formData.agreeToTerms;
      default: return true;
    }
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!user) { navigate("/login/portal"); return; }
    if (!formData.fullName || !formData.username) { toast.error("Please fill in all required fields"); return; }
    setLoading(true);
    try {
      const avatarUrl = await uploadAvatar();
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

      const { error: profileError } = await supabase.from("creator_profiles").insert(creatorProfileData);
      if (profileError) throw profileError;

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

      const { error: legacyError } = await supabase.from("creators").insert(legacyCreatorData);
      if (legacyError) console.error("Error inserting into legacy creators table:", legacyError);

      await supabase.auth.updateUser({
        data: { user_type: 'creator', full_name: formData.fullName, avatar_url: avatarUrl }
      });

      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error creating creator profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Profile", "Niches", "Socials", "Review"];

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-6 text-sm leading-relaxed italic">
            Thanks for applying to join LiveLink as a creator. Your profile is under review.
          </p>
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 italic">What happens next:</p>
            <ul className="space-y-3">
              {[
                "Our team reviews your creator profile (usually within 48 hours)",
                `You'll receive an email at ${formData.email} once approved`,
                "Login to access your dashboard and start receiving brand offers"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#389C9A] font-black">{i + 1}.</span>
                  <span className="text-xs">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login/portal")}
              className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all italic flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Go to Login Portal
            </button>
            <Link to="/" className="w-full border-2 border-[#1D1D1D] text-[#1D1D1D] px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all italic text-center block">
              Return to Homepage
            </Link>
          </div>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest mt-6">Questions? Contact creators@livelink.com</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">

      {/* Header */}
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 italic">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Become a Creator on LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Join our marketplace and connect with brands looking to sponsor live creators like you. Complete your profile and our team will review your application within 48 hours.
        </p>
        <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All creator accounts are manually reviewed before going live. You will be notified by email once your application has been assessed.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-0 z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4">
        {stepLabels.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                step === s ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                  : step > s ? 'bg-[#389C9A] text-white border-[#389C9A]'
                  : 'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'
              }`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {step === s && <span className="text-[10px] font-black uppercase tracking-widest italic">{label}</span>}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {uploadError && (
        <div className="px-8 mt-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">{uploadError}</p>
          </motion.div>
        </div>
      )}

      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Creator Profile</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us who you are. This is how brands will find and identify you.</p>

              {/* Avatar */}
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40 block mb-3">Profile Photo</label>
                {!avatarFile ? (
                  <div className="border-2 border-dashed border-[#1D1D1D]/20 p-10 flex flex-col items-center gap-4 bg-[#F8F8F8] group hover:border-[#1D1D1D] cursor-pointer transition-all">
                    <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <label htmlFor="avatar-upload" className="cursor-pointer text-center w-full">
                      <div className="p-5 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all inline-block mb-3">
                        <Upload className="w-7 h-7 text-[#389C9A] group-hover:text-[#FEDB71]" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Upload Profile Photo</p>
                      <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest italic">JPG or PNG, min 400×400px, max 2MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-[#389C9A] p-6 bg-[#F8F8F8] flex items-center gap-5">
                    <img src={avatarPreview!} alt="Avatar preview" className="w-20 h-20 object-cover border-2 border-[#1D1D1D]" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase mb-1">{avatarFile.name}</p>
                      <p className="text-[8px] opacity-40 uppercase">{(avatarFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={removeAvatar} className="p-3 bg-red-50 text-red-500 border border-red-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.fullName} onChange={e => update("fullName", e.target.value)}
                    placeholder="Your real name"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Username <span className="text-red-500">*</span></label>
                  <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                    <span className="px-4 text-[#1D1D1D]/40 font-black text-sm">@</span>
                    <input type="text" value={formData.username} onChange={e => update("username", e.target.value.replace(/\s/g, ''))}
                      placeholder="yourcreatorname"
                      className="flex-1 py-5 pr-5 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Email Address</label>
                  <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 opacity-60">
                    <Mail className="w-4 h-4 ml-4 flex-shrink-0 text-[#1D1D1D]/40" />
                    <input type="email" value={formData.email} disabled
                      className="flex-1 py-5 px-4 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic" />
                  </div>
                  <p className="text-[9px] font-medium opacity-40 italic">Pulled from your account. Cannot be changed here.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Phone (Optional)</label>
                    <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                      <Phone className="w-4 h-4 ml-4 flex-shrink-0 text-[#1D1D1D]/40" />
                      <input type="tel" value={formData.phone} onChange={e => update("phone", e.target.value)}
                        placeholder="+234 123 456 7890"
                        className="flex-1 py-5 px-4 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Location (Optional)</label>
                    <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                      <MapPin className="w-4 h-4 ml-4 flex-shrink-0 text-[#1D1D1D]/40" />
                      <input type="text" value={formData.location} onChange={e => update("location", e.target.value)}
                        placeholder="City, Country"
                        className="flex-1 py-5 px-4 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Bio (Optional)</label>
                  <textarea value={formData.bio} onChange={e => update("bio", e.target.value)}
                    placeholder="Tell brands and viewers what you're about..."
                    rows={4}
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] transition-all resize-none italic" />
                  <p className="text-right text-[8px] font-bold opacity-30 italic">MAX 200 WORDS</p>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* STEP 2: Platforms & Niches */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Platforms & Niches</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us where you create and what topics you cover so brands can find the right match.</p>

              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">Platforms You Stream / Post On <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p} onClick={() => togglePlatform(p)}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest italic border-2 transition-all ${
                          formData.platforms.includes(p) ? "bg-[#389C9A] border-[#389C9A] text-white" : "border-[#1D1D1D]/10 bg-white hover:border-[#389C9A]"
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  {formData.platforms.length === 0 && <p className="text-[9px] font-black uppercase text-[#1D1D1D]/30 italic">Select at least one platform</p>}
                </div>

                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">Content Niches <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map(n => (
                      <button key={n} onClick={() => toggleNiche(n)}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest italic border-2 transition-all ${
                          formData.niches.includes(n) ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]" : "border-[#1D1D1D]/10 bg-white hover:border-[#FEDB71]"
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {formData.niches.length === 0 && <p className="text-[9px] font-black uppercase text-[#1D1D1D]/30 italic">Select at least one niche</p>}
                </div>

                <div className="flex flex-col gap-4 pt-8 border-t-2 border-[#1D1D1D]/10">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Channel Stats (Optional)</label>
                  <p className="text-[9px] font-medium opacity-40 italic -mt-2">Providing stats helps brands understand your reach.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                      <Users className="w-4 h-4 ml-4 flex-shrink-0 text-[#1D1D1D]/40" />
                      <input type="number" value={formData.followers} onChange={e => update("followers", e.target.value)}
                        placeholder="Total Followers"
                        className="flex-1 py-5 px-4 text-sm font-bold bg-transparent outline-none italic uppercase" />
                    </div>
                    <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                      <Eye className="w-4 h-4 ml-4 flex-shrink-0 text-[#1D1D1D]/40" />
                      <input type="number" value={formData.avgViewers} onChange={e => update("avgViewers", e.target.value)}
                        placeholder="Avg. Concurrent Viewers"
                        className="flex-1 py-5 px-4 text-sm font-bold bg-transparent outline-none italic uppercase" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* STEP 3: Social Links */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Social Links</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Add your handles so brands can verify your presence. All fields are optional.</p>

              <div className="flex flex-col gap-6">
                {([
                  { label: "Instagram", field: "instagram", icon: <Instagram className="w-4 h-4 text-pink-500" />, placeholder: "@yourhandle" },
                  { label: "Twitter / X", field: "twitter", icon: <Twitter className="w-4 h-4 text-blue-400" />, placeholder: "@yourhandle" },
                  { label: "YouTube", field: "youtube", icon: <Youtube className="w-4 h-4 text-red-500" />, placeholder: "@channel or URL" },
                  { label: "TikTok", field: "tiktok", icon: <Video className="w-4 h-4 text-[#1D1D1D]" />, placeholder: "@yourhandle" },
                  { label: "Website", field: "website", icon: <Globe className="w-4 h-4 text-[#389C9A]" />, placeholder: "https://yoursite.com" },
                ] as const).map(({ label, field, icon, placeholder }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">{label}</label>
                    <div className="flex items-center bg-[#F8F8F8] border border-[#1D1D1D]/10 focus-within:border-[#1D1D1D] transition-all">
                      <span className="ml-4 flex-shrink-0">{icon}</span>
                      <input type="text" value={(formData as any)[field]} onChange={e => update(field, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 py-5 px-4 text-sm font-bold uppercase tracking-tight bg-transparent outline-none italic" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <div className="mb-12">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => update("agreeToTerms", !formData.agreeToTerms)}
                    className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                      formData.agreeToTerms ? 'bg-[#389C9A] border-[#389C9A]' : 'border-[#1D1D1D] bg-white'
                    }`}
                  >
                    {formData.agreeToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                    I agree to LiveLink's Terms of Service and Privacy Policy. I confirm that the information I have provided is accurate and up to date. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Review Your Application</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Check everything looks correct before submitting for review.</p>

              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 flex flex-col gap-5">
                <div className="flex items-center gap-5 pb-5 border-b border-[#1D1D1D]/10">
                  <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden bg-white flex-shrink-0">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 opacity-20" /></div>
                    }
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase italic">{formData.fullName || "—"}</p>
                    <p className="text-[10px] opacity-40">@{formData.username || "—"}</p>
                  </div>
                </div>

                {[
                  { label: "Location", value: formData.location || "Not specified" },
                  { label: "Phone", value: formData.phone || "Not specified" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">{label}</span>
                    <span className="text-[10px] font-black uppercase">{value}</span>
                  </div>
                ))}

                {formData.platforms.length > 0 && (
                  <div className="border-b border-[#1D1D1D]/10 pb-4">
                    <p className="text-[9px] opacity-40 uppercase font-bold mb-2 italic">Platforms</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.platforms.map(p => <span key={p} className="px-2 py-1 bg-[#389C9A] text-white text-[8px] font-black uppercase">{p}</span>)}
                    </div>
                  </div>
                )}

                {formData.niches.length > 0 && (
                  <div className="border-b border-[#1D1D1D]/10 pb-4">
                    <p className="text-[9px] opacity-40 uppercase font-bold mb-2 italic">Niches</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.niches.map(n => <span key={n} className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase">{n}</span>)}
                    </div>
                  </div>
                )}

                {(formData.followers || formData.avgViewers) && (
                  <div className="flex gap-6">
                    {formData.followers && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-[#389C9A]" />
                        <span className="text-[10px] font-bold italic">{parseInt(formData.followers).toLocaleString()} followers</span>
                      </div>
                    )}
                    {formData.avgViewers && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-3 h-3 text-[#389C9A]" />
                        <span className="text-[10px] font-bold italic">{parseInt(formData.avgViewers).toLocaleString()} avg viewers</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        )}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-[#1D1D1D] z-50">
        <div className="flex gap-4 max-w-[600px] mx-auto">
          {step > 1 && (
            <button onClick={prevStep} disabled={loading}
              className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all italic disabled:opacity-50">
              Back
            </button>
          )}
          <button
            onClick={step === TOTAL_STEPS ? handleSubmit : nextStep}
            disabled={!validateStep() || loading}
            className={`flex-1 flex items-center justify-between p-6 font-black uppercase tracking-tight transition-all italic ${
              validateStep() && !loading ? 'bg-[#1D1D1D] text-white active:scale-[0.98]' : 'bg-[#1D1D1D]/30 text-white/50 cursor-not-allowed'
            }`}
          >
            <span>{loading ? 'Submitting...' : step === TOTAL_STEPS ? 'Submit Application' : 'Continue'}</span>
            {!loading && step < TOTAL_STEPS && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          </button>
        </div>
        {!validateStep() && step < TOTAL_STEPS && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center max-w-[600px] mx-auto">
            {step === 1 ? "Please enter your full name and username to continue"
              : step === 2 ? "Please select at least one platform and one niche"
              : "Please fill in all required fields before continuing"}
          </p>
        )}
        {step === TOTAL_STEPS && !formData.agreeToTerms && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center max-w-[600px] mx-auto">
            You must agree to the terms to submit
          </p>
        )}
      </div>
    </div>

      </div>

      {/* Fixed Footer Nav */}
        );
}
