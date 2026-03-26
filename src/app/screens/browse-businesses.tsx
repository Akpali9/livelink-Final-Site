import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Filter, ArrowRight, X, Users, CheckCircle2, Bookmark, BookmarkCheck,
  Briefcase, MapPin, Clock, RefreshCw, Loader2, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/ImageWithFallback";

// ──────────────────────────────────────────────────────────────
// Types (unchanged)
// ──────────────────────────────────────────────────────────────

type PartnershipType = "Pay + Code" | "Paying" | "Code Only" | "Open to Offers";

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string;
  industry: string;
  city: string;
  country: string;
  description: string;
  email: string;
  phone_number: string;
  website: string;
  verification_status: string;
}

interface CampaignWithBusiness {
  id: string;
  name: string;
  type: string;
  description: string;
  budget: number;
  pay_rate: number;
  bid_amount: number;
  status: string;
  start_date: string;
  end_date: string;
  target_niches: string[];
  target_locations: string[];
  min_followers: number;
  streams_required: number;
  created_at: string;
  business_id: string;
  business: Business | null;
  partnership_type: PartnershipType;
}

// ──────────────────────────────────────────────────────────────
// Helpers (unchanged)
// ──────────────────────────────────────────────────────────────

function getBadgeColor(type: PartnershipType) {
  switch (type) {
    case "Pay + Code":     return "bg-[#1D1D1D] text-white border-none";
    case "Paying":         return "bg-[#389C9A] text-white border-none";
    case "Code Only":      return "bg-[#FEDB71] text-[#1D1D1D] border-none";
    case "Open to Offers": return "bg-white text-[#1D1D1D] border-2 border-[#1D1D1D]";
    default:               return "bg-[#1D1D1D] text-white";
  }
}

function getPartnershipType(campaign: any): PartnershipType {
  if (campaign.pay_rate > 0 && campaign.type?.toLowerCase().includes("code")) return "Pay + Code";
  if (campaign.pay_rate > 0)                                                    return "Paying";
  if (campaign.type?.toLowerCase().includes("code"))                            return "Code Only";
  return "Open to Offers";
}

function formatDeadline(dateString?: string): string {
  if (!dateString) return "No deadline";
  const diffDays = Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000);
  if (diffDays < 0)   return "Closed";
  if (diffDays === 0) return "Closing today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function getPayRate(campaign: CampaignWithBusiness): string {
  const amount = campaign.pay_rate || campaign.bid_amount || campaign.budget;
  return amount ? `₦${Number(amount).toLocaleString()}` : "Negotiable";
}

