import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CheckCircle2,
  X,
  MessageSquare,
  ChevronRight,
  Zap,
  Clock,
  DollarSign,
  BarChart,
  ArrowRight,
  Briefcase,
  Users,
  Calendar,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Offer {
  id: string;
  status: "pending" | "accepted" | "rejected" | "negotiating";
  streams: number;
  rate: number;
  amount: number;
  campaign_type: string;
  message?: string;
  created_at: string;
  // creator view
  business?: { id: string; name: string; logo?: string };
  campaign?: { id: string; name: string; type: string };
  // business view
  creator?: { id: string; name: string; avatar?: string; username?: string };
}

interface CounterOffer {
  streams: string;
  rate: string;
  message: string;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:     { label: "Pending",     bg: "bg-[#FEDB71]/10", text: "text-[#1D1D1D]",   border: "border-[#FEDB71]/50" },
  negotiating: { label: "Negotiating", bg: "bg-[#389C9A]/10", text: "text-[#389C9A]",   border: "border-[#389C9A]/30" },
  accepted:    { label: "Accepted",    bg: "bg-green-50",     text: "text-green-600",    border: "border-green-200" },
  rejected:    { label: "Rejected",    bg: "bg-red-50",       text: "text-red-500",      border: "border-red-200" },
};

const TABS = ["All", "Pending", "Negotiating", "Accepted", "Rejected"] as const;
type Tab = typeof TABS[number];

