import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Mail, HelpCircle, FileText, Shield, User, Globe,
  Twitch, Youtube, Instagram, Twitter, Facebook,
  Plus, X, CheckCircle2, AlertCircle, Loader2, LogOut,
  Bell, DollarSign, Users, Star, Award, ArrowLeft,
  MapPin, Phone, AtSign, Briefcase, Building2, Camera,
  Save, Eye, EyeOff, ChevronRight, Lock, Pause, Trash2,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/ImageWithFallback";

// ─────────────────────────────────────────────
// CONSTANTS (unchanged)
// ─────────────────────────────────────────────

const NICHE_OPTIONS = [
  "Gaming","Tech Reviews","Lifestyle","Fashion","Beauty",
  "Fitness","Food & Cooking","Travel","Music","Education",
  "Business","Sports","Comedy","Art & Design","DIY & Crafts",
];

const PLATFORM_OPTIONS = [
  "Twitch","YouTube","Instagram","Twitter","Facebook","TikTok","Kick","Rumble",
];

const INDUSTRY_OPTIONS = [
  "Food & Drink","Health & Fitness","Beauty & Cosmetics","Fashion & Clothing",
  "Technology","Gaming","Entertainment","Sports","Travel","Education",
  "Finance","Real Estate","Automotive","Retail","Marketing & Advertising","Other",
];

// ─────────────────────────────────────────────
// HELPERS (unchanged)
// ─────────────────────────────────────────────

