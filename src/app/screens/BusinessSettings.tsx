import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Mail, HelpCircle, FileText, Shield, ChevronRight,
  Bell, CreditCard, Eye, EyeOff, Loader2, LogOut,
  Pause, Trash2, CheckCircle, AlertCircle, Save, Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

// ── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#389C9A]" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 italic px-1 mb-2">
      {children}
    </p>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 rounded-2xl overflow-hidden divide-y divide-[#1D1D1D]/08">
      {children}
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  sublabel,
  onClick,
  chevron = true,
  danger = false,
  right,
}: {
  icon: any;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  chevron?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
        danger ? "hover:bg-red-50 active:bg-red-100" : "hover:bg-white active:bg-white"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger ? "bg-red-100" : "bg-[#389C9A]/10"
        }`}
      >
        <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-[#389C9A]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black ${danger ? "text-red-500" : "text-[#1D1D1D]"}`}>{label}</p>
        {sublabel && <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5 truncate">{sublabel}</p>}
      </div>
      {right ?? (chevron && <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20 flex-shrink-0" />)}
    </button>
  );
}

// ── Expandable sections ───────────────────────────────────────────────────────

function EmailSection({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleUpdate = async () => {
    if (newEmail !== confirm) { toast.error("Emails don't match"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Check your inbox to confirm the new email");
      setOpen(false); setNewEmail(""); setConfirm("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="divide-y divide-[#1D1D1D]/08">
      <SettingsRow
        icon={Mail}
        label="Email Address"
        sublabel={user?.email}
        onClick={() => setOpen(!open)}
        right={
          <span className="text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic">
            {open ? "Cancel" : "Change"}
          </span>
        }
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-5 py-4 space-y-3">
              <input
                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="New email address"
                className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
              />
              <input
                type="email" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new email"
                className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
              />
              <button
                onClick={handleUpdate}
                className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
                Update Email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordSection() {
  const [open, setOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const handleUpdate = async () => {
    if (newPw !== confirm) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 6) { toast.error("Min. 6 characters"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated");
      setOpen(false); setNewPw(""); setConfirm("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="divide-y divide-[#1D1D1D]/08">
      <SettingsRow
        icon={Shield}
        label="Password"
        sublabel="••••••••"
        onClick={() => setOpen(!open)}
        right={
          <span className="text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic">
            {open ? "Cancel" : "Change"}
          </span>
        }
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-5 py-4 space-y-3">
              <div className="relative">
                <input
                  type={show ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="New password (min. 6 chars)"
                  className="w-full px-4 py-3 pr-11 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPw && (
                <div className="flex gap-1">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${newPw.length >= 6 ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(newPw) ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${/[0-9]/.test(newPw) ? "bg-[#389C9A]" : "bg-gray-200"}`} />
                </div>
              )}
              <input
                type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
              />
              <button
                onClick={handleUpdate}
                className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
                Update Password
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentSection({ businessProfile }: { businessProfile: any }) {
  const [open, setOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [password, setPassword] = useState("");
  const [last4, setLast4] = useState(businessProfile?.payment_account || "");
  const hasCard = !!last4;

  const handleSave = async () => {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length !== 16) { toast.error("Card number must be 16 digits"); return; }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) { toast.error("Expiry must be MM/YY"); return; }
    if (cvc.length < 3) { toast.error("CVC must be 3-4 digits"); return; }
    setLast4(digits.slice(-4));
    setOpen(false); setCardNumber(""); setExpiry(""); setCvc(""); setPassword("");
    toast.success("Payment method saved");
  };

  return (
    <div className="divide-y divide-[#1D1D1D]/08">
      <SettingsRow
        icon={CreditCard}
        label="Payment Method"
        sublabel={hasCard ? `Card ending ···· ${last4}` : "No card on file"}
        onClick={() => setOpen(!open)}
        right={
          <span className="text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic flex items-center gap-1">
            <Pencil className="w-3 h-3" /> {open ? "Cancel" : "Edit"}
          </span>
        }
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-5 py-4 space-y-3">
              <input
                type="text" placeholder="Card number" value={cardNumber}
                onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 16) setCardNumber(v); }}
                className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="MM/YY" value={expiry}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                    setExpiry(v);
                  }}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                />
                <input
                  type="text" placeholder="CVC" value={cvc}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 4) setCvc(v); }}
                  className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                />
              </div>
              <input
                type="password" placeholder="Confirm your password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
              />
              <button
                onClick={handleSave}
                className="w-full py-3 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
                Save Card
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({
  open, onClose, title, body, confirmLabel, confirmClass, onConfirm,
}: {
  open: boolean; onClose: () => void; title: string; body: string;
  confirmLabel: string; confirmClass: string; onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88%] max-w-sm bg-white p-6 z-50 rounded-2xl shadow-xl"
          >
            <h3 className="text-lg font-black uppercase tracking-tighter italic mb-2">{title}</h3>
            <p className="text-sm text-[#1D1D1D]/60 mb-6 leading-relaxed">{body}</p>
            <div className="space-y-2">
              <button onClick={onConfirm} className={`w-full py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors ${confirmClass}`}>
                {confirmLabel}
              </button>
              <button onClick={onClose} className="w-full py-3 border-2 border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-[#1D1D1D] transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [showPause, setShowPause] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [notifs, setNotifs] = useState({
    campaigns: true,
    messages: true,
    payments: true,
    announcements: false,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).maybeSingle();
        if (data) setBusinessProfile(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out");
  };

  const accountStatus = businessProfile?.application_status || businessProfile?.status || "pending";

  const statusBadge =
    accountStatus === "approved" || accountStatus === "active"
      ? { label: "Active", cls: "bg-green-100 text-green-700" }
      : accountStatus === "pending" || accountStatus === "pending_verification"
      ? { label: "Pending", cls: "bg-amber-100 text-amber-700" }
      : { label: accountStatus, cls: "bg-gray-100 text-gray-700" };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <AppHeader showBack title="Settings" userType="business" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] max-w-[480px] mx-auto">
      <AppHeader showBack title="Settings" userType="business" />

      <div className="px-5 py-6 pb-36 space-y-7">

        {/* Account Status Badge */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 border border-[#1D1D1D]/08">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Account Status</p>
            <p className="text-sm font-black mt-0.5">
              {businessProfile?.business_name || user?.email}
            </p>
          </div>
          <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Account */}
        <div className="space-y-2">
          <SectionLabel>Account</SectionLabel>
          <SettingsCard>
            <EmailSection user={user} />
            <PasswordSection />
          </SettingsCard>
        </div>

        {/* Payment */}
        <div className="space-y-2">
          <SectionLabel>Payment</SectionLabel>
          <SettingsCard>
            <PaymentSection businessProfile={businessProfile} />
          </SettingsCard>
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          <SectionLabel>Notifications</SectionLabel>
          <SettingsCard>
            {[
              { key: "campaigns",     label: "Campaign activity" },
              { key: "messages",      label: "New messages" },
              { key: "payments",      label: "Payment alerts" },
              { key: "announcements", label: "Platform news" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-bold">{item.label}</p>
                <Toggle
                  value={notifs[item.key as keyof typeof notifs]}
                  onChange={v => setNotifs({ ...notifs, [item.key]: v })}
                />
              </div>
            ))}
          </SettingsCard>
        </div>

        {/* Support */}
        <div className="space-y-2">
          <SectionLabel>Support</SectionLabel>
          <SettingsCard>
            <SettingsRow icon={HelpCircle} label="Help Centre" onClick={() => {}} />
            <SettingsRow
              icon={Mail} label="Contact Support"
              onClick={() => window.open("mailto:support@livelink.com")}
              sublabel="support@livelink.com"
            />
            <SettingsRow icon={FileText} label="Terms of Service" onClick={() => navigate("/terms")} />
            <SettingsRow icon={Shield} label="Privacy Policy" onClick={() => navigate("/privacy")} />
          </SettingsCard>
        </div>

        {/* Danger Zone */}
        <div className="space-y-2">
          <SectionLabel>Danger Zone</SectionLabel>
          <SettingsCard>
            <SettingsRow
              icon={Pause} label="Pause Account"
              sublabel="Hides your profile temporarily"
              onClick={() => setShowPause(true)} danger
            />
            <SettingsRow
              icon={Trash2} label="Delete Account"
              sublabel="Permanent — cannot be undone"
              onClick={() => setShowDelete(true)} danger
            />
          </SettingsCard>
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="w-full py-4 flex items-center justify-center gap-2 border-2 border-[#1D1D1D]/10 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 hover:border-red-300 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>

        {/* Footer */}
        <p className="text-center text-[9px] text-[#1D1D1D]/30">LiveLink v1.0.0 · {user?.email}</p>
      </div>

      {/* Pause Modal */}
      <Modal
        open={showPause} onClose={() => setShowPause(false)}
        title="Pause Your Account?"
        body="Your profile will be hidden from creators. Active campaigns will not be affected. You can reactivate at any time."
        confirmLabel="Yes, Pause Account"
        confirmClass="bg-amber-500 text-white hover:bg-amber-600"
        onConfirm={() => { toast.info("Account paused"); setShowPause(false); }}
      />

      {/* Delete Modal */}
      <Modal
        open={showDelete} onClose={() => setShowDelete(false)}
        title="Delete Your Account?"
        body="This is permanent and cannot be undone. All your data, campaigns, and history will be removed."
        confirmLabel="Yes, Delete My Account"
        confirmClass="bg-red-600 text-white hover:bg-red-700"
        onConfirm={() => { toast.error("Contact support@livelink.com to request deletion."); setShowDelete(false); }}
      />

      <BottomNav />
    </div>
  );
}