export function Offers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = (searchParams.get("role") as "creator" | "business") || "creator";
  const { user } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [counterOffer, setCounterOffer] = useState<CounterOffer>({ streams: "", rate: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  /* ── Resolve profile id ── */
  useEffect(() => {
    if (!user) return;
    const resolve = async () => {
      if (role === "business") {
        const { data } = await supabase.from("businesses").select("id").eq("user_id", user.id).maybeSingle();
        setProfileId(data?.id || null);
      } else {
        const { data } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
        setProfileId(data?.id || null);
      }
    };
    resolve();
  }, [user, role]);

  /* ── Fetch offers ── */
  useEffect(() => {
    if (!profileId) return;
    const fetch = async () => {
      setLoading(true);
      const col = role === "business" ? "business_id" : "creator_id";
      const { data, error } = await supabase
        .from("offers")
        .select(`
          *,
          creator:creator_id ( id, name, avatar, username ),
          business:business_id ( id, name, logo ),
          campaign:campaign_id ( id, name, type )
        `)
        .eq(col, profileId)
        .order("created_at", { ascending: false });

      if (!error && data) setOffers(data);
      setLoading(false);
    };
    fetch();
  }, [profileId, role]);

  /* ── Filtered list ── */
  const filtered = offers.filter(o => {
    if (activeTab === "All") return true;
    return o.status === activeTab.toLowerCase();
  });

  /* ── Accept ── */
  const handleAccept = async (offer: Offer) => {
    setSubmitting(true);
    const { error } = await supabase.from("offers").update({ status: "accepted" }).eq("id", offer.id);
    if (!error) {
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "accepted" } : o));
      if (selectedOffer?.id === offer.id) setSelectedOffer({ ...offer, status: "accepted" });
      toast.success("Offer accepted!");
    } else {
      toast.error("Failed to accept offer");
    }
    setSubmitting(false);
  };

  /* ── Reject ── */
  const handleReject = async (offer: Offer) => {
    setSubmitting(true);
    const { error } = await supabase.from("offers").update({ status: "rejected" }).eq("id", offer.id);
    if (!error) {
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "rejected" } : o));
      if (selectedOffer?.id === offer.id) setSelectedOffer({ ...offer, status: "rejected" });
      toast.success("Offer rejected");
    } else {
      toast.error("Failed to reject offer");
    }
    setSubmitting(false);
    setShowDetail(false);
  };

  /* ── Counter offer ── */
  const handleCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    setSubmitting(true);

    const streams = parseInt(counterOffer.streams);
    const rate    = parseFloat(counterOffer.rate);

    const { error } = await supabase.from("offers").update({
      status: "negotiating",
      streams,
      rate,
      amount: streams * rate,
      message: counterOffer.message || selectedOffer.message,
    }).eq("id", selectedOffer.id);

    if (!error) {
      const updated = { ...selectedOffer, status: "negotiating" as const, streams, rate, amount: streams * rate };
      setOffers(prev => prev.map(o => o.id === selectedOffer.id ? updated : o));
      setSelectedOffer(updated);
      setShowCounter(false);
      setCounterOffer({ streams: "", rate: "", message: "" });
      toast.success("Counter offer sent!");
    } else {
      toast.error("Failed to send counter offer");
    }
    setSubmitting(false);
  };

  /* ── Message ── */
  const handleMessage = (offer: Offer) => {
    const targetId = role === "creator" ? offer.business?.id : offer.creator?.id;
    if (targetId) navigate(`/messages/${targetId}`);
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const openDetail = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowDetail(true);
    setShowCounter(false);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Offers" userType={role} />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Loading offers...</p>
        </div>
        <BottomNav userType={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Offers" userType={role} />

      <main className="max-w-[480px] mx-auto w-full">

        {/* ── Summary bar ── */}
        <div className="grid grid-cols-3 border-b-2 border-[#1D1D1D]">
          {[
            { label: "Pending",     val: offers.filter(o => o.status === "pending").length,     color: "text-[#FEDB71]" },
            { label: "Negotiating", val: offers.filter(o => o.status === "negotiating").length, color: "text-[#389C9A]" },
            { label: "Accepted",    val: offers.filter(o => o.status === "accepted").length,    color: "text-green-500" },
          ].map((s, i) => (
            <div key={i} className={`py-4 text-center ${i < 2 ? "border-r border-[#1D1D1D]/10" : ""}`}>
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex overflow-x-auto border-b-2 border-[#1D1D1D] no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-3 text-[8px] font-black uppercase tracking-widest transition-colors border-b-2 -mb-[2px] ${
                activeTab === tab
                  ? "border-[#389C9A] text-[#389C9A]"
                  : "border-transparent text-[#1D1D1D]/40 hover:text-[#1D1D1D]"
              }`}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 opacity-60">
                  ({offers.filter(o => o.status === tab.toLowerCase()).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Offer list ── */}
        <div className="flex flex-col">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 px-8">
              <Briefcase className="w-10 h-10 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">
                No {activeTab.toLowerCase()} offers
              </p>
            </div>
          ) : (
            filtered.map((offer, i) => {
              const meta = STATUS_META[offer.status] || STATUS_META.pending;
              const counterpart = role === "creator" ? offer.business?.name : offer.creator?.name;
              const campaignName = offer.campaign?.name;

              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => openDetail(offer)}
                  className="border-b border-[#1D1D1D]/10 px-5 py-4 cursor-pointer hover:bg-[#F8F8F8] transition-colors active:bg-[#1D1D1D]/5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[11px] font-black uppercase tracking-tight truncate">
                          {counterpart || "Unknown"}
                        </p>
                        <span className={`flex-shrink-0 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 border ${meta.bg} ${meta.text} ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>
                      {campaignName && (
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#389C9A] mb-1 truncate">
                          {campaignName}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{offer.streams} streams</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />£{offer.rate}/stream</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-base font-black text-[#389C9A]">£{offer.amount}</p>
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{formatDate(offer.created_at)}</p>
                      <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </div>

                  {/* Quick action buttons for pending offers */}
                  {offer.status === "pending" && role === "creator" && (
                    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleAccept(offer)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Accept
                      </button>
                      <button
                        onClick={() => { openDetail(offer); setShowCounter(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 border-2 border-[#1D1D1D] py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" /> Counter
                      </button>
                      <button
                        onClick={() => handleReject(offer)}
                        className="flex items-center justify-center px-3 py-2 border-2 border-[#1D1D1D]/20 hover:border-red-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </main>

      <BottomNav userType={role} />

      {/* ── Detail Sheet ── */}
      <AnimatePresence>
        {showDetail && selectedOffer && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1D1D1D]/80"
              onClick={() => { setShowDetail(false); setShowCounter(false); }}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-[480px] bg-white border-t-2 border-[#1D1D1D] max-h-[92vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-[#1D1D1D]/10 mx-auto mt-4 mb-2" />

              <div className="px-5 pb-8">
                {/* Sheet header */}
                <div className="flex justify-between items-start py-4 border-b-2 border-[#1D1D1D] mb-5">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Offer Details</h2>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                      {formatDate(selectedOffer.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowDetail(false); setShowCounter(false); }}
                    className="p-2 border-2 border-[#1D1D1D]/10 hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status badge */}
                {(() => {
                  const meta = STATUS_META[selectedOffer.status];
                  return (
                    <div className={`flex items-center gap-2 px-4 py-3 border mb-5 ${meta.bg} ${meta.border}`}>
                      <Zap className={`w-4 h-4 ${meta.text}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Counterpart info */}
                <div className="border-2 border-[#1D1D1D]/10 p-4 mb-4">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                    {role === "creator" ? "From Business" : "Creator"}
                  </p>
                  <p className="text-sm font-black uppercase tracking-tight">
                    {role === "creator"
                      ? selectedOffer.business?.name
                      : selectedOffer.creator?.name}
                  </p>
                  {selectedOffer.campaign?.name && (
                    <p className="text-[9px] text-[#389C9A] font-bold uppercase tracking-widest mt-1">
                      {selectedOffer.campaign.name}
                    </p>
                  )}
                </div>

                {/* Offer breakdown */}
                <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 mb-4">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-1.5">
                    <BarChart className="w-3 h-3 text-[#389C9A]" /> Offer Breakdown
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Campaign Type",  value: selectedOffer.campaign_type },
                      { label: "Streams",        value: selectedOffer.streams },
                      { label: "Rate / Stream",  value: `£${selectedOffer.rate}` },
                      { label: "Total Value",    value: `£${selectedOffer.amount}`, highlight: true },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{item.label}</p>
                        <p className={`text-[11px] font-black ${item.highlight ? "text-[#389C9A]" : ""}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                {selectedOffer.message && (
                  <div className="border-l-2 border-[#389C9A] pl-4 mb-5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Message</p>
                    <p className="text-[11px] text-[#1D1D1D]/70 leading-relaxed">{selectedOffer.message}</p>
                  </div>
                )}

                {/* Counter offer form */}
                <AnimatePresence>
                  {showCounter && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCounter}
                      className="overflow-hidden"
                    >
                      <div className="border-2 border-[#1D1D1D] p-4 mb-4">
                        <p className="text-[8px] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-[#389C9A]" /> Counter Offer
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[7px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                              Streams
                            </label>
                            <input
                              type="number" min="1" required
                              value={counterOffer.streams}
                              onChange={e => setCounterOffer(p => ({ ...p, streams: e.target.value }))}
                              placeholder={String(selectedOffer.streams)}
                              className="w-full p-3 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none text-sm font-black transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[7px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                              Rate / Stream (£)
                            </label>
                            <input
                              type="number" min="1" step="5" required
                              value={counterOffer.rate}
                              onChange={e => setCounterOffer(p => ({ ...p, rate: e.target.value }))}
                              placeholder={String(selectedOffer.rate)}
                              className="w-full p-3 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none text-sm font-black transition-colors"
                            />
                          </div>
                        </div>
                        {counterOffer.streams && counterOffer.rate && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] mb-3">
                            New total: £{parseInt(counterOffer.streams) * parseFloat(counterOffer.rate)}
                          </p>
                        )}
                        <textarea
                          rows={2}
                          value={counterOffer.message}
                          onChange={e => setCounterOffer(p => ({ ...p, message: e.target.value }))}
                          placeholder="Optional message..."
                          className="w-full p-3 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none text-[11px] resize-none transition-colors mb-3"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit" disabled={submitting}
                            className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors disabled:opacity-50"
                          >
                            Send Counter
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCounter(false)}
                            className="px-4 border-2 border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-widest hover:border-[#1D1D1D] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                {selectedOffer.status === "pending" && !showCounter && (
                  <div className="flex flex-col gap-2 mt-2">
                    {role === "creator" && (
                      <>
                        <button
                          onClick={() => handleAccept(selectedOffer)} disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Accept Offer
                        </button>
                        <button
                          onClick={() => setShowCounter(true)}
                          className="w-full flex items-center justify-center gap-2 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" /> Counter Offer
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleReject(selectedOffer)} disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 border-2 border-[#1D1D1D]/20 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {selectedOffer.status === "negotiating" && !showCounter && role === "creator" && (
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(selectedOffer)} disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept Terms
                    </button>
                    <button
                      onClick={() => setShowCounter(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" /> Counter Again
                    </button>
                  </div>
                )}

                {/* Message button — always visible */}
                <button
                  onClick={() => handleMessage(selectedOffer)}
                  className="w-full flex items-center justify-center gap-2 border border-[#1D1D1D]/10 py-3 text-[9px] font-black uppercase tracking-widest hover:border-[#1D1D1D] hover:bg-[#F8F8F8] transition-colors mt-2"
                >
                  <MessageSquare className="w-4 h-4 text-[#389C9A]" /> Send Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