function getPlatformIcon(name: string) {
  const cls = "w-5 h-5 text-[#389C9A]";
  switch (name.toLowerCase()) {
    case "twitch":    return <Twitch    className={cls} />;
    case "youtube":   return <Youtube   className={cls} />;
    case "instagram": return <Instagram className={cls} />;
    case "twitter":   return <Twitter   className={cls} />;
    case "facebook":  return <Facebook  className={cls} />;
    default: return <Globe className={cls} />;
  }
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#389C9A]" : "bg-gray-200"}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60 mb-1 italic">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl text-sm";
const iconInputCls = "w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl text-sm";

// ─────────────────────────────────────────────
// SHARED: Account + Notifications + Status + Support (unchanged)
// ─────────────────────────────────────────────

function AccountSection({ user }: { user: any }) {
  // ... (unchanged)
}

function NotificationsSection({
  notifs, setNotifs, isCreator,
}: {
  notifs: any; setNotifs: (v: any) => void; isCreator: boolean;
}) {
  // ... (unchanged)
}

function AccountStatusSection({
  status, isCreator,
}: { status: string; isCreator: boolean }) {
  // ... (unchanged)
}

function SupportSection({ navigate }: { navigate: (p: string) => void }) {
  // ... (unchanged)
}

// ─────────────────────────────────────────────
// MAIN SETTINGS COMPONENT
// ─────────────────────────────────────────────

export function Settings() {
  const navigate       = useNavigate();
  const { user, logout } = useAuth();

  const [userType, setUserType]     = useState<"creator" | "business" | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  // Avatar / Logo
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creator state
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorId, setCreatorId]           = useState<string | null>(null);
  const [creatorForm, setCreatorForm]       = useState({
    full_name: "", username: "", phone_number: "", location: "", bio: "", niche: [] as string[],
    payment_method: "",   // "Bank Transfer" or "PayPal"
    payment_account: "",  // bank account number or PayPal email
  });
  const [platforms, setPlatforms]           = useState<any[]>([]);
  const [editingPlatforms, setEditingPlatforms] = useState(false);

  // Business state
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [businessId, setBusinessId]           = useState<string | null>(null);
  const [businessForm, setBusinessForm]       = useState({
    business_name: "", full_name: "", phone_number: "",
    website: "", description: "", industry: "", country: "", city: "",
  });

  // Notifications
  const [notifs, setNotifs] = useState({
    campaigns: true, messages: true, payments: true, announcements: false,
  });

  // ─── NEW: Stats computed from campaign data ────────────────────────────────
  const [creatorStats, setCreatorStats] = useState({
    totalStreams: 0,
    avgViewers: 0,
  });

  // ─── Detect user type (unchanged) ─────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const detect = async () => {
      try {
        const meta = user.user_metadata || {};
        if (meta.user_type === "business" || meta.role === "business") {
          setUserType("business");
          await fetchBusinessProfile();
          setLoading(false);
          return;
        }

        const { data: creator } = await supabase
          .from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (creator) {
          setUserType("creator");
          await fetchCreatorProfile();
          await fetchCreatorStats(creator.id); // <-- NEW
          setLoading(false);
          return;
        }

        const { data: biz } = await supabase
          .from("businesses").select("id").eq("user_id", user.id).maybeSingle();
        if (biz) {
          setUserType("business");
          await fetchBusinessProfile();
          setLoading(false);
          return;
        }

        toast.error("No profile found");
        navigate("/login/portal");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load settings");
        setLoading(false);
      }
    };

    detect();
  }, [user]);

  // ─── Fetch creator profile (unchanged) ─────────────────────────────────────
  const fetchCreatorProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("creator_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) return;
    setCreatorProfile(data);
    setCreatorId(data.id);
    setCreatorForm({
      full_name:    data.full_name    || "",
      username:     data.username     || "",
      phone_number: data.phone_number || "",
      location:     data.location     || "",
      bio:          data.bio          || "",
      niche:        data.niche        || [],
      payment_method: data.payment_method || "",
      payment_account: data.payment_account || "",
    });
    const { data: plats } = await supabase.from("creator_platforms").select("*").eq("creator_id", data.id);
    if (plats) setPlatforms(plats);
  };

  // ─── NEW: Fetch total streams and average viewers from campaign data ───────
  const fetchCreatorStats = async (cid: string) => {
    try {
      // 1. Total completed streams across all campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaign_creators")
        .select("streams_completed, status")
        .eq("creator_id", cid)
        .in("status", ["active", "completed"]); // only count active/completed campaigns

      if (campaignsError) throw campaignsError;
      const totalStreams = (campaignsData || []).reduce((sum, cc) => sum + (cc.streams_completed || 0), 0);

      // 2. Average viewers – if you have viewer counts in stream_proofs, you can average them.
      //    For now we'll keep the value from the profile (or 0) until you add that feature.
      //    If you want to use an average of viewer counts, you would query stream_proofs with a viewer_count column.
      //    Example (if viewer_count column exists):
      //    const { data: proofs } = await supabase
      //      .from("stream_proofs")
      //      .select("viewer_count")
      //      .eq("campaign_creator_id", ...)
      //      .not("viewer_count", "is", null);
      //    const avgViewers = proofs.reduce((s, p) => s + p.viewer_count, 0) / (proofs.length || 1);
      const avgViewers = creatorProfile?.avg_viewers || 0; // fallback

      setCreatorStats({ totalStreams, avgViewers });
    } catch (error) {
      console.error("Error fetching creator stats:", error);
    }
  };

  // ─── Fetch business profile (unchanged) ────────────────────────────────────
  const fetchBusinessProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) return;
    setBusinessProfile(data);
    setBusinessId(data.id);
    setBusinessForm({
      business_name: data.business_name || "",
      full_name:     data.full_name     || "",
      phone_number:  data.phone_number  || "",
      website:       data.website       || "",
      description:   data.description   || "",
      industry:      data.industry      || "",
      country:       data.country       || "",
      city:          data.city          || "",
    });
  };

  // ─── Avatar upload (unchanged) ─────────────────────────────────────────────
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (unchanged)
  };

  const uploadAvatar = async (): Promise<string | null> => {
    // ... (unchanged)
  };

  // ─── Platform management (unchanged) ───────────────────────────────────────
  const handleSavePlatforms = async () => {
    // ... (unchanged)
  };

  // ─── Save all (including payment details) ──────────────────────────────────
  const handleSaveAll = async () => {
    // ... (unchanged, same as earlier)
  };

  const handleLogout = async () => {
    // ... (unchanged)
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Settings" userType="creator" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentAvatar = userType === "creator"
    ? avatarPreview || creatorProfile?.avatar_url
    : avatarPreview || businessProfile?.logo_url;

  const accountStatus = userType === "creator"
    ? creatorProfile?.status
    : businessProfile?.application_status || businessProfile?.status;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      <AppHeader showBack title={userType === "business" ? "Business Settings" : "Creator Settings"}
        userType={userType || "creator"} />

      <div className="px-4 py-6 pb-32 space-y-10">
        {/* Avatar (unchanged) */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className={`w-24 h-24 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] ${
              userType === "business" ? "rounded-xl" : "rounded-full"}`}>
              {currentAvatar
                ? <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
                : userType === "business"
                  ? <Building2 className="w-10 h-10 text-gray-300 m-auto mt-6" />
                  : <User className="w-10 h-10 text-gray-300 m-auto mt-6" />
              }
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#389C9A] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#2d7f7d] transition-colors">
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>
          <p className="text-[9px] text-[#1D1D1D]/40">
            {userType === "business" ? "Tap to change your business logo" : "Tap to change your avatar"}
          </p>
        </div>

        {/* Creator Profile Fields (unchanged) */}
        {userType === "creator" && (
          <div className="space-y-5">
            <SectionTitle>Profile</SectionTitle>
            <Field label="Full Name">
              <input type="text" value={creatorForm.full_name}
                onChange={e => setCreatorForm({ ...creatorForm, full_name: e.target.value })}
                className={inputCls} />
            </Field>
            {/* ... other fields: username, phone, location, bio, niches, payment details (unchanged) ... */}
          </div>
        )}

        {/* ── CREATOR STATS (read-only) – now using real data ── */}
        {userType === "creator" && (
          <div>
            <SectionTitle>Channel Stats</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users,  value: creatorStats.avgViewers.toLocaleString(), label: "Avg Viewers" },
                { icon: Award,  value: creatorStats.totalStreams.toLocaleString(), label: "Streams" },
                { icon: Star,   value: creatorProfile?.rating || "—",             label: "Rating" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F8F8F8] p-4 rounded-xl text-center">
                  <s.icon className="w-5 h-5 text-[#389C9A] mx-auto mb-2" />
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[8px] text-gray-400 text-center mt-2">
              Total streams completed across all campaigns. Average viewers are based on your stream stats (if available).
            </p>
          </div>
        )}

        {/* Business Profile Fields (unchanged) */}
        {userType === "business" && (
          <div className="space-y-5">
            <SectionTitle>Business Profile</SectionTitle>
            {/* ... unchanged ... */}
          </div>
        )}

        {/* Shared sections (unchanged) */}
        <AccountSection user={user} />
        <NotificationsSection notifs={notifs} setNotifs={setNotifs} isCreator={userType === "creator"} />
        <AccountStatusSection status={accountStatus} isCreator={userType === "creator"} />
        <SupportSection navigate={navigate} />

        {/* Footer (unchanged) */}
        <div className="text-center space-y-2 pt-4 pb-4">
          <p className="text-[9px] text-[#1D1D1D]/40">LiveLink v1.0.0</p>
          <p className="text-[9px] text-[#1D1D1D]/60">
            Logged in as {user?.email} ·{" "}
            <button onClick={handleLogout} className="text-[#389C9A] font-bold hover:underline">
              Log out
            </button>
          </p>
        </div>
      </div>

      {/* Sticky Save Button (unchanged) */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t-2 border-[#1D1D1D]/10 z-40 max-w-md mx-auto">
        <button onClick={handleSaveAll} disabled={saving}
          className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            : <><Save className="w-5 h-5 text-[#FEDB71]" /> Save All Changes</>}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