// Compute niche match percentage (simple heuristic)
function getNicheMatchPercentage(creatorNiches: string[], campaignNiches: string[]): number {
  if (!campaignNiches.length) return 100; // no specific niche required
  if (!creatorNiches.length) return 0;
  const common = campaignNiches.filter(niche => creatorNiches.some(cn => cn.toLowerCase() === niche.toLowerCase()));
  return Math.round((common.length / campaignNiches.length) * 100);
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

export function BrowseBusinesses() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaigns, setCampaigns]               = useState<CampaignWithBusiness[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [applying, setApplying]                 = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithBusiness | null>(null);
  const [savedIds, setSavedIds]                 = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds]             = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen]         = useState(false);
  const [lastUpdated, setLastUpdated]           = useState<Date>(new Date());
  const [creatorProfile, setCreatorProfile]     = useState<any>(null);
  const [creatorId, setCreatorId]               = useState<string | null>(null);
  const [activeFilters, setActiveFilters]       = useState<{ industry: string; type: string }>({
    industry: "All",
    type: "All",
  });

  // ─── Fetch campaigns (unchanged) ───────────────────────────────────
  const fetchCampaigns = useCallback(async (silent = false) => {
    if (!user) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select(`
          id, name, type, description, budget, pay_rate, bid_amount,
          status, start_date, end_date, target_niches, target_locations,
          min_followers, streams_required, created_at, business_id
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        setLastUpdated(new Date());
        if (silent) toast.info("No active campaigns found");
        return;
      }

      const businessIds = [...new Set(campaignsData.map((c) => c.business_id).filter(Boolean))];
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id, user_id, business_name, logo_url, industry, city, country, description, email, phone_number, website, verification_status")
        .in("id", businessIds);

      const bizMap: Record<string, Business> = {};
      (bizData || []).forEach((b) => { bizMap[b.id] = b; });

      const formatted: CampaignWithBusiness[] = campaignsData.map((c) => ({
        ...c,
        streams_required: c.streams_required || 3,
        partnership_type: getPartnershipType(c),
        business: bizMap[c.business_id] || null,
      }));

      setCampaigns(formatted);
      setLastUpdated(new Date());
      if (silent) toast.success(`Updated — ${formatted.length} active campaigns`);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      if (silent) toast.error("Failed to refresh campaigns");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // ─── Fetch creator profile (unchanged) ────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("creator_profiles")
        .select("id, avg_viewers, avg_concurrent, niche, categories, status, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setCreatorProfile(data);
        setCreatorId(data.id);
      }
    };
    fetch();
  }, [user]);

  // ─── Fetch applications & saved (unchanged) ───────────────────────
  useEffect(() => {
    if (!creatorId || !user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("campaign_creators")
        .select("campaign_id")
        .eq("creator_id", creatorId);
      if (data) setAppliedIds(new Set(data.map((a) => a.campaign_id)));

      const saved = localStorage.getItem(`saved_campaigns_${user.id}`);
      if (saved) setSavedIds(new Set(JSON.parse(saved)));
    };
    fetch();

    const sub = supabase
      .channel(`applications-${creatorId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "campaign_creators",
        filter: `creator_id=eq.${creatorId}`,
      }, (payload) => {
        setAppliedIds((prev) => new Set(prev).add(payload.new.campaign_id));
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [creatorId, user]);

  // ─── Realtime subscriptions (unchanged) ──────────────────────────
  useEffect(() => {
    if (!user) return;

    fetchCampaigns();

    const campaignSub = supabase
      .channel("browse-campaigns")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "campaigns", filter: "status=eq.active",
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          toast.info("New campaign available!", { description: "A new opportunity has been posted", duration: 5000 });
        }
        fetchCampaigns(true);
      })
      .subscribe();

    const bizSub = supabase
      .channel("browse-businesses")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "businesses" }, () => {
        fetchCampaigns(true);
      })
      .subscribe();

    return () => {
      campaignSub.unsubscribe();
      bizSub.unsubscribe();
    };
  }, [user, fetchCampaigns]);

  // ─── Save toggle (unchanged) ─────────────────────────────────────
  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Please login to save campaigns"); navigate("/login/portal"); return; }

    const next = new Set(savedIds);
    if (next.has(id)) { next.delete(id); toast.success("Removed from saved"); }
    else              { next.add(id);    toast.success("Campaign saved!"); }

    setSavedIds(next);
    localStorage.setItem(`saved_campaigns_${user.id}`, JSON.stringify([...next]));
  };

  // ─── Apply logic (unchanged) ─────────────────────────────────────
  const applyToCampaign = async (campaign: CampaignWithBusiness, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!user) {
      toast.error("Please login to apply");
      navigate("/login/portal");
      return;
    }
    if (!creatorId || !creatorProfile) {
      toast.error("Complete your creator profile first");
      navigate("/become-creator");
      return;
    }
    if (creatorProfile.status !== "active") {
      toast.error("Your creator account must be approved before applying");
      return;
    }

    const avgViewers = creatorProfile.avg_viewers || creatorProfile.avg_concurrent || 0;
    if ((campaign.min_followers || 0) > 0 && avgViewers < campaign.min_followers) {
      toast.error(`This campaign requires at least ${campaign.min_followers} average viewers. You have ${avgViewers}.`);
      return;
    }

    if (appliedIds.has(campaign.id)) {
      toast.info("You've already applied to this campaign");
      return;
    }

    setApplying(true);
    try {
      // Double-check for existing application
      const { data: existing } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", creatorId)
        .maybeSingle();

      if (existing) {
        setAppliedIds((prev) => new Set(prev).add(campaign.id));
        toast.info("You've already applied to this campaign");
        return;
      }

      // Insert application
      const { error: insertError } = await supabase
        .from("campaign_creators")
        .insert({
          campaign_id:       campaign.id,
          creator_id:        creatorId,
          status:            "pending",
          streams_target:    campaign.streams_required || 3,
          streams_completed: 0,
          total_earnings:    campaign.pay_rate || campaign.bid_amount || campaign.budget || 0,
          paid_out:          0,
          created_at:        new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Optimistic UI update
      setAppliedIds((prev) => new Set(prev).add(campaign.id));
      setSelectedCampaign((prev) => prev?.id === campaign.id ? { ...prev } : prev);

      toast.success("Application submitted! 🎉", {
        description: `You've applied to ${campaign.business?.business_name || campaign.name}`,
      });

      // Notify the business owner
      if (campaign.business?.user_id) {
        await supabase.from("notifications").insert({
          user_id:    campaign.business.user_id,
          type:       "new_application",
          title:      "New Campaign Application! 🎉",
          message:    `${creatorProfile.full_name || "A creator"} applied to your campaign "${campaign.name}"`,
          data: {
            campaign_id: campaign.id,
            creator_id:  creatorId,
          },
          created_at: new Date().toISOString(),
        }).catch(console.error);
      }

      // Close modal after a short delay
      setTimeout(() => setSelectedCampaign(null), 1200);
    } catch (error: any) {
      console.error("Error applying:", error);
      toast.error("Failed to submit application", { description: error?.message });
    } finally {
      setApplying(false);
    }
  };

  // ─── Filters & derived data (unchanged) ──────────────────────────
  const industries = ["All", ...Array.from(new Set(
    campaigns.map((c) => c.business?.industry).filter((i): i is string => !!i)
  ))];

  const types = ["All", "Pay + Code", "Paying", "Code Only", "Open to Offers"];

  const filteredData = useMemo(() => {
    return campaigns.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        c.name?.toLowerCase().includes(q) ||
        c.business?.business_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);
      const matchIndustry = activeFilters.industry === "All" || c.business?.industry === activeFilters.industry;
      const matchType     = activeFilters.type === "All"     || c.partnership_type === activeFilters.type;
      return matchSearch && matchIndustry && matchType;
    });
  }, [searchQuery, activeFilters, campaigns]);

  const meetsRequirement = (minFollowers: number) => {
    if (!creatorProfile) return minFollowers === 0;
    return (creatorProfile.avg_viewers || creatorProfile.avg_concurrent || 0) >= minFollowers;
  };

  // Compute niche match for selected campaign
  const nicheMatchPercentage = useMemo(() => {
    if (!selectedCampaign || !creatorProfile) return 0;
    const creatorNiches = [
      creatorProfile.niche,
      ...(creatorProfile.categories || [])
    ].filter(Boolean);
    return getNicheMatchPercentage(creatorNiches, selectedCampaign.target_niches || []);
  }, [selectedCampaign, creatorProfile]);

  // ─── Loading state (unchanged) ───────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
          <p className="text-sm text-gray-400">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Browse Brands" />

      {/* Sticky Search & Filter Section */}
      <div className="px-5 py-6 sticky top-[84px] bg-[#FDFDFD]/95 backdrop-blur-md z-20">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-20" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BRANDS..."
              className="w-full bg-white border-2 border-[#1D1D1D] py-4 pl-12 pr-4 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:bg-[#1D1D1D] focus:text-white transition-all italic"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`border-2 border-[#1D1D1D] px-5 transition-all active:scale-95 ${isFilterOpen ? 'bg-[#1D1D1D] text-white' : 'bg-white text-[#1D1D1D]'}`}
          >
            <Filter className={`w-5 h-5 ${isFilterOpen ? 'text-white' : 'text-[#389C9A]'}`} />
          </button>
        </div>

        {/* Filter Dropdown */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 italic">Industry</span>
                  <div className="flex flex-wrap gap-2">
                    {industries.map(ind => (
                      <button
                        key={ind}
                        onClick={() => setActiveFilters(prev => ({ ...prev, industry: ind }))}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 transition-all rounded-none ${
                          activeFilters.industry === ind
                            ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                            : 'bg-white text-[#1D1D1D] border-[#1D1D1D]/10'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 italic">Type</span>
                  <div className="flex flex-wrap gap-2">
                    {types.map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveFilters(prev => ({ ...prev, type: t }))}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 transition-all rounded-none ${
                          activeFilters.type === t
                            ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                            : 'bg-white text-[#1D1D1D] border-[#1D1D1D]/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Campaign Feed */}
      <main className="flex-1 px-5 pt-4 flex flex-col gap-6">
        {filteredData.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-black uppercase tracking-wide opacity-30">No campaigns found</p>
            <p className="text-xs opacity-20 mt-1">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredData.map((campaign) => {
              const isSaved    = savedIds.has(campaign.id);
              const hasApplied = appliedIds.has(campaign.id);
              const meetsViewers = meetsRequirement(campaign.min_followers || 0);
              const isNew = new Date(campaign.created_at).getTime() > Date.now() - 86400000;

              return (
                <motion.div
                  key={campaign.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedCampaign(campaign)}
                  className="relative bg-white border-2 border-[#1D1D1D] rounded-xl overflow-visible transition-all cursor-pointer group active:scale-[0.99]"
                >
                  {/* Partnership Badge Overlap */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-10 ${getBadgeColor(campaign.partnership_type)}`}>
                    {campaign.partnership_type}
                  </div>

                  {/* Save Button (floating top-left) */}
                  <button
                    onClick={(e) => toggleSave(campaign.id, e)}
                    className="absolute top-4 left-4 z-10 p-2 bg-white border-2 border-[#1D1D1D] rounded-full hover:bg-[#1D1D1D] hover:text-white transition-all"
                  >
                    {isSaved
                      ? <BookmarkCheck className="w-4 h-4 text-[#389C9A]" />
                      : <Bookmark className="w-4 h-4" />}
                  </button>

                  {/* Verified Badge (optional) */}
                  {campaign.business?.verification_status === "verified" && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#389C9A]/10 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#389C9A]">Verified</span>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-6 flex gap-5 pt-12">
                    <div className="relative w-24 h-32 shrink-0 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={campaign.business?.logo_url || ""}
                        alt={campaign.business?.business_name || campaign.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-start gap-3 pt-2">
                      <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
                        {campaign.business?.business_name || campaign.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/40 italic">
                          {campaign.business?.industry?.toUpperCase() || "GENERAL"}
                          <span className="mx-1.5 not-italic">·</span>
                          {campaign.business?.city?.toUpperCase() || "REMOTE"}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed text-[#1D1D1D]/60 italic line-clamp-2">
                        {campaign.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3.5 h-3.5 text-[#389C9A]" />
                        <span className="text-[9px] font-bold text-[#1D1D1D]/50 italic">
                          Min. {campaign.min_followers || 0} avg viewers required
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Full width divider */}
                  <div className="h-[2px] bg-[#1D1D1D]" />

                  {/* Bottom Section */}
                  <div className="bg-[#F8F8F8] p-6 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-3xl font-black leading-none text-[#D2691E] tracking-tight">
                        {getPayRate(campaign)}
                      </p>
                      <p className="text-[11px] font-medium leading-none text-[#D2691E]/70">
                        for {campaign.streams_required} Live Streams
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaign(campaign);
                      }}
                      className="bg-[#1D1D1D] text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:bg-[#389C9A] transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      VIEW DETAILS <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !applying && setSelectedCampaign(null)}
              className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] h-[92vh] flex flex-col rounded-t-[32px] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="shrink-0 bg-white px-6 pt-4 pb-2 border-b border-[#1D1D1D]/5">
                <div className="w-12 h-1.5 bg-[#1D1D1D]/10 rounded-full mx-auto mb-6" />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-xl overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={selectedCampaign.business?.logo_url || ""}
                        alt={selectedCampaign.business?.business_name || selectedCampaign.name}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 italic">
                        {selectedCampaign.business?.business_name || selectedCampaign.name}
                      </h2>
                      <div className="flex items-center gap-2 italic">
                        {selectedCampaign.business?.verification_status === "verified" && (
                          <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                          {selectedCampaign.business?.industry || "General"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => !applying && setSelectedCampaign(null)}
                    className="p-3 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-xl active:scale-95 transition-transform"
                  >
                    <X className="w-5 h-5 text-[#1D1D1D]" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                {/* Offer Grid */}
                <div className="grid grid-cols-2 gap-px bg-[#1D1D1D] border-2 border-[#1D1D1D] mb-10 rounded-xl overflow-hidden">
                  <div className="bg-white p-5 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Pay Rate</span>
                    <span className="text-xs font-black uppercase text-[#389C9A] tracking-tight">
                      {getPayRate(selectedCampaign)}
                    </span>
                  </div>
                  <div className="bg-white p-5 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Min Viewers</span>
                    <span className="text-xs font-black uppercase text-[#389C9A] tracking-tight">
                      {selectedCampaign.min_followers || 0}
                    </span>
                  </div>
                  <div className="bg-white p-5 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Type</span>
                    <span className="text-xs font-black uppercase text-[#389C9A] tracking-tight">
                      {selectedCampaign.partnership_type}
                    </span>
                  </div>
                  <div className="bg-white p-5 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Deadline</span>
                    <span className="text-xs font-black uppercase text-[#389C9A] tracking-tight">
                      {formatDeadline(selectedCampaign.end_date)}
                    </span>
                  </div>
                </div>

                {/* About Campaign */}
                <div className="flex flex-col gap-12">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 border-b-2 border-[#1D1D1D]/10 pb-3 mb-6 italic">
                      About Campaign
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-[#1D1D1D]/80 italic">
                      {selectedCampaign.description}
                    </p>
                  </section>

                  {/* Match Analysis */}
                  <section className="mb-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 border-b-2 border-[#1D1D1D]/10 pb-3 mb-6 italic">
                      Match Analysis
                    </h3>
                    <div className="bg-[#1D1D1D] text-white p-8 flex flex-col gap-6 border-2 border-[#1D1D1D] rounded-2xl">
                      <div className="flex justify-between items-center text-[11px] font-black uppercase italic tracking-widest">
                        <span>Min. Viewers</span>
                        <span className={meetsRequirement(selectedCampaign.min_followers || 0) ? 'text-[#389C9A]' : 'text-[#FEDB71]'}>
                          {creatorProfile?.avg_viewers || creatorProfile?.avg_concurrent || 0} / {selectedCampaign.min_followers || 0}
                        </span>
                      </div>
                      <div className="h-[1px] bg-white/10" />
                      <div className="flex justify-between items-center text-[11px] font-black uppercase italic tracking-widest">
                        <span>Niche Fit</span>
                        <span className="text-[#389C9A]">{nicheMatchPercentage}% Match</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Fixed Bottom CTA */}
              <div className="shrink-0 p-6 bg-white border-t-2 border-[#1D1D1D] z-[110]">
                {appliedIds.has(selectedCampaign.id) ? (
                  <div className="w-full bg-[#389C9A]/10 text-[#389C9A] p-5 text-center text-[10px] font-black uppercase tracking-[0.3em] border-2 border-[#389C9A]/20 rounded-xl italic">
                    Application Pending
                  </div>
                ) : (
                  <button
                    onClick={(e) => applyToCampaign(selectedCampaign, e)}
                    disabled={applying || !meetsRequirement(selectedCampaign.min_followers || 0)}
                    className={`w-full bg-[#1D1D1D] text-white p-5 rounded-xl text-lg font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all shadow-[0_4px_0_0_#389C9A] ${
                      !meetsRequirement(selectedCampaign.min_followers || 0) && 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {applying ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Submitting...</>
                    ) : !meetsRequirement(selectedCampaign.min_followers || 0) ? (
                      'Requirements Not Met'
                    ) : (
                      <>Send Application <ArrowRight className="w-6 h-6 text-[#FEDB71]" /></>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}