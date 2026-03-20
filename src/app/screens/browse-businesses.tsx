import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Filter, ArrowRight, X, Users, CheckCircle2, Bookmark, BookmarkCheck,
  Briefcase, MapPin, Clock, RefreshCw, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/ImageWithFallback";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type PartnershipType = "Pay + Code" | "Paying" | "Code Only" | "Open to Offers";

interface Business {
  id: string;
  user_id: string;           // ✅ needed for notifications
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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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
  if (diffDays < 0)  return "Closed";
  if (diffDays === 0) return "Closing today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function getPayRate(campaign: CampaignWithBusiness): string {
  const amount = campaign.pay_rate || campaign.bid_amount || campaign.budget;
  return amount ? `₦${Number(amount).toLocaleString()}` : "Negotiable";
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BrowseBusinesses() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaigns, setCampaigns]           = useState<CampaignWithBusiness[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithBusiness | null>(null);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds]         = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen]     = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date>(new Date());
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorId, setCreatorId]           = useState<string | null>(null);
  const [activeFilters, setActiveFilters]   = useState<{
    industry: string;
    type: string;
  }>({ industry: "All", type: "All" });

  // ─── FETCH CAMPAIGNS ───────────────────────────────────────────────────

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

      // Fetch all businesses in one query
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
      if (silent) toast.success(`Updated ${formatted.length} campaigns`);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      if (silent) toast.error("Failed to refresh campaigns");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // ─── FETCH CREATOR PROFILE ─────────────────────────────────────────────

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

  // ─── FETCH APPLICATIONS ────────────────────────────────────────────────

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

    // Realtime: track own new applications
    const sub = supabase
      .channel(`applications-${creatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_creators",
          filter: `creator_id=eq.${creatorId}`,
        },
        (payload) => {
          setAppliedIds((prev) => new Set(prev).add(payload.new.campaign_id));
        }
      )
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [creatorId, user]);

  // ─── REALTIME CAMPAIGNS ────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    fetchCampaigns();

    const campaignSub = supabase
      .channel("browse-campaigns")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns", filter: "status=eq.active" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast.info("New campaign available!", { description: "A new opportunity has been posted", duration: 5000 });
          }
          fetchCampaigns(true);
        }
      )
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

  // ─── ACTIONS ───────────────────────────────────────────────────────────

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Please login to save campaigns"); navigate("/login/portal"); return; }

    const next = new Set(savedIds);
    if (next.has(id)) { next.delete(id); toast.success("Removed from saved"); }
    else              { next.add(id);    toast.success("Campaign saved!"); }

    setSavedIds(next);
    localStorage.setItem(`saved_campaigns_${user.id}`, JSON.stringify([...next]));
  };

  const applyToCampaign = async (campaign: CampaignWithBusiness) => {
    if (!user)            { toast.error("Please login to apply"); navigate("/login/portal"); return; }
    if (!creatorId || !creatorProfile) { toast.error("Complete your creator profile first"); navigate("/become-creator"); return; }
    if (creatorProfile.status !== "active") { toast.error("Your creator account must be approved first"); return; }

    const avgViewers = creatorProfile.avg_viewers || creatorProfile.avg_concurrent || 0;
    if ((campaign.min_followers || 0) > 0 && avgViewers < campaign.min_followers) {
      toast.error(`This campaign requires at least ${campaign.min_followers} average viewers`);
      return;
    }

    try {
      // Check for existing application
      const { data: existing } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", creatorId)
        .maybeSingle();

      if (existing) { toast.error("You have already applied to this campaign"); return; }

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

      setAppliedIds((prev) => new Set(prev).add(campaign.id));
      toast.success("Application submitted successfully!");

      // ✅ FIXED: use business.user_id not business.id for the notification
      if (campaign.business?.user_id) {
        await supabase.from("notifications").insert({
          user_id:    campaign.business.user_id,   // ← correct: auth user_id of business owner
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

      setTimeout(() => setSelectedCampaign(null), 1500);
    } catch (error) {
      console.error("Error applying:", error);
      toast.error("Failed to submit application");
    }
  };

  // ─── FILTER ────────────────────────────────────────────────────────────

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

  // ─── LOADING ───────────────────────────────────────────────────────────

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

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">

      {/* ── Sticky Header ── */}
      <div className="px-5 py-5 sticky top-[84px] bg-white/95 backdrop-blur-md z-20 border-b border-[#1D1D1D]/10">

        {/* Realtime bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
            <span className="text-[8px] text-[#1D1D1D]/30">
              · {campaigns.length} active · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <button
            onClick={() => fetchCampaigns(true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#F8F8F8] rounded-lg transition-colors disabled:opacity-50"
          >
            {refreshing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            <span className="text-[8px] font-black uppercase tracking-widest">
              {refreshing ? "Updating..." : "Refresh"}
            </span>
          </button>
        </div>

        {/* Search + Filter toggle */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands or campaigns..."
              className="w-full bg-white border-2 border-[#1D1D1D] py-3.5 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wide outline-none focus:bg-[#1D1D1D] focus:text-white transition-all placeholder:opacity-30 rounded-xl"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`border-2 border-[#1D1D1D] px-4 rounded-xl transition-all ${
              isFilterOpen ? "bg-[#1D1D1D] text-white" : "bg-white"
            }`}
          >
            <Filter className={`w-5 h-5 ${isFilterOpen ? "text-white" : "text-[#389C9A]"}`} />
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-5 pb-2 flex flex-col gap-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-40">Industry</p>
                  <div className="flex flex-wrap gap-2">
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setActiveFilters((p) => ({ ...p, industry: ind }))}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border-2 rounded-full transition-all ${
                          activeFilters.industry === ind
                            ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                            : "border-[#E8E8E8] hover:border-[#1D1D1D]"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-40">Partnership Type</p>
                  <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveFilters((p) => ({ ...p, type: t }))}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border-2 rounded-full transition-all ${
                          activeFilters.type === t
                            ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                            : "border-[#E8E8E8] hover:border-[#1D1D1D]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setActiveFilters({ industry: "All", type: "All" })}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline text-left"
                >
                  Clear filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Feed ── */}
      <main className="flex-1 px-5 pt-5 flex flex-col gap-5">
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
                  className="relative bg-white border-2 border-[#1D1D1D] rounded-2xl overflow-visible cursor-pointer group hover:shadow-lg active:scale-[0.99] transition-all"
                >
                  {/* NEW badge */}
                  {isNew && (
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-green-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest z-10">
                      New
                    </div>
                  )}

                  {/* Partnership type badge */}
                  <div className={`absolute -top-3 right-6 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest z-10 ${getBadgeColor(campaign.partnership_type)}`}>
                    {campaign.partnership_type}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={(e) => toggleSave(campaign.id, e)}
                    className="absolute top-4 left-4 z-10 p-2 bg-white border-2 border-[#1D1D1D] rounded-full hover:bg-[#1D1D1D] hover:text-white transition-all"
                  >
                    {isSaved
                      ? <BookmarkCheck className="w-4 h-4 text-[#389C9A]" />
                      : <Bookmark className="w-4 h-4" />}
                  </button>

                  {/* Verified badge */}
                  {campaign.business?.verification_status === "verified" && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#389C9A]/10 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#389C9A]">Verified</span>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-5 flex gap-4 pt-12">
                    <div className="w-20 h-24 shrink-0 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden">
                      <ImageWithFallback
                        src={campaign.business?.logo_url || ""}
                        alt={campaign.business?.business_name || campaign.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-2 pt-1">
                      <h3 className="text-lg font-black uppercase tracking-tight leading-tight">
                        {campaign.business?.business_name || campaign.name}
                      </h3>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wide text-[#1D1D1D]/40 italic">
                          {campaign.business?.industry || "General"}
                        </span>
                        {campaign.business?.city && (
                          <>
                            <span className="text-[#1D1D1D]/20">·</span>
                            <MapPin className="w-3 h-3 text-[#389C9A]" />
                            <span className="text-[9px] font-bold text-[#1D1D1D]/40 italic">
                              {campaign.business.city}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-[10px] leading-relaxed text-[#1D1D1D]/60 line-clamp-2">
                        {campaign.description}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-[#389C9A]" />
                        <span className={`text-[9px] font-bold ${meetsViewers ? "text-green-600" : "text-[#1D1D1D]/40"}`}>
                          Min. {campaign.min_followers || 0} avg viewers
                        </span>
                      </div>

                      {campaign.target_niches?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {campaign.target_niches.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-[#F8F8F8] text-[7px] font-black uppercase tracking-widest rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-[2px] bg-[#1D1D1D]" />

                  {/* Footer */}
                  <div className="bg-[#F8F8F8] p-5 rounded-b-2xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-2xl font-black leading-none text-[#389C9A]">
                        {getPayRate(campaign)}
                      </p>
                      <p className="text-[9px] font-medium text-[#1D1D1D]/50 mt-0.5">
                        for {campaign.streams_required} live streams
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 opacity-30" />
                        <span className="text-[8px] opacity-40">{formatDeadline(campaign.end_date)}</span>
                      </div>
                    </div>

                    {hasApplied ? (
                      <div className="bg-green-500 text-white px-5 py-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Applied
                      </div>
                    ) : (
                      <button className="bg-[#1D1D1D] text-white px-5 py-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-xl whitespace-nowrap">
                        View Details <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </main>

      {/* ── Campaign Detail Modal ── */}
      <AnimatePresence>
        {selectedCampaign && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setSelectedCampaign(null)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t-4 border-[#1D1D1D] z-50 rounded-t-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-4" />

              <div className="px-6 pb-8">
                {/* Close */}
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="absolute top-5 right-5 p-2 bg-[#F8F8F8] rounded-full hover:bg-[#1D1D1D] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-20 h-20 border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden shrink-0">
                    <ImageWithFallback
                      src={selectedCampaign.business?.logo_url || ""}
                      alt={selectedCampaign.business?.business_name || selectedCampaign.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2 leading-tight">
                      {selectedCampaign.business?.business_name || selectedCampaign.name}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${getBadgeColor(selectedCampaign.partnership_type)}`}>
                        {selectedCampaign.partnership_type}
                      </span>
                      {selectedCampaign.business?.verification_status === "verified" && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-[#389C9A]">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#F8F8F8] p-4 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Pay Rate</p>
                    <p className="text-2xl font-black text-[#389C9A]">{getPayRate(selectedCampaign)}</p>
                    <p className="text-[8px] opacity-40">for {selectedCampaign.streams_required} streams</p>
                  </div>
                  <div className="bg-[#F8F8F8] p-4 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Min. Viewers</p>
                    <p className="text-2xl font-black">{selectedCampaign.min_followers || 0}</p>
                    <p className="text-[8px] opacity-40">avg concurrent</p>
                  </div>
                </div>

                {/* About */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-40">About the Campaign</h3>
                  <p className="text-sm leading-relaxed text-[#1D1D1D]/70">{selectedCampaign.description}</p>
                </div>

                {/* Requirements */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40">Requirements</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A] shrink-0" />
                      <span>Minimum {selectedCampaign.min_followers || 0} concurrent viewers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A] shrink-0" />
                      <span>Complete {selectedCampaign.streams_required} live streams</span>
                    </div>
                    {selectedCampaign.target_niches?.map((tag) => (
                      <div key={tag} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[#389C9A] shrink-0" />
                        <span>Content in: {tag}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                {selectedCampaign.end_date && (
                  <p className="text-center text-[9px] opacity-40 mb-4">
                    Applications close {new Date(selectedCampaign.end_date).toLocaleDateString()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={(e) => toggleSave(selectedCampaign.id, e)}
                    className={`flex-1 border-2 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl ${
                      savedIds.has(selectedCampaign.id)
                        ? "bg-[#389C9A] text-white border-[#389C9A]"
                        : "border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white"
                    }`}
                  >
                    {savedIds.has(selectedCampaign.id)
                      ? <><BookmarkCheck className="w-4 h-4" /> Saved</>
                      : <><Bookmark className="w-4 h-4" /> Save</>}
                  </button>

                  <button
                    onClick={() => applyToCampaign(selectedCampaign)}
                    disabled={
                      appliedIds.has(selectedCampaign.id) ||
                      !meetsRequirement(selectedCampaign.min_followers || 0)
                    }
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl ${
                      appliedIds.has(selectedCampaign.id)
                        ? "bg-green-500 text-white cursor-not-allowed"
                        : !meetsRequirement(selectedCampaign.min_followers || 0)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
                    }`}
                  >
                    {appliedIds.has(selectedCampaign.id) ? (
                      <><CheckCircle2 className="w-4 h-4" /> Applied</>
                    ) : !meetsRequirement(selectedCampaign.min_followers || 0) ? (
                      "Requirements Not Met"
                    ) : (
                      <>Apply Now <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
