import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { useAuth } from "../lib/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Clock,
  CheckCircle2,
  X,
  ArrowRight,
  Plus,
  Zap,
  DollarSign,
  Users,
  ChevronRight,
} from "lucide-react";

// ── Normalise status so comparisons work regardless of case/format ──
const normaliseStatus = (s: string = "") => s.toLowerCase().replace(/[\s_]+/g, "_");

export function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [businessId, setBusinessId]     = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [campaigns, setCampaigns]       = useState<any[]>([]);
  const [offers, setOffers]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<"LIVE" | "PENDING" | "COMPLETED">("LIVE");

  /* ── Fetch business ── */
  useEffect(() => {
    if (!user) return;
    const fetchBusiness = async () => {
      if (!user.email_confirmed_at) {
        navigate("/confirm-email", { state: { email: user.email } });
        return;
      }

      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bizError) {
        console.error("Business fetch error:", bizError);
        setLoading(false);
        return;
      }

      if (business) {
        setBusinessId(business.id);
        setBusinessName(business.name || "");
      } else {
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user]);

  /* ── Fetch campaigns + offers ── */
  useEffect(() => {
    if (!businessId) return;
    const fetchData = async () => {
      setLoading(true);

      const { data: campaignData, error: campErr } = await supabase
        .from("campaigns")
        .select(`*, campaign_creators(id, status)`)
        .eq("business_id", businessId);

      if (campErr) console.error("Campaign fetch error:", campErr);

      // Fetch offers with creator profile and campaign name joined
      const { data: offerData, error: offerErr } = await supabase
        .from("offers")
        .select(`
          *,
          creator_profiles!creator_id (id, full_name, avatar_url),
          campaigns!campaign_id (id, name, type)
        `)
        .eq("business_id", businessId)
        .in("status", ["Offer Received", "Negotiating"]);

      if (offerErr) console.error("Offer fetch error:", offerErr);

      setCampaigns(campaignData || []);
      setOffers(offerData || []);
      setLoading(false);
    };
    fetchData();
  }, [businessId]);

  /* ── Stats — normalised so "active" / "ACTIVE" / "Active" all match ── */
  const active    = campaigns.filter(c => normaliseStatus(c.status) === "active").length;
  const pending   = campaigns.filter(c =>
    ["pending_review", "not_started", "pending"].includes(normaliseStatus(c.status))
  ).length;
  const completed = campaigns.filter(c => normaliseStatus(c.status) === "completed").length;

  // Accept budget / pay_rate / price — handles number or formatted string
  const totalSpent = campaigns.reduce((sum, c) => {
    const raw = c.budget ?? c.pay_rate ?? c.price ?? 0;
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.]/g, "")) || 0;
    return sum + num;
  }, 0);

  /* ── Accept / Reject offers ── */
  const acceptOffer = async (offer: any) => {
    try {
      const { error: offerErr } = await supabase
        .from("offers")
        .update({ status: "Accepted" })
        .eq("id", offer.id);

      if (offerErr) throw offerErr;

      const { error: ccErr } = await supabase
        .from("campaign_creators")
        .insert({
          campaign_id: offer.campaign_id,
          creator_id: offer.creator_id,   // FK → creator_profiles.id
          status: "NOT STARTED",
          streams_target: offer.streams ?? 4,
        });

      if (ccErr) throw ccErr;

      toast.success("Offer accepted!");
      setOffers(prev => prev.filter(o => o.id !== offer.id));
    } catch (e: any) {
      console.error("Error accepting offer:", e);
      toast.error(`Failed to accept offer: ${e.message}`);
    }
  };

  const rejectOffer = async (offerId: string) => {
    const { error } = await supabase
      .from("offers")
      .update({ status: "Rejected" })
      .eq("id", offerId);

    if (error) { toast.error("Failed to reject offer"); return; }
    toast.success("Offer rejected");
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  /* ── Filter campaigns for list ── */
  const filteredCampaigns = campaigns.filter(c => {
    const s = normaliseStatus(c.status);
    if (campaignFilter === "LIVE")      return s === "active";
    if (campaignFilter === "PENDING")   return ["pending_review", "not_started", "pending"].includes(s);
    if (campaignFilter === "COMPLETED") return s === "completed";
    return false;
  });

  /* ── Status dot + badge colour helpers ── */
  const statusDot = (status: string) => {
    const s = normaliseStatus(status);
    if (s === "active") return "bg-[#389C9A]";
    if (["pending_review", "not_started", "pending"].includes(s)) return "bg-[#FEDB71]";
    return "bg-[#1D1D1D]/20";
  };

  const statusBadge = (status: string) => {
    const s = normaliseStatus(status);
    if (s === "active")
      return "bg-[#389C9A]/10 border-[#389C9A]/30 text-[#389C9A]";
    if (["pending_review", "not_started", "pending"].includes(s))
      return "bg-[#FEDB71]/10 border-[#FEDB71]/50 text-[#1D1D1D]";
    return "bg-[#F8F8F8] border-[#1D1D1D]/10 text-[#1D1D1D]/40";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="business" subtitle="Business Hub" />

      <main className="max-w-[480px] mx-auto w-full">

        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-6 bg-[#1D1D1D] text-white p-6"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Welcome back</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-tight">
            {businessName || "Your Business"}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 bg-[#389C9A] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/60 italic">
              {active} campaign{active !== 1 ? "s" : ""} live
            </span>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 px-6 mt-4">
          {[
            { label: "Active",    val: active,                            sub: "Live Now",     icon: Zap,          color: "text-[#389C9A]" },
            { label: "Pending",   val: pending,                           sub: "Reviewing",    icon: Clock,        color: "text-[#FEDB71]" },
            { label: "Completed", val: completed,                         sub: "Finished",     icon: CheckCircle2, color: "text-[#1D1D1D]/40" },
            { label: "Spent",     val: `₦${totalSpent.toLocaleString()}`, sub: "Total Budget", icon: DollarSign,   color: "text-[#389C9A]" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="border-2 border-[#1D1D1D] p-4 bg-white"
            >
              <s.icon className={`w-4 h-4 ${s.color} mb-3`} />
              <p className="text-2xl font-black italic tracking-tight">{s.val}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
              <p className="text-[8px] font-bold uppercase text-[#389C9A] italic">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Incoming Offers ── */}
        <AnimatePresence>
          {offers.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] italic">
                  Incoming Offers
                </h2>
                <span className="bg-[#FEDB71] border border-[#1D1D1D] px-2 py-0.5 text-[8px] font-black uppercase">
                  {offers.length} new
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {offers.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-2 border-[#1D1D1D] p-5 bg-white"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight italic">
                          {o.campaigns?.name ?? "Campaign"}
                        </p>
                        <p className="text-[9px] font-bold text-[#389C9A] uppercase tracking-widest">
                          {o.creator_profiles?.full_name ?? "Creator"}
                        </p>
                      </div>
                      <span className="text-[10px] font-black italic">
                        {o.rate ? `₦${Number(o.rate).toLocaleString()}` : ""}
                      </span>
                    </div>
                    {o.message && (
                      <p className="text-[9px] text-[#1D1D1D]/50 mb-3 italic border-l-2 border-[#1D1D1D]/10 pl-2">
                        {o.message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptOffer(o)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D1D1D] text-white py-2.5 text-[9px] font-black uppercase tracking-widest italic hover:bg-[#389C9A] transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Accept
                      </button>
                      <button
                        onClick={() => rejectOffer(o.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 border-2 border-[#1D1D1D] py-2.5 text-[9px] font-black uppercase tracking-widest italic hover:bg-red-50 hover:border-red-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Campaigns ── */}
        <section className="px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] italic">My Campaigns</h2>
            <button
              onClick={() => navigate("/business/create-campaign")}
              className="flex items-center gap-1.5 bg-[#389C9A] text-white px-3 py-2 text-[9px] font-black uppercase tracking-widest italic hover:bg-[#1D1D1D] transition-colors"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-4 border-2 border-[#1D1D1D] p-1">
            {(["LIVE", "PENDING", "COMPLETED"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCampaignFilter(tab)}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest italic transition-colors ${
                  campaignFilter === tab
                    ? "bg-[#1D1D1D] text-white"
                    : "text-[#1D1D1D]/40 hover:text-[#1D1D1D]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Campaign List */}
          <div className="flex flex-col gap-3">
            {filteredCampaigns.length === 0 ? (
              <div className="border-2 border-dashed border-[#1D1D1D]/20 p-10 text-center">
                <Megaphone className="w-8 h-8 text-[#1D1D1D]/20 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/30">
                  No {campaignFilter.toLowerCase()} campaigns
                </p>
                {campaignFilter === "LIVE" && (
                  <button
                    onClick={() => navigate("/business/create-campaign")}
                    className="mt-4 px-4 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase italic hover:bg-[#389C9A] transition-colors"
                  >
                    Create Campaign
                  </button>
                )}
              </div>
            ) : (
              filteredCampaigns.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/business/campaign/overview/${c.id}`)}
                  className="border-2 border-[#1D1D1D] p-5 cursor-pointer hover:bg-[#F8F8F8] active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 flex-shrink-0 ${statusDot(c.status)}`} />
                        <h3 className="text-[12px] font-black uppercase tracking-tight italic truncate">{c.name}</h3>
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic ml-4">{c.type}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20 group-hover:text-[#389C9A] flex-shrink-0 ml-2 transition-colors" />
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1D1D1D]/10">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[9px] font-black uppercase italic">
                        {c.campaign_creators?.length || 0} creator{c.campaign_creators?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {(c.budget ?? c.pay_rate ?? c.price) != null && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-[#FEDB71]" />
                        <span className="text-[9px] font-black uppercase italic">
                          ₦{Number(c.budget ?? c.pay_rate ?? c.price).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <span className={`ml-auto text-[8px] font-black uppercase px-2 py-0.5 border italic ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="px-6 mt-8 mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.25em] italic mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: "Browse Creators",   path: "/browse",            icon: Users },
              { label: "Create Campaign",   path: "/business/create-campaign",     icon: Megaphone },
              { label: "Business Settings", path: "/business/settings", icon: ArrowRight },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between px-5 py-4 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] hover:bg-[#F8F8F8] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4 text-[#389C9A]" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">{action.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20 group-hover:text-[#1D1D1D] transition-colors" />
              </button>
            ))}
          </div>
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
