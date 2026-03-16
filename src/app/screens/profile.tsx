import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  MapPin,
  CheckCircle2,
  Instagram,
  Youtube,
  Facebook,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users,
  BarChart,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="w-4 h-4" />,
  YouTube: <Youtube className="w-4 h-4" />,
  Facebook: <Facebook className="w-4 h-4" />,
  TikTok: <span className="text-[10px] font-black">TK</span>,
  Twitch: <span className="text-[10px] font-black">TV</span>,
  Kick: <span className="text-[10px] font-black">KK</span>,
};

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [creator, setCreator] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [customOffer, setCustomOffer] = useState({
    streams: "",
    rate: "",
    type: "Banner Only",
    message: ""
  });

  useEffect(() => {
    const fetchCreator = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("creators")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Creator profile not found.");
      } else {
        setCreator(data);
      }
      setLoading(false);
    };
    fetchCreator();
  }, [id]);

  const handleSendOffer = async () => {
    if (!creator || !customOffer.streams || !customOffer.rate) {
      toast.error("Please fill in streams and rate");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: offerError } = await supabase
        .from("campaign_requests")
        .insert({
          creator_id: creator.id,
          business_user_id: user.id,
          streams_required: parseInt(customOffer.streams),
          price: parseFloat(customOffer.rate),
          campaign_type: customOffer.type,
          message: customOffer.message,
          status: "pending",
          expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        });

      if (offerError) throw offerError;
      setOfferSent(true);
      toast.success(`Offer sent to ${creator.full_name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send offer");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
          Loading profile…
        </p>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center gap-4 px-8">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-[#1D1D1D]/60 text-center">{error || "Creator not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] font-black uppercase tracking-widest underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const platforms: any[] = creator.platforms || [];
  const niches: string[] = creator.categories || creator.niches || [];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px]">
      <Toaster position="top-center" richColors />
      <AppHeader title="Creator Profile" showBack />

      <main className="max-w-[480px] mx-auto w-full">
        {/* Hero Card */}
        <div className="p-6">
          <div className="bg-[#1D1D1D] p-8 text-white relative overflow-hidden">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-2 h-2 rounded-none ${
                creator.status === "approved" ? "bg-[#389C9A] animate-pulse" : "bg-[#FEDB71]"
              }`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                {creator.status === "approved" ? "Available" : creator.status}
              </span>
              {creator.verified && (
                <div className="flex items-center gap-1 bg-[#FEDB71]/20 px-2 py-0.5 ml-auto">
                  <CheckCircle2 className="w-3 h-3 text-[#FEDB71]" />
                  <span className="text-[8px] font-black uppercase text-[#FEDB71]">Verified</span>
                </div>
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">
              {creator.full_name || creator.name || "Creator"}
            </h1>

            {/* Location */}
            {(creator.city || creator.country) && (
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold italic mb-4 text-white/50">
                <MapPin className="w-3 h-3" />
                <span>{[creator.city, creator.country].filter(Boolean).join(", ")}</span>
              </div>
            )}

            {/* Platforms */}
            {platforms.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {platforms.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5">
                    {PLATFORM_ICONS[p.type || p.platform] || null}
                    <span className="text-[10px] font-black uppercase">{p.username || p.handle}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Niches */}
            {niches.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {niches.map((n: string) => (
                  <span key={n} className="text-[9px] font-bold uppercase bg-white/10 px-2 py-0.5 italic">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg Viewers", value: creator.avg_concurrent ? creator.avg_concurrent.toLocaleString() : "—" },
              { label: "Peak Viewers", value: creator.avg_peak ? creator.avg_peak.toLocaleString() : "—" },
              { label: "Streams/wk", value: creator.frequency ? creator.frequency.split(" ")[0] : "—" },
            ].map((stat) => (
              <div key={stat.label} className="border-2 border-[#1D1D1D] p-4 text-center">
                <p className="text-xl font-black italic">{stat.value}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        {creator.audience_bio && (
          <div className="px-6 pb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-4">
              About
            </h3>
            <AnimatePresence>
              <p className={`text-sm text-[#1D1D1D]/70 leading-relaxed ${!isBioExpanded ? "line-clamp-3" : ""}`}>
                {creator.audience_bio}
              </p>
            </AnimatePresence>
            {creator.audience_bio.length > 120 && (
              <button
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="mt-2 text-[10px] uppercase text-[#389C9A] font-black underline flex items-center gap-1"
              >
                {isBioExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
              </button>
            )}
          </div>
        )}

        {/* Send Offer */}
        <div className="px-6 pb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-6">
            Send Offer
          </h3>

          {offerSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#389C9A]/10 border-2 border-[#389C9A] p-8 text-center"
            >
              <CheckCircle2 className="w-10 h-10 text-[#389C9A] mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-tight italic mb-2">Offer Sent!</p>
              <p className="text-[10px] font-bold text-[#1D1D1D]/50 uppercase tracking-widest">
                {creator.full_name} has 3 days to respond
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Campaign type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Campaign Type
                </label>
                <select
                  value={customOffer.type}
                  onChange={e => setCustomOffer(p => ({ ...p, type: e.target.value }))}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-black uppercase outline-none"
                >
                  <option>Banner Only</option>
                  <option>Promo Code Only</option>
                  <option>Banner + Promo Code</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Streams Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customOffer.streams}
                    onChange={e => setCustomOffer(p => ({ ...p, streams: e.target.value }))}
                    placeholder="e.g. 4"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Rate (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customOffer.rate}
                    onChange={e => setCustomOffer(p => ({ ...p, rate: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customOffer.message}
                  onChange={e => setCustomOffer(p => ({ ...p, message: e.target.value }))}
                  placeholder="Tell the creator about your brand…"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all resize-none italic"
                />
              </div>

              <button
                onClick={handleSendOffer}
                disabled={sending}
                className="w-full bg-[#1D1D1D] text-white p-6 font-black uppercase tracking-tight text-sm flex items-center justify-between italic active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>{sending ? "Sending…" : "Send Offer"}</span>
                <ArrowRight className="w-5 h-5 text-[#389C9A]" />
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
