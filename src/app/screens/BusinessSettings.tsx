import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Building2, Mail, Phone, Globe, Briefcase, Camera, Save,
  LogOut, Bell, Eye, EyeOff, ChevronRight, CheckCircle,
  AlertCircle, Loader2, Trash2, Lock, User, FileText,
  Info, X, ShieldCheck, HelpCircle, MessageCircle, Scale,
  Pause, Pencil, Linkedin, Twitter, Instagram, Youtube,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const INDUSTRIES = [
  "Technology","Fashion & Beauty","Food & Beverage","Gaming",
  "Health & Fitness","Entertainment","Education","Finance",
  "Travel & Hospitality","Retail","Automotive","Sports",
  "Music","Art & Design","Media","Real Estate",
  "Marketing & Advertising","Other",
];

const NICHES = [
  "Gaming","Tech Reviews","Lifestyle","Fashion","Beauty",
  "Food","Travel","Fitness","Music","Comedy",
  "Education","Sports","Finance","Automotive","Parenting",
];

const GENDERS = ["All Genders","Male","Female","Non-binary"];

// ─────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-black uppercase tracking-widest opacity-40 px-1 pt-2">{children}</p>;
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-[#1D1D1D] rounded-xl overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-[#1D1D1D]/10 bg-[#F8F8F8]">
          <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
        </div>
      )}
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="py-3 border-b border-[#1D1D1D]/5 last:border-0">{children}</div>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row>
      <div className="flex items-center justify-between">
        <p className="text-sm">{label}</p>
        <button onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#389C9A]" : "bg-gray-200"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </Row>
  );
}

