import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, MapPin, Plus, X, Save, Upload, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

const PLATFORM_OPTIONS = ["Twitch", "YouTube", "Instagram", "TikTok", "Facebook", "Kick"];
const NICHE_OPTIONS = ["Gaming", "IRL", "Music", "Art", "Tech", "Sports", "Food", "Travel", "Fitness", "Comedy", "Education", "Beauty"];
const AVAILABILITY_OPTIONS = ["Available for campaigns", "Limited availability", "Not available"];

interface CreatorPlatform {
  id?: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count: number;
}

export function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    niche: [] as string[],
    avg_viewers: "",
    total_streams: "",
    rating: 0,
  });

  const [platforms, setPlatforms] = useState<CreatorPlatform[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nicheInput, setNicheInput] = useState("");

  // Load creator profile
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { 
        navigate("/login/creator"); 
        return; 
      }

      // Check if user is a business (redirect)
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (business) {
        navigate("/business/profile", { replace: true });
        return;
      }

      // Load creator profile from correct table
      const { data: creator, error } = await supabase
        .from("creator_profiles") // ✅ Fixed: correct table name
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile");
      }

      if (creator) {
        setCreatorId(creator.id);
        setForm({
          full_name: creator.full_name || "", // ✅ Fixed: full_name
          username: creator.username || "",
          bio: creator.bio || "",
          location: creator.location || "",
          avatar_url: creator.avatar_url || "", // ✅ Fixed: avatar_url
          niche: creator.niche || [], // ✅ Fixed: niche (singular)
          avg_viewers: creator.avg_viewers?.toString() || "",
          total_streams: creator.total_streams?.toString() || "",
          rating: creator.rating || 0,
        });

        // Load platforms from creator_platforms table
        const { data: platformData } = await supabase
          .from("creator_platforms")
          .select("*")
          .eq("creator_id", creator.id);

        if (platformData) {
          setPlatforms(platformData);
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, [navigate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (form.username.includes(" ")) e.username = "No spaces in username";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Update creator_profiles
    const { error: profileError } = await supabase
      .from("creator_profiles")
      .upsert({
        user_id: session.user.id,
        email: session.user.email,
        full_name: form.full_name, // ✅ Fixed: full_name
        username: form.username.toLowerCase(),
        bio: form.bio,
        location: form.location,
        avatar_url: form.avatar_url, // ✅ Fixed: avatar_url
        niche: form.niche, // ✅ Fixed: niche (singular)
        avg_viewers: parseInt(form.avg_viewers) || 0,
        total_streams: parseInt(form.total_streams) || 0,
        rating: form.rating,
        updated_at: new Date().toISOString(),
      }, 
      { onConflict: "user_id" }
    );

    if (profileError) {
      setErrors({ submit: profileError.message });
      toast.error("Failed to save profile");
    } else {
      // Save platforms
      if (creatorId) {
        // Delete existing platforms
        await supabase
          .from("creator_platforms")
          .delete()
          .eq("creator_id", creatorId);

        // Insert new platforms
        if (platforms.length > 0) {
          const { error: platformError } = await supabase
            .from("creator_platforms")
            .insert(
              platforms.map(p => ({
                creator_id: creatorId,
                platform_type: p.platform_type,
                username: p.username || "",
                profile_url: p.profile_url || "",
                followers_count: p.followers_count || 0,
              }))
            );

          if (platformError) {
            console.error("Error saving platforms:", platformError);
            toast.error("Profile saved but platforms failed to update");
          }
        }
      }

      setSaveSuccess(true);
      toast.success("Profile saved successfully!");
      setTimeout(() => { 
        setSaveSuccess(false); 
        navigate("/profile/me"); 
      }, 1200);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const ext = file.name.split(".").pop();
    const fileName = `avatar-${session.user.id}-${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
      toast.success("Avatar uploaded");
    } else {
      toast.error("Failed to upload avatar");
    }
    setUploadingAvatar(false);
  };

  const addPlatform = () => {
    setPlatforms([...platforms, {
      platform_type: "Twitch",
      username: "",
      profile_url: "",
      followers_count: 0
    }]);
  };

  const updatePlatform = (index: number, field: keyof CreatorPlatform, value: string | number) => {
    const updated = [...platforms];
    updated[index] = { ...updated[index], [field]: value };
    setPlatforms(updated);
  };

  const removePlatform = (index: number) => {
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const toggleNiche = (n: string) =>
    setForm((f) => ({ 
      ...f, 
      niche: f.niche.includes(n) 
        ? f.niche.filter((x) => x !== n) 
        : [...f.niche, n] 
    }));

  const addCustomNiche = () => {
    const trimmed = nicheInput.trim();
    if (trimmed && !form.niche.includes(trimmed)) {
      setForm((f) => ({ ...f, niche: [...f.niche, trimmed] }));
    }
    setNicheInput("");
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Edit Profile" backPath="/profile/me" />

      <main className="max-w-[480px] mx-auto w-full">
        <form onSubmit={handleSave} noValidate>

          {/* Creator badge */}
          <section className="px-6 pt-5 pb-4 border-b border-[#1D1D1D]/10">
            <div className="flex items-center gap-3 px-4 py-3 border-2 border-[#389C9A] bg-[#389C9A]/5 w-full">
              <Zap className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]">Creator Account</span>
            </div>
          </section>

          {/* Avatar */}
          <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="opacity-20 p-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] border-2 border-white flex items-center justify-center"
              >
                {uploadingAvatar ? 
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : 
                  <Upload className="w-3.5 h-3.5 text-white" />
                }
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload} 
              />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">Tap icon to change avatar</p>
          </section>

          {/* Basic Info */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
            <SectionLabel>Basic Info</SectionLabel>
            <Field label="Display Name" error={errors.full_name}>
              <input 
                value={form.full_name} 
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} 
                placeholder="Your Name" 
                className={inputCls(!!errors.full_name)} 
              />
            </Field>
            <Field label="Username" error={errors.username}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#1D1D1D]/30 italic">@</span>
                <input 
                  value={form.username} 
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} 
                  placeholder="yourhandle" 
                  className={`${inputCls(!!errors.username)} pl-7`} 
                />
              </div>
            </Field>
            <Field label="Bio">
              <textarea 
                value={form.bio} 
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} 
                placeholder="Tell brands about yourself..." 
                rows={3} 
                className={`${inputCls(false)} resize-none`} 
              />
              <p className="text-right text-[9px] text-[#1D1D1D]/30 mt-1">{form.bio.length}/500</p>
            </Field>
            <Field label="Location">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1D1D1D]/30" />
                <input 
                  value={form.location} 
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} 
                  placeholder="City, Country" 
                  className={`${inputCls(false)} pl-8`} 
                />
              </div>
            </Field>
          </section>

          {/* Platforms */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
            <SectionLabel>Connected Platforms</SectionLabel>
            
            {platforms.map((platform, index) => (
              <div key={index} className="border-2 border-[#1D1D1D]/10 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <select
                    value={platform.platform_type}
                    onChange={(e) => updatePlatform(index, "platform_type", e.target.value)}
                    className="border border-[#1D1D1D]/20 px-3 py-2 text-[10px] font-black uppercase"
                  >
                    {PLATFORM_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => removePlatform(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <input
                  value={platform.username}
                  onChange={(e) => updatePlatform(index, "username", e.target.value)}
                  placeholder="Username"
                  className="w-full border border-[#1D1D1D]/20 px-3 py-2 text-[10px]"
                />
                
                <input
                  value={platform.profile_url}
                  onChange={(e) => updatePlatform(index, "profile_url", e.target.value)}
                  placeholder="Profile URL"
                  className="w-full border border-[#1D1D1D]/20 px-3 py-2 text-[10px]"
                />
                
                <input
                  type="number"
                  value={platform.followers_count || ""}
                  onChange={(e) => updatePlatform(index, "followers_count", parseInt(e.target.value) || 0)}
                  placeholder="Followers"
                  className="w-full border border-[#1D1D1D]/20 px-3 py-2 text-[10px]"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addPlatform}
              className="w-full border-2 border-dashed border-[#1D1D1D]/20 py-4 text-[9px] font-black uppercase tracking-widest hover:border-[#389C9A] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Platform
            </button>
          </section>

          {/* Niches */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
            <SectionLabel>Content Niches</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map((n) => (
                <button 
                  key={n} 
                  type="button" 
                  onClick={() => toggleNiche(n)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                    form.niche.includes(n) 
                      ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]" 
                      : "border-[#1D1D1D]/20 hover:border-[#FEDB71]/70"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2 mt-2">
              <input 
                value={nicheInput} 
                onChange={(e) => setNicheInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomNiche(); } }}
                placeholder="Add custom niche..."
                className="flex-1 border border-[#1D1D1D]/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider italic focus:outline-none focus:border-[#1D1D1D]" 
              />
              <button 
                type="button" 
                onClick={addCustomNiche} 
                className="px-3 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase italic"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {form.niche.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.niche.map((n) => (
                  <span key={n} className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[9px] font-bold uppercase italic">
                    {n}
                    <button type="button" onClick={() => toggleNiche(n)}>
                      <X className="w-2.5 h-2.5 text-[#1D1D1D]/40 hover:text-[#1D1D1D]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Stats */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
            <SectionLabel>Channel Stats</SectionLabel>
            <p className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase italic -mt-2">Brands use these to evaluate partnerships</p>
            
            <Field label="Avg. Concurrent Viewers">
              <input 
                type="number" 
                value={form.avg_viewers} 
                onChange={(e) => setForm((f) => ({ ...f, avg_viewers: e.target.value }))} 
                placeholder="e.g. 1500" 
                className={inputCls(false)} 
              />
            </Field>
            
            <Field label="Total Streams">
              <input 
                type="number" 
                value={form.total_streams} 
                onChange={(e) => setForm((f) => ({ ...f, total_streams: e.target.value }))} 
                placeholder="e.g. 200" 
                className={inputCls(false)} 
              />
            </Field>
          </section>

          {/* Submit */}
          <div className="px-6 py-8 space-y-3">
            {errors.submit && (
              <p className="text-[9px] font-bold uppercase italic text-red-500 border border-red-200 bg-red-50 px-4 py-3">{errors.submit}</p>
            )}
            
            <AnimatePresence>
              {saveSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-[#389C9A]/10 border border-[#389C9A]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                  <span className="text-[9px] font-black uppercase tracking-widest italic text-[#389C9A]">Profile saved!</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              type="submit" 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#1D1D1D] text-white py-4 text-[11px] font-black uppercase tracking-widest italic hover:bg-[#389C9A] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
            
            <button 
              type="button" 
              onClick={() => navigate("/profile/me")}
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>
      </main>
      <BottomNav />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 italic mb-3">{children}</p>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">{label}</label>
      {children}
      {error && <p className="text-[9px] text-red-500 font-bold uppercase italic">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border ${hasError ? "border-red-400" : "border-[#1D1D1D]/20 focus:border-[#1D1D1D]"} px-3 py-2.5 text-[11px] font-bold italic focus:outline-none bg-white transition-colors`;
}
