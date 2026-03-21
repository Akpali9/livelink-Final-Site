import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Calendar, Clock, DollarSign, Users, MapPin,
  Tag, Target, CheckCircle2, AlertCircle, Megaphone, Eye,
  Zap, FileText, Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast, Toaster } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

const normalise = (s: string = "") => s.toLowerCase().replace(/[\s_]+/g, "_");

export function CampaignSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign]   = useState<any>(null);
  const [business, setBusiness]   = useState<any>(null);
  const [myRecord, setMyRecord]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetch = async () => {
      setLoading(true);

      // Fetch campaign
      const { data: camp, error: campErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (campErr || !camp) {
        toast.error("Campaign not found");
        navigate("/dashboard");
        return;
      }
      setCampaign(camp);

      // Fetch business info
      if (camp.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name, logo_url, bio, website")
          .eq("id", camp.business_id)
          .maybeSingle();
        setBusiness(biz);
      }

      // Fetch my campaign_creators record
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        const { data: cc } = await supabase
          .from("campaign_creators")
          .select("*")
          .eq("campaign_id", id)
          .eq("creator_id", profile.id)
          .maybeSingle();
        setMyRecord(cc);
      }

      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const statusColor = (s: string) => {
    const n = normalise(s);
    if (n === "active")         return "bg-[#389C9A]/10 text-[#389C9A] border-[#389C9A]/30";
    if (n === "pending_review") return "bg-[#FEDB71]/10 text-[#1D1D1D] border-[#FEDB71]/50";
    if (n === "completed")      return "bg-green-100 text-green-700 border-green-200";
    if (n === "rejected")       return "bg-red-100 text-red-600 border-red-200";
    return "bg-gray-100 text-gray-500 border-gray-200";
  };

  const myStatusColor = (s: string) => {
    const n = normalise(s);
    if (n === "active")      return "bg-[#389C9A] text-white";
    if (n === "not_started") return "bg-[#FEDB71] text-[#1D1D1D]";
    if (n === "completed")   return "bg-green-500 text-white";
    if (n === "dropped")     return "bg-red-500 text-white";
    return "bg-gray-200 text-gray-600";
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Campaign" userType="creator" />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!campaign) return null;

  const budget   = campaign.budget ?? campaign.pay_rate ?? campaign.bid_amount ?? campaign.price ?? 0;
  const streams  = campaign.streams_required ?? campaign.streams_total ?? 0;
  const deadline = campaign.stream_deadline ?? campaign.end_date;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <Toaster position="top-center" richColors />
      <AppHeader showBack title="Campaign Summary" userType="creator" />

      <main className="px-4 pt-4 pb-8 space-y-4">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">
                {campaign.type?.replace(/-/g, " ") ?? "Campaign"}
              </p>
              <h1 className="text-xl font-black uppercase tracking-tight italic leading-tight">
                {campaign.name}
              </h1>
            </div>
            {/* Campaign status badge */}
            <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-1 border ${statusColor(campaign.status)}`}>
              {campaign.status?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Business */}
          <div className="flex items-center gap-3">
            {(business?.logo_url || campaign.logo_url) ? (
              <img src={business?.logo_url ?? campaign.logo_url}
                className="w-10 h-10 object-cover border-2 border-white/20" alt="logo" />
            ) : (
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center border-2 border-white/20">
                <Megaphone className="w-5 h-5 text-white/40" />
              </div>
            )}
            <div>
              <p className="font-black text-sm uppercase tracking-tight">
                {business?.name ?? campaign.business_name ?? "Business"}
              </p>
              {business?.website && (
                <p className="text-[9px] text-white/40">{business.website}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── My Status (if I'm part of this campaign) ── */}
        {myRecord && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="border-2 border-[#1D1D1D] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3">My Status</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase px-3 py-1.5 ${myStatusColor(myRecord.status)}`}>
                  {myRecord.status?.replace(/_/g, " ")}
                </span>
                <div>
                  <p className="text-xs font-black">
                    {myRecord.streams_completed ?? 0} / {myRecord.streams_target ?? streams} streams
                  </p>
                  <p className="text-[9px] text-gray-400">
                    ₦{(myRecord.total_earnings ?? 0).toLocaleString()} earned
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-20">
                <div className="h-1.5 bg-gray-100 w-full overflow-hidden">
                  <div className="h-full bg-[#389C9A]"
                    style={{ width: `${myRecord.streams_target > 0 ? (myRecord.streams_completed / myRecord.streams_target) * 100 : 0}%` }} />
                </div>
                <p className="text-[7px] text-gray-400 mt-0.5 text-right">
                  {myRecord.streams_target > 0
                    ? Math.round((myRecord.streams_completed / myRecord.streams_target) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Key Stats ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3">
          {[
            { icon: DollarSign, color: "text-[#389C9A]", label: "Budget",   val: `₦${Number(budget).toLocaleString()}` },
            { icon: Zap,        color: "text-[#FEDB71]", label: "Streams",  val: streams || "—" },
            { icon: Users,      color: "text-[#389C9A]", label: "Creators", val: campaign.creators_target ?? campaign.creator_count ?? "—" },
            { icon: Eye,        color: "text-[#1D1D1D]", label: "Min Viewers", val: (campaign.min_viewers || campaign.min_followers || 0).toLocaleString() },
          ].map((s, i) => (
            <div key={i} className="border-2 border-[#1D1D1D] p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className="text-xl font-black italic">{s.val}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Dates ── */}
        {(campaign.start_date || deadline) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="border-2 border-[#1D1D1D] p-4 flex items-center justify-between">
            {campaign.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#389C9A]" />
                <div>
                  <p className="text-[8px] uppercase tracking-widest opacity-40 font-black">Start</p>
                  <p className="text-xs font-black">{new Date(campaign.start_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FEDB71]" />
                <div>
                  <p className="text-[8px] uppercase tracking-widest opacity-40 font-black">Deadline</p>
                  <p className="text-xs font-black">{new Date(deadline).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Description / Brief ── */}
        {(campaign.description || campaign.brief) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="border-2 border-[#1D1D1D] p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#389C9A]" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Brief</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {campaign.description || campaign.brief}
            </p>
          </motion.div>
        )}

        {/* ── Target Info ── */}
        {(campaign.target_niches?.length > 0 || campaign.niche_tags?.length > 0 ||
          campaign.target_location || campaign.target_locations?.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="border-2 border-[#1D1D1D] p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Targeting</p>

            {(campaign.target_niches?.length > 0 || campaign.niche_tags?.length > 0) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-[#389C9A]" />
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Niches</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(campaign.target_niches ?? campaign.niche_tags ?? []).map((n: string) => (
                    <span key={n} className="px-2 py-1 bg-[#F8F8F8] text-[8px] font-black uppercase tracking-widest border border-[#1D1D1D]/10">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(campaign.target_location || campaign.target_locations?.length > 0) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-[#FEDB71]" />
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Location</p>
                </div>
                <p className="text-xs font-bold">
                  {campaign.target_location ?? (campaign.target_locations ?? []).join(", ")}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Promo Code ── */}
        {campaign.promo_code && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="border-2 border-[#FEDB71] bg-[#FEDB71]/10 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Promo Code</p>
            <p className="text-2xl font-black italic tracking-widest">{campaign.promo_code}</p>
          </motion.div>
        )}

        {/* ── Business About ── */}
        {business?.bio && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="border-2 border-[#1D1D1D] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[#389C9A]" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">About the Brand</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{business.bio}</p>
          </motion.div>
        )}

        {/* ── CTA ── */}
        {myRecord && normalise(myRecord.status) === "active" && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            onClick={() => navigate(`/campaign/live-update/${id}`)}
            className="w-full bg-[#389C9A] text-white py-4 text-[10px] font-black uppercase tracking-widest italic hover:bg-[#1D1D1D] transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Update Stream Progress
          </motion.button>
        )}

      </main>

      <BottomNav />
    </div>
  );
}

export default CampaignSummary;
