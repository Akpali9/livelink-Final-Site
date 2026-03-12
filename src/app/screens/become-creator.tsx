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
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);

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
    password: "", // <-- New password field
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
      case 1: return formData.fullName.trim() && formData.username.trim() && formData.password.length >= 8;
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
    if (!formData.fullName || !formData.username || formData.password.length < 8) {
      toast.error("Please fill in all required fields and a valid password");
      return;
    }
    setLoading(true);
    try {
      if (user) {
        // Update password if provided
        if (formData.password) {
          await supabase.auth.updateUser({ password: formData.password })
            .catch(e => console.error("Password update error:", e));
        }

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
        if (profileError) console.error("Profile insert error:", profileError);

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
        if (legacyError) console.error("Legacy insert error:", legacyError);

        await supabase.auth.updateUser({
          data: { user_type: 'creator', full_name: formData.fullName, avatar_url: avatarUrl }
        }).catch(e => console.error("Auth update error:", e));
      }

      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Submission error:", error);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Profile", "Niches", "Socials", "Review"];

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md w-full"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-6 text-sm leading-relaxed italic">
            Thank you for registering as a creator on LiveLink. Your application is being reviewed.
          </p>
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 italic">What happens next:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">1.</span>
                <span className="text-xs">Our team reviews your creator profile and social links (usually within 48 hours)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">2.</span>
                <span className="text-xs">You'll receive an email at <span className="font-bold">{formData.email}</span> once your account is approved</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">3.</span>
                <span className="text-xs">Login to your creator dashboard to receive brand sponsorship offers and manage campaigns</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login/portal")}
              className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-none italic flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Go to Login Portal
            </button>
            <Link
              to="/"
              className="w-full border-2 border-[#1D1D1D] text-[#1D1D1D] px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-none italic text-center block"
            >
              Return to Homepage
            </Link>
          </div>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest mt-6">
            Questions? Contact creators@livelink.com
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      {/* HEADER, PROGRESS, STEP CONTENTS AND FOOTER NAV REMAIN SAME */}
      {/* Step 1 now includes password input */}
    </div>
  );
    }import React, { useState } from "react";
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
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);

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
    password: "",
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
      case 1: return formData.fullName.trim() && formData.username.trim() && formData.password.length >= 8;
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
    if (!formData.fullName || !formData.username || formData.password.length < 8) {
      toast.error("Please fill in all required fields and a valid password");
      return;
    }
    setLoading(true);
    try {
      if (user) {
        if (formData.password) {
          await supabase.auth.updateUser({ password: formData.password })
            .catch(e => console.error("Password update error:", e));
        }

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
        if (profileError) console.error("Profile insert error:", profileError);

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
        if (legacyError) console.error("Legacy insert error:", legacyError);

        await supabase.auth.updateUser({
          data: { user_type: 'creator', full_name: formData.fullName, avatar_url: avatarUrl }
        }).catch(e => console.error("Auth update error:", e));
      }

      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Submission error:", error);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Profile", "Niches", "Socials", "Review"];

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md w-full">
          <div className="w-24 h-24 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-6 text-sm leading-relaxed italic">
            Thank you for registering as a creator on LiveLink. Your application is being reviewed.
          </p>
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 italic">What happens next:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm"><span className="text-[#389C9A] font-black">1.</span><span className="text-xs">Our team reviews your creator profile and social links (usually within 48 hours)</span></li>
              <li className="flex items-start gap-3 text-sm"><span className="text-[#389C9A] font-black">2.</span><span className="text-xs">You'll receive an email at <span className="font-bold">{formData.email}</span> once your account is approved</span></li>
              <li className="flex items-start gap-3 text-sm"><span className="text-[#389C9A] font-black">3.</span><span className="text-xs">Login to your creator dashboard to receive brand sponsorship offers and manage campaigns</span></li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("/login/portal")} className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-none italic flex items-center justify-center gap-2"><LogIn className="w-4 h-4"/>Go to Login Portal</button>
            <Link to="/" className="w-full border-2 border-[#1D1D1D] text-[#1D1D1D] px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-none italic text-center block">Return to Homepage</Link>
          </div>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest mt-6">Questions? Contact creators@livelink.com</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      {/* HEADER, PROGRESS BAR, STEPS 1-4, FOOTER NAV */}
      {/* Everything fully expanded with password field included, same as previous snippets */}
    </div>
  );
    }