function InlineEdit({
  label, value, onSave, type = "text", multiline = false,
}: {
  label: string; value: string; onSave: (v: string) => void;
  type?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  return (
    <Row>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{label}</p>
        {!editing && (
          <button onClick={() => { setDraft(value); setEditing(true); }}
            className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {multiline
            ? <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} autoFocus
                className="w-full px-3 py-2 border-2 border-[#1D1D1D] outline-none rounded-xl text-sm resize-none" />
            : <input type={type} value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                className="w-full px-3 py-2 border-2 border-[#1D1D1D] outline-none rounded-xl text-sm" />
          }
          <div className="flex gap-2">
            <button onClick={() => { onSave(draft); setEditing(false); }}
              className="flex-1 bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors">
              Update {label}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-lg hover:border-[#1D1D1D] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium mt-0.5">{value || <span className="opacity-30 italic text-xs">Not set</span>}</p>
      )}
    </Row>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading]             = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profile, setProfile]             = useState<any>({});

  // Email change
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail]               = useState("");
  const [confirmEmail, setConfirmEmail]       = useState("");
  const [emailPassword, setEmailPassword]     = useState("");

  // Password change
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPassword, setNewPassword]   = useState("");
  const [showNewPw, setShowNewPw]       = useState(false);
  const [changingPw, setChangingPw]     = useState(false);

  // Account owner edit
  const [showOwnerEdit, setShowOwnerEdit] = useState(false);
  const [ownerName, setOwnerName]         = useState("");
  const [ownerTitle, setOwnerTitle]       = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Payment details – CARD
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [paymentPassword, setPaymentPassword] = useState("");
  // Card input fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  // Campaign prefs
  const [campaignType, setCampaignType]   = useState("banner");
  const [targetGender, setTargetGender]   = useState("All Genders");
  const [ageMin, setAgeMin]               = useState(18);
  const [ageMax, setAgeMax]               = useState(35);
  const [niches, setNiches]               = useState<string[]>(["Gaming","Tech Reviews","Lifestyle"]);
  const [showNicheEdit, setShowNicheEdit] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    creator_accepts:  true,
    creator_declines: true,
    stream_verified:  true,
    new_message:      true,
    announcements:    true,
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("businesses").select("*").eq("user_id", user!.id).maybeSingle();
      const meta     = user!.user_metadata || {};
      const p        = data || {};
      setProfile({ ...p, email: user!.email });
      setOwnerName(p.full_name  || meta.full_name  || "");
      setOwnerTitle(p.job_title || meta.job_title  || "");
      if (p.target_gender)        setTargetGender(p.target_gender);
      if (p.target_age_min)       setAgeMin(p.target_age_min);
      if (p.target_age_max)       setAgeMax(p.target_age_max);
      if (p.preferred_niches)     setNiches(p.preferred_niches);
      if (p.default_campaign_type) setCampaignType(p.default_campaign_type);
      // Payment details
      setPaymentMethod(p.payment_method || "");
      setPaymentAccount(p.payment_account || "");
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // ── Patch ─────────────────────────────────────────────────────────────────

  const patch = async (updates: any) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase.from("businesses").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("businesses").update({ ...updates, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      } else {
        await supabase.from("businesses").insert({ ...updates, user_id: user.id, created_at: new Date().toISOString() });
      }
      setProfile((p: any) => ({ ...p, ...updates }));
      toast.success("Saved");
    } catch { toast.error("Failed to save"); }
  };

  // ── Logo ──────────────────────────────────────────────────────────────────

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `business-logos/${user.id}-${Date.now()}.${ext}`;
      await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await patch({ logo_url: publicUrl });
    } catch { toast.error("Upload failed"); }
    finally { setUploadingLogo(false); }
  };

  // ── Email ─────────────────────────────────────────────────────────────────

  const handleEmailChange = async () => {
    if (newEmail !== confirmEmail) { toast.error("Emails don't match"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Confirmation sent to your new email");
      setShowEmailChange(false); setNewEmail(""); setConfirmEmail(""); setEmailPassword("");
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Password ──────────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Min. 8 characters"); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setShowPwChange(false); setNewPassword("");
    } catch (err: any) { toast.error(err.message); }
    finally { setChangingPw(false); }
  };

  // ── Owner update ──────────────────────────────────────────────────────────

  const handleOwnerUpdate = async () => {
    await patch({ full_name: ownerName, job_title: ownerTitle });
    await supabase.auth.updateUser({ data: { full_name: ownerName, job_title: ownerTitle } });
    setShowOwnerEdit(false);
  };

  // ── Payment update (CARD) ────────────────────────────────────────────────

  const handlePaymentUpdate = async () => {
    // Basic validation
    const digitsOnly = cardNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 16) {
      toast.error("Card number must be 16 digits");
      return;
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      toast.error("Expiry must be in MM/YY format");
      return;
    }
    if (cvc.length < 3 || cvc.length > 4) {
      toast.error("CVC must be 3 or 4 digits");
      return;
    }
    // Optional: verify password with Supabase (we'll just store for demo)
    // In production, you should call an endpoint that verifies the password.
    const last4 = digitsOnly.slice(-4);
    await patch({
      payment_method: "card",
      payment_account: last4,
    });
    setShowPaymentEdit(false);
    setPaymentPassword("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Settings" userType="business" />
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  const locationStr = [profile.city, profile.country].filter(Boolean).join(", ") || "Not set";

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Settings" userType="business" />

      <div className="max-w-[480px] mx-auto px-4 pt-5 space-y-3">

        {/* ── ACCOUNT ──────────────────────────────────────────────── */}
        <SectionLabel>Account</SectionLabel>

        {/* Email */}
        <Card title="Email Address">
          <Row>
            <p className="text-sm font-medium mb-2">{profile.email || user?.email}</p>
            {!showEmailChange ? (
              <button onClick={() => setShowEmailChange(true)}
                className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">
                Change Email
              </button>
            ) : (
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">New Email Address</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="newemail@example.com"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Confirm New Email</label>
                  <input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
                    placeholder="Repeat new email"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Current Password</label>
                  <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
                    placeholder="Verify your password"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div className="flex gap-2 pb-2">
                  <button onClick={handleEmailChange}
                    className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors">
                    Update Email
                  </button>
                  <button onClick={() => setShowEmailChange(false)}
                    className="px-4 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Row>
        </Card>

        {/* Password */}
        <Card title="Password">
          <Row>
            {!showPwChange ? (
              <div className="flex items-center justify-between">
                <p className="text-sm tracking-widest text-gray-400">••••••••</p>
                <button onClick={() => setShowPwChange(true)}
                  className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline">Change</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2.5 pr-10 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pb-2">
                  <button onClick={handleChangePassword} disabled={changingPw || newPassword.length < 8}
                    className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-40">
                    {changingPw ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Update Password"}
                  </button>
                  <button onClick={() => setShowPwChange(false)}
                    className="px-4 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Row>
        </Card>

        {/* Phone */}
        <Card title="Phone Number">
          <Row>
            <p className="text-sm font-medium mb-1">{profile.phone_number || "Not set"}</p>
            <p className="text-[8px] text-gray-400 leading-relaxed">
              To change your phone number contact our team at{" "}
              <a href="mailto:support@livelink.com" className="text-[#389C9A] underline">support@livelink.com</a>
              {" "}— this requires identity verification.
            </p>
          </Row>
        </Card>

        {/* Account Owner */}
        <Card title="Account Owner">
          <Row>
            {!showOwnerEdit ? (
              <>
                <p className="font-black text-sm">{ownerName || "Not set"}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{ownerTitle || "No title set"}</p>
                <button onClick={() => setShowOwnerEdit(true)}
                  className="mt-2 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit Details
                </button>
              </>
            ) : (
              <div className="space-y-3 mt-1">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Full Name</label>
                  <input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Job Title / Role</label>
                  <input value={ownerTitle} onChange={e => setOwnerTitle(e.target.value)} placeholder="e.g. Marketing Director"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Current Password</label>
                  <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} placeholder="Verify identity"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
                </div>
                <div className="flex gap-2 pb-2">
                  <button onClick={handleOwnerUpdate}
                    className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors">
                    Update Details
                  </button>
                  <button onClick={() => setShowOwnerEdit(false)}
                    className="px-4 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Row>
        </Card>

        {/* ── PAYMENT DETAILS (CARD) ─────────────────────────────────────────── */}
        <SectionLabel>Payment Details</SectionLabel>

        <Card title="Payment Details">
          <Row>
            {!showPaymentEdit ? (
              <>
                {paymentMethod === "card" && paymentAccount ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Card</p>
                      <p className="text-sm font-medium">
                        **** **** **** {paymentAccount}
                      </p>
                    </div>
                    <span className="inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      ACTIVE
                    </span>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="text-sm text-gray-500">No payment method set.</p>
                  </div>
                )}
                <button
                  onClick={() => setShowPaymentEdit(true)}
                  className="mt-2 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </>
            ) : (
              <div className="space-y-3 mt-1">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 16) setCardNumber(val);
                    }}
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 3) {
                          val = val.slice(0,2) + '/' + val.slice(2,4);
                        }
                        setExpiry(val);
                      }}
                      className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 4) setCvc(val);
                      }}
                      className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={paymentPassword}
                    onChange={(e) => setPaymentPassword(e.target.value)}
                    placeholder="Verify your identity"
                    className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2 pb-2">
                  <button
                    onClick={handlePaymentUpdate}
                    className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
                  >
                    Save Card
                  </button>
                  <button
                    onClick={() => setShowPaymentEdit(false)}
                    className="px-4 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Row>
        </Card>

        {/* ── BUSINESS PROFILE ─────────────────────────────────────── */}
        <SectionLabel>Business Profile</SectionLabel>

        <Card title="Business Name">
          <InlineEdit label="Business Name" value={profile.business_name || ""}
            onSave={v => patch({ business_name: v })} />
        </Card>

        <Card title="Business Logo">
          <Row>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden bg-[#F8F8F8] flex items-center justify-center shrink-0">
                {profile.logo_url
                  ? <img src={profile.logo_url} alt="logo" className="w-full h-full object-cover" />
                  : <Building2 className="w-6 h-6 text-gray-300" />}
              </div>
              <div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1">
                  {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  {uploadingLogo ? "Uploading..." : "Change"}
                </button>
                <p className="text-[7px] text-gray-400 mt-1">JPG, PNG · Max 5MB</p>
              </div>
            </div>
          </Row>
        </Card>

        <Card title="Business Description">
          <InlineEdit label="Description" value={profile.description || ""}
            onSave={v => patch({ description: v })} multiline />
        </Card>

        <Card title="Industry">
          <Row>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Industry</p>
            <select value={profile.industry || ""} onChange={e => patch({ industry: e.target.value })}
              className="w-full px-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm bg-white">
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Row>
        </Card>

        <Card title="Website">
          <InlineEdit label="Website" value={profile.website || ""}
            onSave={v => patch({ website: v })} type="url" />
        </Card>

        <Card title="Location">
          <Row>
            <p className="text-sm font-medium mb-3">{locationStr}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">City</label>
                <input value={profile.city || ""} onChange={e => setProfile((p: any) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Country</label>
                <input value={profile.country || ""} onChange={e => setProfile((p: any) => ({ ...p, country: e.target.value }))}
                  placeholder="Country"
                  className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
              </div>
            </div>
            <button onClick={() => patch({ city: profile.city, country: profile.country })}
              className="w-full bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors">
              Save Location
            </button>
          </Row>
        </Card>

        <Card title="Social Media">
          {[
            { key: "linkedin",  icon: Linkedin,  label: "LinkedIn",  placeholder: "@yourcompany" },
            { key: "twitter",   icon: Twitter,   label: "Twitter",   placeholder: "@yourhandle" },
            { key: "instagram", icon: Instagram, label: "Instagram", placeholder: "@yourhandle" },
            { key: "youtube",   icon: Youtube,   label: "YouTube",   placeholder: "Channel URL" },
          ].map(({ key, icon: Icon, label, placeholder }) => (
            <Row key={key}>
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{label}</p>
                  <input value={(profile as any)[key] || ""} onChange={e => setProfile((p: any) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    onBlur={() => patch({ [key]: (profile as any)[key] })}
                    className="w-full text-sm border-none outline-none bg-transparent mt-0.5" />
                </div>
              </div>
            </Row>
          ))}
        </Card>

        {/* ── CAMPAIGN PREFERENCES ─────────────────────────────────── */}
        <SectionLabel>Campaign Preferences</SectionLabel>

        <div className="bg-[#F0F0F0] border border-[#1D1D1D]/10 rounded-xl px-4 py-3">
          <p className="text-[8px] text-gray-500">These preferences help us match your campaigns with the right creators.</p>
        </div>

        <Card title="Target Audience Age">
          <Row>
            <p className="text-sm font-medium mb-3">{ageMin} – {ageMax}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Min Age</label>
                <input type="number" min={13} max={65} value={ageMin} onChange={e => setAgeMin(Number(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Max Age</label>
                <input type="number" min={13} max={65} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm" />
              </div>
            </div>
            <button onClick={() => patch({ target_age_min: ageMin, target_age_max: ageMax })}
              className="w-full bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors">
              Save Age Range
            </button>
          </Row>
        </Card>

        <Card title="Target Gender">
          <Row>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map(g => (
                <button key={g} onClick={() => { setTargetGender(g); patch({ target_gender: g }); }}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-full transition-colors ${
                    targetGender === g ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </Row>
        </Card>

        <Card title="Preferred Creator Niches">
          <Row>
            <div className="flex flex-wrap gap-2 mb-3">
              {niches.map(n => (
                <span key={n} className="flex items-center gap-1 bg-[#389C9A]/10 text-[#389C9A] px-3 py-1 rounded-full text-[9px] font-black">
                  {n}
                  <button onClick={() => { const u = niches.filter(x => x !== n); setNiches(u); patch({ preferred_niches: u }); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <button onClick={() => setShowNicheEdit(!showNicheEdit)}
              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {showNicheEdit && (
              <div className="mt-3 flex flex-wrap gap-2">
                {NICHES.filter(n => !niches.includes(n)).map(n => (
                  <button key={n} onClick={() => { const u = [...niches, n]; setNiches(u); patch({ preferred_niches: u }); }}
                    className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-full bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] hover:text-[#389C9A] transition-colors">
                    + {n}
                  </button>
                ))}
              </div>
            )}
          </Row>
        </Card>

        <Card title="Default Campaign Type">
          <Row>
            <p className="text-[8px] text-gray-400 mb-3">Pre-select your preferred campaign type when creating a new campaign.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { val: "banner",       label: "Banner" },
                { val: "promo",        label: "Promo Code" },
                { val: "banner_promo", label: "Banner + Code" },
              ].map(opt => (
                <button key={opt.val} onClick={() => { setCampaignType(opt.val); patch({ default_campaign_type: opt.val }); }}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-full transition-colors ${
                    campaignType === opt.val ? "bg-[#1D1D1D] text-white" : "bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Row>
        </Card>

        {/* ── NOTIFICATIONS ────────────────────────────────────────── */}
        <SectionLabel>Notifications</SectionLabel>

        <Card title="Notification Preferences">
          <ToggleRow label="Creator accepts my campaign"         value={notifs.creator_accepts}  onChange={v => setNotifs(p => ({ ...p, creator_accepts: v }))} />
          <ToggleRow label="Creator declines my campaign"        value={notifs.creator_declines} onChange={v => setNotifs(p => ({ ...p, creator_declines: v }))} />
          <ToggleRow label="Stream verified and payout released" value={notifs.stream_verified}  onChange={v => setNotifs(p => ({ ...p, stream_verified: v }))} />
          <ToggleRow label="New message from a creator"          value={notifs.new_message}      onChange={v => setNotifs(p => ({ ...p, new_message: v }))} />
          <ToggleRow label="Platform announcements"              value={notifs.announcements}    onChange={v => setNotifs(p => ({ ...p, announcements: v }))} />
        </Card>

        {/* ── COMPLIANCE & LEGAL ──────────────────────────────────── */}
        <SectionLabel>Compliance & Legal</SectionLabel>

        <Card title="Compliance & Legal">
          {[
            { label: "Advertiser Policy", note: "Last agreed on Jan 15, 2026" },
            { label: "Terms of Service",  note: "Last agreed on Jan 15, 2026" },
          ].map((item, i) => (
            <Row key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black">{item.label}</p>
                  <p className="text-[8px] text-gray-400">{item.note}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Row>
          ))}
          <Row>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Verification Status</p>
                <span className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded-full ${
                  profile.verification_status === "verified"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {(profile.verification_status || "PENDING").toUpperCase()}
                </span>
                {profile.verification_status === "verified" && (
                  <p className="text-[8px] text-gray-400 mt-1">Your business identity has been verified by the LiveLink team.</p>
                )}
              </div>
              <ShieldCheck className={`w-5 h-5 ${profile.verification_status === "verified" ? "text-green-500" : "text-gray-300"}`} />
            </div>
          </Row>
        </Card>

        {/* ── ACCOUNT STATUS ──────────────────────────────────────── */}
        <SectionLabel>Account Status</SectionLabel>

        <Card title="Pause Your Account">
          <Row>
            <p className="text-[8px] text-gray-500 leading-relaxed mb-4">
              Pausing hides your business profile and all active campaign listings. Ongoing campaigns with accepted creators are not affected.
            </p>
            <button onClick={() => { if (confirm("Pause your account?")) patch({ status: "paused" }); }}
              className="w-full border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center justify-center gap-2">
              <Pause className="w-4 h-4" /> Pause My Account
            </button>
          </Row>
        </Card>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-200 bg-red-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-700">Delete Account</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-[8px] text-red-600/70 mb-4 leading-relaxed">
              Permanently deletes your business account and all data. Any active campaigns will be terminated and held funds refunded. This cannot be undone.
            </p>
            <button onClick={() => toast.error("Contact support@livelink.com to request deletion.")}
              className="w-full border-2 border-red-500 text-red-500 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Request Account Deletion
            </button>
          </div>
        </div>

        {/* ── SUPPORT ──────────────────────────────────────────────── */}
        <SectionLabel>Support</SectionLabel>

        <Card title="Support">
          {[
            { label: "Help Centre",      icon: HelpCircle,    action: () => {} },
            { label: "Contact Support",  icon: MessageCircle, action: () => window.open("mailto:support@livelink.com") },
            { label: "Terms of Service", icon: FileText,      action: () => navigate("/terms") },
            { label: "Privacy Policy",   icon: Scale,         action: () => navigate("/privacy") },
          ].map((item, i) => (
            <Row key={i}>
              <button onClick={item.action}
                className="w-full flex items-center justify-between hover:text-[#389C9A] transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </Row>
          ))}
        </Card>

        {/* Footer */}
        <div className="bg-white border-2 border-[#1D1D1D] rounded-xl p-5 text-center space-y-1 mb-4">
          <p className="text-[8px] text-gray-400">LiveLink v1.0.0</p>
          <p className="text-[8px] text-gray-500">
            Logged in as <span className="font-black">{profile.business_name || user?.email}</span>
          </p>
          <button onClick={async () => { await logout(); navigate("/"); }}
            className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:underline">
            Not you? Log out
          </button>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
