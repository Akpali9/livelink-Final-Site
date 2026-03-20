import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Mail, HelpCircle, FileText, Shield, User, Globe,
  Twitch, Youtube, Instagram, Twitter, Facebook,
  Plus, X, CheckCircle2, AlertCircle, Loader2, LogOut,
  Bell, DollarSign, Users, Star, Award, ArrowLeft,
  MapPin, Phone, AtSign, Briefcase, Building2, Camera,
  Save, Eye, EyeOff, ChevronRight, Lock, Pause, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/ImageWithFallback";

// ─────────────────────────────────────────────
// CONSTANTS
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
// HELPERS
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
// SHARED: Account + Notifications + Status + Support
// ─────────────────────────────────────────────

function AccountSection({ user }: { user: any }) {
  const [editEmail, setEditEmail]   = useState(false);
  const [newEmail, setNewEmail]     = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const [editPw, setEditPw]         = useState(false);
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);

  const handleEmailUpdate = async () => {
    if (newEmail !== confirmEmail) { toast.error("Emails don't match"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Check your inbox to confirm the new email");
      setEditEmail(false); setNewEmail(""); setConfirmEmail("");
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePwUpdate = async () => {
    if (newPw !== confirmPw)   { toast.error("Passwords don't match"); return; }
    if (newPw.length < 6)      { toast.error("Min. 6 characters"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated");
      setEditPw(false); setNewPw(""); setConfirmPw("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Account</SectionTitle>

      {/* Email */}
      <div className="border-b border-[#1D1D1D]/10 pb-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider italic">Email Address</p>
            <p className="text-sm text-[#1D1D1D]/60 mt-0.5">{user?.email}</p>
          </div>
          {!editEmail && (
            <button onClick={() => setEditEmail(true)}
              className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] hover:underline italic">
              Change
            </button>
          )}
        </div>
        <AnimatePresence>
          {editEmail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3 overflow-hidden">
              <Field label="New Email Address">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Confirm New Email">
                <input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex gap-2">
                <button onClick={handleEmailUpdate}
                  className="flex-1 py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#389C9A] transition-colors">
                  Update Email
                </button>
                <button onClick={() => setEditEmail(false)}
                  className="px-5 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:border-[#1D1D1D]">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Password */}
      <div className="border-b border-[#1D1D1D]/10 pb-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider italic">Password</p>
            <p className="text-sm text-[#1D1D1D]/60 mt-0.5 tracking-widest">••••••••</p>
          </div>
          {!editPw && (
            <button onClick={() => setEditPw(true)}
              className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] hover:underline italic">
              Change
            </button>
          )}
        </div>
        <AnimatePresence>
          {editPw && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3 overflow-hidden">
              <Field label="New Password">
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 6 characters" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="flex gap-1 mt-2">
                    <div className={`h-1 flex-1 rounded-full ${newPw.length >= 6 ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                    <div className={`h-1 flex-1 rounded-full ${/[A-Z]/.test(newPw) ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                    <div className={`h-1 flex-1 rounded-full ${/[0-9]/.test(newPw) ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                  </div>
                )}
              </Field>
              <Field label="Confirm New Password">
                <input type={showPw ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex gap-2">
                <button onClick={handlePwUpdate}
                  className="flex-1 py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:bg-[#389C9A] transition-colors">
                  Update Password
                </button>
                <button onClick={() => setEditPw(false)}
                  className="px-5 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider italic rounded-xl hover:border-[#1D1D1D]">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NotificationsSection({
  notifs, setNotifs, isCreator,
}: {
  notifs: any; setNotifs: (v: any) => void; isCreator: boolean;
}) {
  const creatorItems = [
    { key: "campaigns", label: "New campaign offers" },
    { key: "messages",  label: "Messages" },
    { key: "payments",  label: "Payment alerts" },
    { key: "announcements", label: "Platform announcements" },
  ];
  const bizItems = [
    { key: "campaigns", label: "Creator accepts/declines campaign" },
    { key: "messages",  label: "New message from a creator" },
    { key: "payments",  label: "Payment & payout alerts" },
    { key: "announcements", label: "Platform announcements" },
  ];
  const items = isCreator ? creatorItems : bizItems;

  return (
    <div className="space-y-4">
      <SectionTitle>Notifications</SectionTitle>
      {items.map(item => (
        <div key={item.key} className="flex items-center justify-between py-2">
          <span className="text-sm font-bold">{item.label}</span>
          <Toggle value={notifs[item.key]} onChange={v => setNotifs({ ...notifs, [item.key]: v })} />
        </div>
      ))}
    </div>
  );
}

function AccountStatusSection({
  status, isCreator,
}: { status: string; isCreator: boolean }) {
  const [showPause, setShowPause]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const statusColor =
    status === "active"         ? "bg-green-100 text-green-700" :
    status === "pending_review" ? "bg-yellow-100 text-yellow-700" :
    status === "rejected"       ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700";

  const statusMsg =
    status === "active"         ? "Your account is active and visible." :
    status === "pending_review" ? "Your application is under review." :
    status === "rejected"       ? "Your application was rejected." :
                                  "Your account status is being processed.";

  return (
    <div className="space-y-6">
      <SectionTitle>Account Status</SectionTitle>

      <div className="bg-[#F8F8F8] p-5 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Status</span>
          <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${statusColor}`}>
            {status || "Unknown"}
          </span>
        </div>
        <p className="text-[9px] text-[#1D1D1D]/60">{statusMsg}</p>
      </div>

      <div>
        <h3 className="text-sm font-black mb-2">Pause Your Account</h3>
        <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
          Pausing hides your profile and stops new requests. Active campaigns are not affected.
        </p>
        <button onClick={() => setShowPause(true)}
          className="w-full py-3 border-2 border-[#D2691E] text-[#D2691E] text-[9px] font-black uppercase tracking-wider italic hover:bg-[#D2691E] hover:text-white transition-colors rounded-xl">
          Pause My Account
        </button>
      </div>

      <div>
        <h3 className="text-sm font-black mb-2">Delete Account</h3>
        <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
          Permanently deletes your account and all data. This cannot be undone.
        </p>
        <button onClick={() => setShowDelete(true)}
          className="w-full py-3 border-2 border-red-600 text-red-600 text-[9px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors rounded-xl">
          Request Account Deletion
        </button>
      </div>

      {/* Pause modal */}
      <AnimatePresence>
        {showPause && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPause(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50 rounded-xl">
              <h3 className="text-lg font-black uppercase tracking-tighter italic mb-3">Pause Your Account?</h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6">Your profile will be hidden. You can reactivate at any time from Settings.</p>
              <div className="space-y-2">
                <button onClick={() => { toast.info("Account paused"); setShowPause(false); }}
                  className="w-full py-3 bg-[#D2691E] text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-[#b2581a] transition-colors">
                  Yes, Pause Account
                </button>
                <button onClick={() => setShowPause(false)}
                  className="w-full py-3 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {showDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDelete(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50 rounded-xl">
              <h3 className="text-lg font-black uppercase tracking-tighter italic mb-3">Delete Your Account?</h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6">This is permanent and cannot be undone. All your data will be removed.</p>
              <div className="space-y-2">
                <button onClick={() => { toast.error("Contact support@livelink.com to request deletion."); setShowDelete(false); }}
                  className="w-full py-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-red-700 transition-colors">
                  Yes, Delete My Account
                </button>
                <button onClick={() => setShowDelete(false)}
                  className="w-full py-3 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SupportSection({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="space-y-3">
      <SectionTitle>Support</SectionTitle>
      {[
        { label: "Help Centre",      icon: HelpCircle, action: () => {} },
        { label: "Contact Support",  icon: Mail,       action: () => window.open("mailto:support@livelink.com") },
        { label: "Terms of Service", icon: FileText,   action: () => navigate("/terms") },
        { label: "Privacy Policy",   icon: Shield,     action: () => navigate("/privacy") },
      ].map((item, i) => (
        <button key={i} onClick={item.action}
          className="w-full flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors rounded-xl">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5 text-[#389C9A]" />
            <span className="text-sm font-bold">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-30" />
        </button>
      ))}
    </div>
  );
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

  // ── Avatar / Logo ──────────────────────────────────────────────────────────
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Creator state ──────────────────────────────────────────────────────────
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorId, setCreatorId]           = useState<string | null>(null);
  const [creatorForm, setCreatorForm]       = useState({
    full_name: "", username: "", phone_number: "", location: "", bio: "", niche: [] as string[],
  });
  const [platforms, setPlatforms]           = useState<any[]>([]);
  const [editingPlatforms, setEditingPlatforms] = useState(false);

  // ── Business state ─────────────────────────────────────────────────────────
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [businessId, setBusinessId]           = useState<string | null>(null);
  const [businessForm, setBusinessForm]       = useState({
    business_name: "", full_name: "", phone_number: "",
    website: "", description: "", industry: "", country: "", city: "",
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    campaigns: true, messages: true, payments: true, announcements: false,
  });

  // ── Detect user type ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const detect = async () => {
      try {
        // Check metadata first (faster)
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
    });
    const { data: plats } = await supabase.from("creator_platforms").select("*").eq("creator_id", data.id);
    if (plats) setPlatforms(plats);
  };

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

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 3 * 1024 * 1024)    { toast.error("Max 3MB"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    const ext  = avatarFile.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const bucket = userType === "business" ? "avatars" : "avatars";
    const { error } = await supabase.storage.from(bucket).upload(path, avatarFile, { upsert: true });
    if (error) { toast.error("Failed to upload image"); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  // ── Platform management ────────────────────────────────────────────────────
  const handleSavePlatforms = async () => {
    if (!creatorId) return;
    setSaving(true);
    try {
      for (const p of platforms) {
        if (p.id) {
          await supabase.from("creator_platforms").update({
            platform_type: p.platform_type, username: p.username,
            profile_url: p.profile_url, followers_count: p.followers_count || 0,
          }).eq("id", p.id);
        } else {
          await supabase.from("creator_platforms").insert({
            creator_id: creatorId, platform_type: p.platform_type,
            username: p.username, profile_url: p.profile_url,
            followers_count: p.followers_count || 0,
            created_at: new Date().toISOString(),
          });
        }
      }
      setEditingPlatforms(false);
      toast.success("Platforms saved");
    } catch { toast.error("Failed to save platforms"); }
    finally { setSaving(false); }
  };

  // ── Save all ───────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const avatarUrl = avatarFile ? await uploadAvatar() : null;

      if (userType === "creator" && creatorId) {
        const { error } = await supabase.from("creator_profiles").update({
          ...creatorForm,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", creatorId);
        if (error) throw error;
        toast.success("Creator profile saved!");
      } else if (userType === "business" && businessId) {
        const { error } = await supabase.from("businesses").update({
          ...businessForm,
          ...(avatarUrl ? { logo_url: avatarUrl } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", businessId);
        if (error) throw error;
        toast.success("Business profile saved!");
      } else {
        toast.error("No profile found to save");
      }

      await supabase.auth.updateUser({
        data: { notification_preferences: notifs },
      });

      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("All settings saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out");
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Settings" userType="creator" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  const currentAvatar = userType === "creator"
    ? avatarPreview || creatorProfile?.avatar_url
    : avatarPreview || businessProfile?.logo_url;

  const accountStatus = userType === "creator"
    ? creatorProfile?.status
    : businessProfile?.application_status || businessProfile?.status;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      <AppHeader showBack title={userType === "business" ? "Business Settings" : "Creator Settings"}
        userType={userType || "creator"} />

      <div className="px-4 py-6 pb-32 space-y-10">
        {/* ── AVATAR ──────────────────────────────────────────────────── */}
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

        {/* ── CREATOR PROFILE FIELDS ──────────────────────────────────── */}
        {userType === "creator" && (
          <div className="space-y-5">
            <SectionTitle>Profile</SectionTitle>

            <Field label="Full Name">
              <input type="text" value={creatorForm.full_name}
                onChange={e => setCreatorForm({ ...creatorForm, full_name: e.target.value })}
                className={inputCls} />
            </Field>

            <Field label="Username">
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input type="text" value={creatorForm.username}
                  onChange={e => setCreatorForm({ ...creatorForm, username: e.target.value })}
                  className={iconInputCls} />
              </div>
            </Field>

            <Field label="Phone Number">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input type="tel" value={creatorForm.phone_number}
                  onChange={e => setCreatorForm({ ...creatorForm, phone_number: e.target.value })}
                  className={iconInputCls} />
              </div>
            </Field>

            <Field label="Location">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input type="text" value={creatorForm.location} placeholder="City, Country"
                  onChange={e => setCreatorForm({ ...creatorForm, location: e.target.value })}
                  className={iconInputCls} />
              </div>
            </Field>

            <Field label="Bio">
              <textarea value={creatorForm.bio} rows={4} maxLength={200}
                onChange={e => setCreatorForm({ ...creatorForm, bio: e.target.value.slice(0, 200) })}
                className={`${inputCls} resize-none`} />
              <p className="text-right text-[9px] text-[#1D1D1D]/40 mt-1">{creatorForm.bio.length}/200</p>
            </Field>

            <Field label="Content Niches">
              <div className="flex flex-wrap gap-2 mb-3">
                {creatorForm.niche.map((n, i) => (
                  <span key={i} className="flex items-center gap-1 px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase rounded-full">
                    {n}
                    <button onClick={() => setCreatorForm({ ...creatorForm, niche: creatorForm.niche.filter((_, j) => j !== i) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.filter(n => !creatorForm.niche.includes(n)).slice(0, 10).map(n => (
                  <button key={n} onClick={() => {
                    if (creatorForm.niche.length >= 5) { toast.error("Max 5 niches"); return; }
                    setCreatorForm({ ...creatorForm, niche: [...creatorForm.niche, n] });
                  }}
                    className="px-3 py-1 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase rounded-full hover:border-[#389C9A] transition-colors">
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-[#1D1D1D]/40 mt-2">Select up to 5 niches</p>
            </Field>
          </div>
        )}

        {/* ── CREATOR PLATFORMS ───────────────────────────────────────── */}
        {userType === "creator" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Connected Platforms</SectionTitle>
              <button onClick={() => setEditingPlatforms(!editingPlatforms)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">
                {editingPlatforms ? "Done" : "Manage"}
              </button>
            </div>

            {!editingPlatforms ? (
              <div className="space-y-3">
                {platforms.length === 0
                  ? <p className="text-center text-[9px] text-[#1D1D1D]/40 py-8 border-2 border-dashed rounded-xl">No platforms connected yet</p>
                  : platforms.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-2 border-[#1D1D1D]/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(p.platform_type)}
                        <div>
                          <p className="font-black text-sm">{p.platform_type}</p>
                          <p className="text-[9px] text-[#1D1D1D]/40">@{p.username}</p>
                        </div>
                      </div>
                      {p.followers_count > 0 && (
                        <span className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                          {Number(p.followers_count).toLocaleString()} followers
                        </span>
                      )}
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="space-y-4">
                {platforms.map((p, i) => (
                  <div key={i} className="border-2 border-[#1D1D1D]/10 p-4 rounded-xl space-y-3">
                    <div className="flex gap-2">
                      <select value={p.platform_type}
                        onChange={e => {
                          const u = [...platforms]; u[i] = { ...u[i], platform_type: e.target.value };
                          setPlatforms(u);
                        }}
                        className="flex-1 px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-[9px] font-black uppercase bg-white">
                        {PLATFORM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <button onClick={async () => {
                        if (p.id) {
                          await supabase.from("creator_platforms").delete().eq("id", p.id);
                        }
                        setPlatforms(platforms.filter((_, j) => j !== i));
                      }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                      <input type="text" value={p.username} placeholder="username"
                        onChange={e => {
                          const u = [...platforms];
                          u[i] = { ...u[i], username: e.target.value, profile_url: `https://${u[i].platform_type.toLowerCase()}.com/${e.target.value}` };
                          setPlatforms(u);
                        }}
                        className="w-full pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm" />
                    </div>
                    <input type="number" value={p.followers_count || ""}
                      onChange={e => { const u = [...platforms]; u[i] = { ...u[i], followers_count: parseInt(e.target.value) || 0 }; setPlatforms(u); }}
                      placeholder="Followers count (optional)"
                      className="w-full px-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm" />
                  </div>
                ))}
                <button onClick={() => setPlatforms([...platforms, { platform_type: "Twitch", username: "", profile_url: "", followers_count: 0 }])}
                  className="w-full py-3 border-2 border-dashed border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-widest hover:border-[#389C9A] transition-colors rounded-xl">
                  + Add Platform
                </button>
                <button onClick={handleSavePlatforms} disabled={saving}
                  className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : "Save Platforms"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CREATOR STATS (read-only) ────────────────────────────────── */}
        {userType === "creator" && (
          <div>
            <SectionTitle>Channel Stats</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users,  value: creatorProfile?.avg_viewers?.toLocaleString() || "0", label: "Avg Viewers" },
                { icon: Award,  value: creatorProfile?.total_streams || "0",                 label: "Streams" },
                { icon: Star,   value: creatorProfile?.rating || "—",                        label: "Rating" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F8F8F8] p-4 rounded-xl text-center">
                  <s.icon className="w-5 h-5 text-[#389C9A] mx-auto mb-2" />
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BUSINESS PROFILE FIELDS ─────────────────────────────────── */}
        {userType === "business" && (
          <div className="space-y-5">
            <SectionTitle>Business Profile</SectionTitle>

            <Field label="Business Name">
              <input type="text" value={businessForm.business_name}
                onChange={e => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                className={inputCls} />
            </Field>

            <Field label="Contact Person">
              <input type="text" value={businessForm.full_name}
                onChange={e => setBusinessForm({ ...businessForm, full_name: e.target.value })}
                className={inputCls} />
            </Field>

            <Field label="Phone Number">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input type="tel" value={businessForm.phone_number}
                  onChange={e => setBusinessForm({ ...businessForm, phone_number: e.target.value })}
                  className={iconInputCls} />
              </div>
            </Field>

            <Field label="Website">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                <input type="url" value={businessForm.website} placeholder="https://example.com"
                  onChange={e => setBusinessForm({ ...businessForm, website: e.target.value })}
                  className={iconInputCls} />
              </div>
            </Field>

            <Field label="Industry">
              <select value={businessForm.industry}
                onChange={e => setBusinessForm({ ...businessForm, industry: e.target.value })}
                className={`${inputCls} bg-white`}>
                <option value="">Select Industry</option>
                {INDUSTRY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Country">
                <input type="text" value={businessForm.country}
                  onChange={e => setBusinessForm({ ...businessForm, country: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="City">
                <input type="text" value={businessForm.city}
                  onChange={e => setBusinessForm({ ...businessForm, city: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <Field label="Business Description">
              <textarea value={businessForm.description} rows={4} maxLength={500}
                onChange={e => setBusinessForm({ ...businessForm, description: e.target.value.slice(0, 500) })}
                className={`${inputCls} resize-none`} />
              <p className="text-right text-[9px] text-[#1D1D1D]/40 mt-1">{businessForm.description.length}/500</p>
            </Field>
          </div>
        )}

        {/* ── SHARED SECTIONS ─────────────────────────────────────────── */}
        <AccountSection user={user} />
        <NotificationsSection notifs={notifs} setNotifs={setNotifs} isCreator={userType === "creator"} />
        <AccountStatusSection status={accountStatus} isCreator={userType === "creator"} />
        <SupportSection navigate={navigate} />

        {/* Footer */}
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

      {/* Sticky Save Button - positioned above bottom nav */}
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
