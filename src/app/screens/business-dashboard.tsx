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
  Search,
  BarChart3,
  LucideImageIcon,
  Check,
  Tv,
  Ticket,
  Star,
  HelpCircle,
  LogOut,
  MoreHorizontal,
  Image as LucideImageIcon2,
} from "lucide-react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { DeclineOfferModal } from "../components/decline-offer-modal";

// Helper to normalise status strings
const normaliseStatus = (s: string = "") => s.toLowerCase().replace(/[\s_]+/g, "_");

// Format relative time
const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
};

export function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Business data
  const [businessId, setBusinessId]     = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogo, setBusinessLogo] = useState<string>("");
  const [businessDescription, setBusinessDescription] = useState<string>("");
  const [businessWebsite, setBusinessWebsite] = useState<string>("");
  const [businessIndustry, setBusinessIndustry] = useState<string>("");
  const [businessContactPhone, setBusinessContactPhone] = useState<string>("");
  const [businessContactEmail, setBusinessContactEmail] = useState<string>("");
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [campaigns, setCampaigns]       = useState<any[]>([]);
  const [offers, setOffers]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  // UI state
  const [campaignFilter, setCampaignFilter] = useState<"LIVE" | "PENDING" | "COMPLETED">("LIVE");
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  // ─── Fetch business with all relevant fields ─────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchBusiness = async () => {
      if (!user.email_confirmed_at) {
        navigate("/confirm-email", { state: { email: user.email } });
        return;
      }

      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .select("id, business_name, logo_url, description, website, industry, phone_number, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bizError) {
        console.error("Business fetch error:", bizError);
        setLoading(false);
        return;
      }

      if (business) {
        setBusinessId(business.id);
        setBusinessName(business.business_name || "");
        setBusinessLogo(business.logo_url || "");
        setBusinessDescription(business.description || "");
        setBusinessWebsite(business.website || "");
        setBusinessIndustry(business.industry || "");
        setBusinessContactPhone(business.phone_number || "");
        setBusinessContactEmail(business.email || "");

        // Calculate profile completion percentage
        const fields = [
          { name: "business_name", value: business.business_name },
          { name: "logo_url", value: business.logo_url },
          { name: "description", value: business.description },
          { name: "website", value: business.website },
          { name: "industry", value: business.industry },
          { name: "phone_number", value: business.phone_number },
          { name: "email", value: business.email },
        ];
        const filledCount = fields.filter(f => f.value && f.value.trim() !== "").length;
        const percentage = Math.round((filledCount / fields.length) * 100);
        setCompletionPercentage(percentage);
      } else {
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user]);

  // ─── Fetch campaigns + offers ─────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    const fetchData = async () => {
      setLoading(true);

      // Fetch campaigns with their campaign_creators
      const { data: campaignData, error: campErr } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_creators (
            id,
            status,
            streams_completed,
            streams_target
          )
        `)
        .eq("business_id", businessId);

      if (campErr) console.error("Campaign fetch error:", campErr);

      // Fetch offers (from creators)
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

  // ─── Stats calculations ──────────────────────────────────────────
  const active    = campaigns.filter(c => normaliseStatus(c.status) === "active").length;
  const pending   = campaigns.filter(c =>
    ["pending_review", "not_started", "pending"].includes(normaliseStatus(c.status))
  ).length;
  const completed = campaigns.filter(c => normaliseStatus(c.status) === "completed").length;

  const totalSpent = campaigns.reduce((sum, c) => {
    const raw = c.budget ?? c.pay_rate ?? c.price ?? 0;
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.]/g, "")) || 0;
    return sum + num;
  }, 0);

  // Promo code usage – we don't have this data, default 0
  const promoCount = 0;

  // ─── Accept / Reject offers ──────────────────────────────────────
  const acceptOffer = async (offer: any) => {
    try {
      const { error: offerErr } = await supabase
        .from("offers")
        .update({ status: "Accepted" })
        .eq("id", offer.id);

      if (offerErr) throw offerErr;

      // Optionally create campaign_creator entry if not already present
      const { error: ccErr } = await supabase
        .from("campaign_creators")
        .insert({
          campaign_id: offer.campaign_id,
          creator_id: offer.creator_id,
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

    if (error) {
      toast.error("Failed to reject offer");
      return;
    }
    toast.success("Offer rejected");
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  // Show decline modal (for reject)
  const handleDeclineClick = (offer: any) => {
    setSelectedOffer(offer);
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = (reason: string) => {
    if (!selectedOffer) return;
    // Reject the offer
    rejectOffer(selectedOffer.id);
    setIsDeclineModalOpen(false);
    setSelectedOffer(null);
  };

  // ─── Campaign filtering ──────────────────────────────────────────
  const filteredCampaigns = campaigns.filter(c => {
    const s = normaliseStatus(c.status);
    if (campaignFilter === "LIVE")      return s === "active" || s === "open";
    if (campaignFilter === "PENDING")   return ["pending_review", "not_started", "pending"].includes(s);
    if (campaignFilter === "COMPLETED") return s === "completed";
    return false;
  });

  // Helper to get campaign stats
  const getCampaignStats = (campaign: any) => {
    const creators = campaign.campaign_creators || [];
    const joined = creators.length;
    const target = campaign.max_creators || 5; // fallback if not set

    const totalStreamsCompleted = creators.reduce((sum: number, cc: any) => sum + (cc.streams_completed || 0), 0);
    const totalStreamsTarget = creators.reduce((sum: number, cc: any) => sum + (cc.streams_target || 0), 0);

    const creatorSummary = `${joined} Active · ${creators.filter((c: any) => c.status === 'PENDING').length} Pending · ${creators.filter((c: any) => c.status === 'NOT STARTED').length} Not Started`;

    return { joined, target, totalStreamsCompleted, totalStreamsTarget, creatorSummary };
  };

  // Status badge and dot colors
  const getStatusBadgeClass = (status: string) => {
    const s = normaliseStatus(status);
    if (s === "active" || s === "open") return "bg-[#389C9A] text-white border-[#389C9A]";
    if (["pending_review", "not_started", "pending"].includes(s)) return "bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10";
    if (s === "completed") return "bg-gray-100 text-gray-500 border-gray-200";
    return "bg-gray-100 text-gray-400 border-gray-200";
  };

  const getStatusDotClass = (status: string) => {
    const s = normaliseStatus(status);
    if (s === "active" || s === "open") return "bg-[#389C9A]";
    if (["pending_review", "not_started", "pending"].includes(s)) return "bg-[#FEDB71]";
    return "bg-[#1D1D1D]/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-32 max-w-[480px] mx-auto w-full">
      <Toaster position="top-center" richColors />

      {/* Profile Completion Banner */}
      <AnimatePresence>
        {completionPercentage < 100 && showCompletionBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#FEDB71] px-8 py-4 flex flex-col gap-3 relative border-b border-[#1D1D1D]/10"
          >
            <button onClick={() => setShowCompletionBanner(false)} className="absolute top-4 right-6">
              <X className="w-4 h-4" />
            </button>
            <p className="text-[10px] font-black uppercase tracking-widest leading-tight pr-8 italic">
              Profile {completionPercentage}% Complete. Add missing details to improve your brand presence.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-1 bg-[#1D1D1D]/10 rounded-none overflow-hidden">
                <div
                  className="h-full bg-[#1D1D1D]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <button
                onClick={() => navigate("/business/profile")}
                className="bg-[#1D1D1D] text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest italic"
              >
                Complete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader showLogo userType="business" subtitle="Business Hub" />

      {/* Primary CTA */}
      <div className="sticky top-[84px] z-40 bg-white px-8 py-6 border-b border-[#1D1D1D]">
        <button
          onClick={() => navigate("/business/create-campaign")}
          className="w-full bg-[#1D1D1D] text-white p-6 text-xl font-black uppercase tracking-tight flex items-center justify-center gap-4 active:scale-[0.98] transition-all italic"
        >
          🎯 Create a Campaign
          <ArrowRight className="w-6 h-6 text-[#FEDB71]" />
        </button>
        <p className="text-center text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mt-4 italic">
          Partner with a creator in under 10 minutes.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="px-8 mt-12">
        <div className="grid grid-cols-2 gap-[1px] bg-[#1D1D1D] border-2 border-[#1D1D1D]">
          <div className="bg-white p-6 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">Active</span>
            <span className="text-2xl font-black italic">{active}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#389C9A]">Live Now</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">Pending</span>
            <span className="text-2xl font-black italic">{pending}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#389C9A]">Response</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">Spent</span>
            <span className="text-2xl font-black italic">₦{totalSpent.toLocaleString()}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#389C9A]">Total</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">Promo</span>
            <span className="text-2xl font-black italic">{promoCount}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#389C9A]">Used</span>
          </div>
        </div>
      </div>

      {/* My Campaigns Section */}
      <div className="px-8 mt-16">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic underline decoration-[#389C9A] decoration-4 underline-offset-4">
              My Campaigns
            </h2>
          </div>

          <div className="flex gap-8 border-b border-[#1D1D1D]/10">
            {(["LIVE", "PENDING", "COMPLETED"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCampaignFilter(tab)}
                className={`pb-4 text-[10px] font-black uppercase tracking-widest italic transition-all relative ${
                  campaignFilter === tab ? "text-[#389C9A]" : "text-[#1D1D1D]/30"
                }`}
              >
                {tab}
                {campaignFilter === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#389C9A]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {filteredCampaigns.length > 0 ? (
            filteredCampaigns.map(camp => {
              const stats = getCampaignStats(camp);
              return (
                <div
                  key={camp.id}
                  onClick={() => navigate(`/business/campaign/overview/${camp.id}`)}
                  className="bg-white border-2 border-[#1D1D1D] rounded-none overflow-hidden transition-transform active:scale-[0.99] cursor-pointer"
                >
                  {/* Top Section */}
                  <div className="p-6 grid grid-cols-[auto_1fr_auto] gap-6 items-start">
                    {/* Logo */}
                    <div className="w-16 h-16 bg-[#F8F8F8] border border-[#1D1D1D]/10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {camp.business?.logo_url ? (
                        <ImageWithFallback src={camp.business.logo_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-[#1D1D1D]/20 uppercase">{camp.name[0]}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-black uppercase tracking-tight italic leading-tight">{camp.name}</h3>
                      <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">{camp.type}</p>

                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-[#389C9A]" />
                          <span className="text-[10px] font-black uppercase tracking-tight">
                            {stats.joined} of {stats.target} creators joined
                          </span>
                        </div>
                        {stats.joined < stats.target && camp.status !== "COMPLETED" && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] italic">
                            Still accepting applications
                          </span>
                        )}
                        {stats.joined === stats.target && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                            Creator slots filled ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Price */}
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest italic border ${getStatusBadgeClass(camp.status)}`}>
                        {camp.status}
                      </div>
                      <span className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-tight italic">
                        ₦{Number(camp.budget ?? camp.pay_rate ?? camp.price ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Bar */}
                  <div className="bg-[#1D1D1D] px-6 py-4 flex justify-between items-center italic">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-white/90">
                      <span className="opacity-60">STREAMS: {stats.totalStreamsCompleted}/{stats.totalStreamsTarget}</span>
                      <span className="opacity-20 text-[6px]">•</span>
                      <span className="tracking-widest opacity-80">{stats.creatorSummary.toUpperCase()}</span>
                    </div>
                    <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FEDB71] hover:translate-x-1 transition-transform">
                      VIEW CAMPAIGN <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 flex flex-col items-center text-center gap-6 bg-[#F8F8F8] border-2 border-dashed border-[#1D1D1D]/10 px-8">
              <div className="p-6 bg-white border-2 border-[#1D1D1D] rounded-full">
                <Megaphone className="w-8 h-8 text-[#389C9A]" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic">No campaigns yet</h3>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest italic mt-2 max-w-[240px] mx-auto">
                  Post your first campaign offer to start matching with creators.
                </p>
              </div>
              <button
                onClick={() => navigate("/business/create-campaign")}
                className="w-full bg-[#1D1D1D] text-white p-6 text-sm font-black uppercase tracking-widest italic active:scale-[0.98] transition-all"
              >
                Create Your First Campaign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Incoming Offers Section */}
      {offers.length > 0 && (
        <div className="px-8 mt-16">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="w-5 h-5 text-[#389C9A]" />
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Incoming Offers</h2>
          </div>
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {offers.map(offer => (
                <motion.div
                  layout
                  key={offer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black uppercase tracking-tight leading-none mb-1 text-lg">
                        {offer.campaigns?.name ?? "Campaign"}
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#389C9A] italic">
                        {offer.creator_profiles?.full_name ?? "Creator"}
                      </p>
                    </div>
                    <div className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[7px] font-black uppercase tracking-widest italic border border-[#1D1D1D]/10">
                      {offer.status}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 italic">
                      {formatTimeAgo(offer.created_at)}
                    </p>
                    <span className="text-sm font-black italic">
                      ₦{Number(offer.rate ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => acceptOffer(offer)}
                      className="bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all italic border-2 border-[#1D1D1D]"
                    >
                      <Check className="w-4 h-4 text-[#389C9A]" /> Accept Offer
                    </button>
                    <button
                      onClick={() => handleDeclineClick(offer)}
                      className="bg-white text-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all italic border-2 border-[#1D1D1D]"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Browse Creators Quick Link */}
      <div className="px-8 mt-8">
        <button
          onClick={() => navigate("/browse")}
          className="w-full bg-[#F8F8F8] border-2 border-dashed border-[#1D1D1D]/20 p-6 flex items-center justify-between group hover:border-[#389C9A] hover:bg-[#389C9A]/5 transition-all italic"
        >
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-white border border-[#1D1D1D]/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-[#389C9A]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Browse Creators</p>
              <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 italic">Find new partners to grow your brand</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#1D1D1D] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-8 mt-16 pb-12">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => navigate("/business/asset-library")}
            className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex items-center justify-between group active:bg-[#1D1D1D] active:text-white transition-all italic"
          >
            <div className="flex items-center gap-6">
              <LucideImageIcon2 className="w-6 h-6 text-[#389C9A]" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">Asset Library</p>
                <p className="text-[8px] font-medium uppercase tracking-widest opacity-40 italic">Manage your banners</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-[#FEDB71]" />
          </button>
          <button
            onClick={() => navigate("/business/analytics")}
            className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex items-center justify-between group active:bg-[#1D1D1D] active:text-white transition-all italic"
          >
            <div className="flex items-center gap-6">
              <BarChart3 className="w-6 h-6 text-[#389C9A]" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">Analytics</p>
                <p className="text-[8px] font-medium uppercase tracking-widest opacity-40 italic">Performance reports</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-[#FEDB71]" />
          </button>
        </div>
      </div>

      {/* Decline Modal */}
      {selectedOffer && (
        <DeclineOfferModal
          isOpen={isDeclineModalOpen}
          onClose={() => setIsDeclineModalOpen(false)}
          onConfirm={handleConfirmDecline}
          offerDetails={{
            partnerName: selectedOffer.creator_profiles?.full_name ?? "Creator",
            offerName: selectedOffer.campaigns?.name ?? "Campaign",
            campaignType: selectedOffer.campaigns?.type ?? "Banner + Code",
            amount: `₦${Number(selectedOffer.rate ?? 0).toLocaleString()}`,
            logo: selectedOffer.creator_profiles?.avatar_url || "https://images.unsplash.com/photo-1758179759979-c0c2235ae172?w=100&h=100&fit=crop",
            partnerType: "Creator",
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}