import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MapPin, Plus, X, Save, Upload, Loader2, Zap, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

const PLATFORM_OPTIONS = ["Twitch", "YouTube", "Instagram", "TikTok", "Facebook", "Kick"];
const NICHE_OPTIONS = ["Gaming", "IRL", "Music", "Art", "Tech", "Sports", "Food", "Travel", "Fitness", "Comedy", "Education", "Beauty"];
const AVAILABILITY_OPTIONS = ["Available for campaigns", "Limited availability", "Not available"];
const INDUSTRY_OPTIONS = ["Gaming", "Tech", "Fashion", "Beauty", "Food & Bev", "Fitness", "Finance", "Entertainment", "Health", "Travel", "Education", "Retail"];
const BUDGET_OPTIONS = ["Under $500", "$500–$2K", "$2K–$10K", "$10K–$50K", "$50K+"];
const CAMPAIGN_TYPE_OPTIONS = ["Sponsored Stream", "Product Review", "Brand Ambassador", "Giveaway", "Affiliate", "Social Post", "Video Integration"];

export function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileType, setProfileType] = useState<"creator" | "business" | null>(null);

  // ── Creator state ──────────────────────────────────────────
  const [form, setForm] = useState({
    name: "", username: "", bio: "", location: "",
    availability: "Available for campaigns", avatar: "",
    platforms: [] as string[], niches: [] as string[],
    verified: false,
    stats: { avgViewers: "", followers: "", totalStreams: "" },
  });

  // ── Business state ─────────────────────────────────────────
  const [bizForm, setBizForm] = useState({
    companyName: "", contactName: "", website: "", bio: "",
    location: "", logo: "", industries: [] as string[],
    campaignTypes: [] as string[], budgetRange: "", verified: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nicheInput, setNicheInput] = useState("");

  // ── Load: detect which table this user belongs to ──────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }

      const [{ data: business }, { data: creator }] = await Promise.all([
        supabase.from("businesses").select("*").eq("user_id", session.user.id).single(),
        supabase.from("creators").select("*").eq("user_id", session.user.id).single(),
      ]);

      if (business) {
        setProfileType("business");
        setBizForm({
          companyName: business.company_name || "",
          contactName: business.contact_name || "",
          website: business.website || "",
          bio: business.bio || "",
          location: business.location || "",
          logo: business.logo || "",
          industries: business.industries || [],
          campaignTypes: business.campaign_types || [],
          budgetRange: business.budget_range || "",
          verified: business.verified || false,
        });
      } else if (creator && creator.name) {
        setProfileType("creator");
        setForm({
          name: creator.name || "",
          username: creator.username || "",
          bio: creator.bio || "",
          location: creator.location || "",
          availability: creator.availability || "Available for campaigns",
          avatar: creator.avatar || "",
          platforms: creator.platforms?.map((p: any) => (typeof p === "string" ? p : p.name)) || [],
          niches: creator.niches || [],
          verified: creator.verified || false,
          stats: {
            avgViewers: creator.stats?.avgViewers || "",
            followers: creator.stats?.followers || "",
            totalStreams: creator.stats?.totalStreams || "",
          },
        });
      } else {
        // No profile yet — default to creator
        setProfileType("creator");
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  // ── Validate ───────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (profileType === "creator") {
      if (!form.name.trim()) e.name = "Name is required";
      if (!form.username.trim()) e.username = "Username is required";
      if (form.username.includes(" ")) e.username = "No spaces in username";
      if (form.platforms.length === 0) e.platforms = "Select at least one platform";
    } else {
      if (!bizForm.companyName.trim()) e.companyName = "Company name is required";
      if (!bizForm.contactName.trim()) e.contactName = "Contact name is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let error: any = null;

    if (profileType === "creator") {
      const payload = {
        user_id: session.user.id,
        email: session.user.email,
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
      ({ error } = await supabase.from("creators").upsert(payload, { onConflict: "user_id" }));
    } else {
      const payload = {
        user_id: session.user.id,
        email: session.user.email,
        company_name: bizForm.companyName,
        contact_name: bizForm.contactName,
        website: bizForm.website,
        bio: bizForm.bio,
        location: bizForm.location,
        logo: bizForm.logo,
        industries: bizForm.industries,
        campaign_types: bizForm.campaignTypes,
        budget_range: bizForm.budgetRange,
        verified: bizForm.verified,
        updated_at: new Date().toISOString(),
      };
      ({ error } = await supabase.from("businesses").upsert(payload, { onConflict: "user_id" }));
    }

    if (error) {
      setErrors({ submit: error.message });
    } else {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        navigate(profileType === "business" ? "/business/profile" : "/profile/me");
      }, 1200);
    }
    setSaving(false);
  };

  // ── Image upload ───────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const bucket = profileType === "business" ? "logos" : "avatars";
    const fileName = `${profileType}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const url = data.publicUrl;
      if (profileType === "creator") setForm((f) => ({ ...f, avatar: url }));
      else setBizForm((f) => ({ ...f, logo: url }));
    }
    setUploadingAvatar(false);
  };

  const togglePlatform = (p: string) =>
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  const toggleNiche = (n: string) =>
    setForm((f) => ({ ...f, niches: f.niches.includes(n) ? f.niches.filter((x) => x !== n) : [...f.niches, n] }));
  const addCustomNiche = () => {
    const trimmed = nicheInput.trim();
    if (trimmed && !form.niches.includes(trimmed)) setForm((f) => ({ ...f, niches: [...f.niches, trimmed] }));
    setNicheInput("");
  };
  const toggleIndustry = (i: string) =>
    setBizForm((f) => ({ ...f, industries: f.industries.includes(i) ? f.industries.filter((x) => x !== i) : [...f.industries, i] }));
  const toggleCampaignType = (c: string) =>
    setBizForm((f) => ({ ...f, campaignTypes: f.campaignTypes.includes(c) ? f.campaignTypes.filter((x) => x !== c) : [...f.campaignTypes, c] }));

  const currentImage = profileType === "business" ? bizForm.logo : form.avatar;
  const isBusiness = profileType === "business";
  const backPath = isBusiness ? "/business/profile" : "/profile/me";

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Edit Profile" backPath={backPath} />

      <main className="max-w-[480px] mx-auto w-full">
        <form onSubmit={handleSave} noValidate>

          {/* ── Profile type badge (read-only) ─────────────── */}
          <section className="px-6 pt-5 pb-4 border-b border-[#1D1D1D]/10">
            <div className={`flex items-center gap-3 px-4 py-3 border-2 w-full ${isBusiness ? "border-[#FEDB71] bg-[#FEDB71]/10" : "border-[#389C9A] bg-[#389C9A]/5"}`}>
              {isBusiness
                ? <Briefcase className="w-4 h-4 text-[#D4A800]" />
                : <Zap className="w-4 h-4 text-[#389C9A]" />
              }
              <span className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]">
                {isBusiness ? "Business Account" : "Creator Account"}
              </span>
            </div>
          </section>

          {/* ── Avatar / Logo ──────────────────────────────── */}
          <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
                {currentImage ? (
                  <img src={currentImage} alt="profile" className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="opacity-20 p-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      {isBusiness
                        ? <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" /></>
                        : <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>
                      }
                    </svg>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`absolute -bottom-2 -right-2 w-8 h-8 border-2 border-white flex items-center justify-center ${isBusiness ? "bg-[#D4A800]" : "bg-[#389C9A]"}`}
              >
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">
              {isBusiness ? "Tap to upload company logo" : "Tap icon to change avatar"}
            </p>
          </section>

          {/* ════ CREATOR FIELDS ════ */}
          {!isBusiness && (
            <>
              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
                <SectionLabel accent="teal">Basic Info</SectionLabel>
                <Field label="Display Name" error={errors.name}>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your Name" className={inputCls(!!errors.name)} />
                </Field>
                <Field label="Username" error={errors.username}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#1D1D1D]/30 italic">@</span>
                    <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="yourhandle" className={`${inputCls(!!errors.username)} pl-7`} />
                  </div>
                </Field>
                <Field label="Bio">
                  <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell brands about yourself..." rows={3} className={`${inputCls(false)} resize-none`} />
                  <p className="text-right text-[9px] text-[#1D1D1D]/30 mt-1">{form.bio.length}/500</p>
                </Field>
                <Field label="Location">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1D1D1D]/30" />
                    <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, Country" className={`${inputCls(false)} pl-8`} />
                  </div>
                </Field>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="teal">Availability</SectionLabel>
                <div className="flex flex-col gap-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, availability: opt }))}
                      className={`flex items-center gap-3 px-4 py-3 border text-[10px] font-black uppercase tracking-widest italic transition-colors text-left ${form.availability === opt ? "border-[#1D1D1D] bg-[#1D1D1D] text-white" : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]/50"}`}>
                      <span className={`w-2 h-2 flex-shrink-0 ${opt === "Available for campaigns" ? "bg-[#389C9A]" : opt === "Limited availability" ? "bg-[#FEDB71]" : "bg-[#1D1D1D]/20"}`} />
                      {opt}
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="teal">Platforms</SectionLabel>
                {errors.platforms && <p className="text-[9px] text-red-500 font-bold uppercase italic">{errors.platforms}</p>}
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${form.platforms.includes(p) ? "bg-[#389C9A] border-[#389C9A] text-white" : "border-[#1D1D1D]/20 hover:border-[#389C9A]/50 hover:text-[#389C9A]"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="teal">Content Niches</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map((n) => (
                    <button key={n} type="button" onClick={() => toggleNiche(n)}
                      className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${form.niches.includes(n) ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]" : "border-[#1D1D1D]/20 hover:border-[#FEDB71]/70"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={nicheInput} onChange={(e) => setNicheInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomNiche(); } }}
                    placeholder="Add custom niche..."
                    className="flex-1 border border-[#1D1D1D]/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider italic focus:outline-none focus:border-[#1D1D1D]" />
                  <button type="button" onClick={addCustomNiche} className="px-3 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase italic">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {form.niches.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.niches.map((n) => (
                      <span key={n} className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[9px] font-bold uppercase italic">
                        {n}
                        <button type="button" onClick={() => toggleNiche(n)}><X className="w-2.5 h-2.5 text-[#1D1D1D]/40 hover:text-[#1D1D1D]" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
                <SectionLabel accent="teal">Channel Stats</SectionLabel>
                <p className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase italic -mt-2">Brands use these to evaluate partnerships</p>
                <Field label="Avg. Concurrent Viewers">
                  <input type="number" value={form.stats.avgViewers} onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, avgViewers: e.target.value } }))} placeholder="e.g. 1500" className={inputCls(false)} />
                </Field>
                <Field label="Total Followers / Subscribers">
                  <input type="number" value={form.stats.followers} onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, followers: e.target.value } }))} placeholder="e.g. 25000" className={inputCls(false)} />
                </Field>
                <Field label="Total Streams / Videos">
                  <input type="number" value={form.stats.totalStreams} onChange={(e) => setForm((f) => ({ ...f, stats: { ...f.stats, totalStreams: e.target.value } }))} placeholder="e.g. 200" className={inputCls(false)} />
                </Field>
              </section>
            </>
          )}

          {/* ════ BUSINESS FIELDS ════ */}
          {isBusiness && (
            <>
              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-4">
                <SectionLabel accent="yellow">Company Info</SectionLabel>
                <Field label="Company Name" error={errors.companyName}>
                  <input value={bizForm.companyName} onChange={(e) => setBizForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Acme Inc." className={inputCls(!!errors.companyName)} />
                </Field>
                <Field label="Contact Name" error={errors.contactName}>
                  <input value={bizForm.contactName} onChange={(e) => setBizForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Jane Smith" className={inputCls(!!errors.contactName)} />
                </Field>
                <Field label="Website">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#1D1D1D]/30 italic">https://</span>
                    <input value={bizForm.website} onChange={(e) => setBizForm((f) => ({ ...f, website: e.target.value }))} placeholder="yourcompany.com" className={`${inputCls(false)} pl-16`} />
                  </div>
                </Field>
                <Field label="About Your Brand">
                  <textarea value={bizForm.bio} onChange={(e) => setBizForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell creators what your brand is about..." rows={3} className={`${inputCls(false)} resize-none`} />
                  <p className="text-right text-[9px] text-[#1D1D1D]/30 mt-1">{bizForm.bio.length}/500</p>
                </Field>
                <Field label="Location">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1D1D1D]/30" />
                    <input value={bizForm.location} onChange={(e) => setBizForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, Country" className={`${inputCls(false)} pl-8`} />
                  </div>
                </Field>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="yellow">Industry</SectionLabel>
                <p className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase italic -mt-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map((i) => (
                    <button key={i} type="button" onClick={() => toggleIndustry(i)}
                      className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${bizForm.industries.includes(i) ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]" : "border-[#1D1D1D]/20 hover:border-[#FEDB71]/70"}`}>
                      {i}
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="yellow">Campaign Types</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_TYPE_OPTIONS.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCampaignType(c)}
                      className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${bizForm.campaignTypes.includes(c) ? "bg-[#1D1D1D] border-[#1D1D1D] text-white" : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]/50"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-6 py-6 border-b border-[#1D1D1D]/10 space-y-3">
                <SectionLabel accent="yellow">Campaign Budget Range</SectionLabel>
                <p className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase italic -mt-2">Per creator / per campaign</p>
                <div className="flex flex-col gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setBizForm((f) => ({ ...f, budgetRange: opt }))}
                      className={`flex items-center justify-between px-4 py-3 border text-[10px] font-black uppercase tracking-widest italic transition-colors ${bizForm.budgetRange === opt ? "border-[#FEDB71] bg-[#FEDB71]/20 text-[#1D1D1D]" : "border-[#1D1D1D]/20 hover:border-[#FEDB71]/60"}`}>
                      {opt}
                      {bizForm.budgetRange === opt && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A800]" />}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── Submit ─────────────────────────────────────── */}
          <div className="px-6 py-8 space-y-3">
            {errors.submit && (
              <p className="text-[9px] font-bold uppercase italic text-red-500 border border-red-200 bg-red-50 px-4 py-3">{errors.submit}</p>
            )}
            <AnimatePresence>
              {saveSuccess && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 px-4 py-3 border ${isBusiness ? "bg-[#FEDB71]/20 border-[#D4A800]" : "bg-[#389C9A]/10 border-[#389C9A]"}`}>
                  <CheckCircle2 className={`w-4 h-4 ${isBusiness ? "text-[#D4A800]" : "text-[#389C9A]"}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest italic ${isBusiness ? "text-[#D4A800]" : "text-[#389C9A]"}`}>Profile saved!</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button type="submit" disabled={saving}
              className={`w-full flex items-center justify-center gap-2 text-white py-4 text-[11px] font-black uppercase tracking-widest italic transition-colors disabled:opacity-50 ${isBusiness ? "bg-[#1D1D1D] hover:bg-[#D4A800]" : "bg-[#1D1D1D] hover:bg-[#389C9A]"}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button type="button" onClick={() => navigate(backPath)}
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors">
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

function SectionLabel({ children, accent }: { children: React.ReactNode; accent: "teal" | "yellow" }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-1 h-3 ${accent === "teal" ? "bg-[#389C9A]" : "bg-[#FEDB71]"}`} />
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 italic">{children}</p>
    </div>
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
