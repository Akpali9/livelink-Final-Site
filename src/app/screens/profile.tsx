import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, MapPin, Plus, X, Save, Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

const PLATFORM_OPTIONS = ["Twitch", "YouTube", "Instagram", "TikTok", "Facebook", "Kick"];
const NICHE_OPTIONS = ["Gaming", "IRL", "Music", "Art", "Tech", "Sports", "Food", "Travel", "Fitness", "Comedy", "Education", "Beauty"];
const AVAILABILITY_OPTIONS = ["Available for campaigns", "Limited availability", "Not available"];

export function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    location: "",
    availability: "Available for campaigns",
    avatar: "",
    platforms: [] as string[],
    niches: [] as string[],
    verified: false,
    stats: {
      avgViewers: "",
      followers: "",
      totalStreams: "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nicheInput, setNicheInput] = useState("");

  // Load current user's creator profile
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error.message);
      }

      if (data) {
        setCreatorId(data.id);
        setForm({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          location: data.location || "",
          availability: data.availability || "Available for campaigns",
          avatar: data.avatar || "",
          platforms: data.platforms?.map((p: any) => (typeof p === "string" ? p : p.name)) || [],
          niches: data.niches || [],
          verified: data.verified || false,
          stats: {
            avgViewers: data.stats?.avgViewers || "",
            followers: data.stats?.followers || "",
            totalStreams: data.stats?.totalStreams || "",
          },
        });
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (form.username.includes(" ")) e.username = "No spaces in username";
    if (form.platforms.length === 0) e.platforms = "Select at least one platform";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      user_id: session.user.id,
      name: form.name,
      username: form.username.toLowerCase(),
      bio: form.bio,
      location: form.location,
      availability: form.availability,
      avatar: form.avatar,
      platforms: form.platforms.map((p) => ({ name: p })),
      niches: form.niches,
      verified: form.verified,
      stats: form.stats,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (creatorId) {
      ({ error } = await supabase.from("creators").update(payload).eq("id", creatorId));
    } else {
      ({ error } = await supabase.from("creators").insert(payload));
    }

    if (error) {
      console.error("Save error:", error.message);
      setErrors({ submit: error.message });
    } else {
      setSaveSuccess(true);
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

    const ext = file.name.split(".").pop();
    const fileName = `avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((f) => ({ ...f, avatar: data.publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  };

  const toggleNiche = (n: string) => {
    setForm((f) => ({
      ...f,
      niches: f.niches.includes(n) ? f.niches.filter((x) => x !== n) : [...f.niches, n],
    }));
  };

  const addCustomNiche = () => {
    const trimmed = nicheInput.trim();
    if (trimmed && !form.niches.includes(trimmed)) {
      setForm((f) => ({ ...f, niches: [...f.niches, trimmed] }));
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

          {/* ── Avatar ─────────────────────────────────────── */}
          <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
                {form.avatar ? (
                  <img src={form.avatar} alt="avatar" className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="opacity-20 p-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] border-2 border-white flex items-center justify-center"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">
              Tap icon to change avatar
            </p>
          </section>

          {/* ── Basic Info ─────────────────────────────────── */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
            <SectionLabel>Basic Info</SectionLabel>

            <Field label="Display Name" error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your Name"
                className={inputCls(!!errors.name)}
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

          {/* ── Availability ───────────────────────────────── */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
            <SectionLabel>Availability</SectionLabel>
            <div className="flex flex-col gap-2">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, availability: opt }))}
                  className={`flex items-center gap-3 px-4 py-3 border text-[10px] font-black uppercase tracking-widest italic transition-colors text-left ${
                    form.availability === opt
                      ? "border-[#1D1D1D] bg-[#1D1D1D] text-white"
                      : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]/50"
                  }`}
                >
                  <span className={`w-2 h-2 flex-shrink-0 ${
                    opt === "Available for campaigns" ? "bg-[#389C9A]" : opt === "Limited availability" ? "bg-[#FEDB71]" : "bg-[#1D1D1D]/20"
                  }`} />
                  {opt}
                </button>
              ))}
            </div>
          </section>

          {/* ── Platforms ──────────────────────────────────── */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
            <SectionLabel>Platforms</SectionLabel>
            {errors.platforms && <p className="text-[9px] text-red-500 font-bold uppercase italic">{errors.platforms}</p>}
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                    form.platforms.includes(p)
                      ? "bg-[#389C9A] border-[#389C9A] text-white"
                      : "border-[#1D1D1D]/20 hover:border-[#389C9A]/50 hover:text-[#389C9A]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* ── Niches ─────────────────────────────────────── */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
            <SectionLabel>Content Niches</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNiche(n)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                    form.niches.includes(n)
                      ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]"
                      : "border-[#1D1D1D]/20 hover:border-[#FEDB71]/70"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Custom niche input */}
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

            {/* Selected niches (with remove) */}
            {form.niches.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.niches.map((n) => (
                  <span
                    key={n}
                    className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[9px] font-bold uppercase italic"
                  >
                    {n}
                    <button type="button" onClick={() => toggleNiche(n)}>
                      <X className="w-2.5 h-2.5 text-[#1D1D1D]/40 hover:text-[#1D1D1D]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── Stats ──────────────────────────────────────── */}
          <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
            <SectionLabel>Channel Stats</SectionLabel>
            <p className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase italic -mt-2">Brands use these to evaluate partnerships</p>

            <Field label="Avg. Concurrent Viewers">
              <input
                type="number"
                value={form.stats.avgViewers}
                onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, avgViewers: e.target.value } }))}
                placeholder="e.g. 1500"
                className={inputCls(false)}
              />
            </Field>

            <Field label="Total Followers / Subscribers">
              <input
                type="number"
                value={form.stats.followers}
                onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, followers: e.target.value } }))}
                placeholder="e.g. 25000"
                className={inputCls(false)}
              />
            </Field>

            <Field label="Total Streams / Videos">
              <input
                type="number"
                value={form.stats.totalStreams}
                onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, totalStreams: e.target.value } }))}
                placeholder="e.g. 200"
                className={inputCls(false)}
              />
            </Field>
          </section>

          {/* ── Submit ─────────────────────────────────────── */}
          <div className="px-6 py-8 space-y-3">
            {errors.submit && (
              <p className="text-[9px] font-bold uppercase italic text-red-500 border border-red-200 bg-red-50 px-4 py-3">
                {errors.submit}
              </p>
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
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

/* ── Helpers ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 italic mb-3">{children}</p>
  );
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
