import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Search, Filter, ArrowRight, X, Users, CheckCircle2, Bookmark, BookmarkCheck, Briefcase, MapPin, DollarSign, Clock, Building2, Star, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/ImageWithFallback";

type PartnershipType = "Pay + Code" | "Paying" | "Code Only" | "Open to Offers";

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
  created_at: string;
  business_id: string;
  
  business?: {
    id: string;
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
  } | null;
  
  partnership_type: PartnershipType;
  streams_required: number;
}

export function BrowseBusinesses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithBusiness | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ 
    industry: string; 
    type: string;
    minViewers: number;
  }>({ 
    industry: "All", 
    type: "All",
    minViewers: 0 
  });
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch campaigns with business details
  const fetchCampaigns = useCallback(async (showRefreshToast = false) => {
    if (!user) return;

    try {
      if (showRefreshToast) {
        setRefreshing(true);
      }
      
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          type,
          description,
          budget,
          pay_rate,
          bid_amount,
          status,
          start_date,
          end_date,
          target_niches,
          target_locations,
          min_followers,
          created_at,
          business_id
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      if (campaignsData && campaignsData.length > 0) {
        // Get unique business IDs
        const businessIds = [...new Set(campaignsData.map(c => c.business_id).filter(Boolean))];
        
        // Fetch business details
        let businessesData: any[] = [];
        if (businessIds.length > 0) {
          const { data: bizData, error: bizError } = await supabase
            .from("businesses")
            .select("*")
            .in("id", businessIds);
          
          if (!bizError && bizData) {
            businessesData = bizData;
          }
        }
        
        // Create a map of businesses by ID
        const businessMap = new Map();
        businessesData.forEach(biz => {
          businessMap.set(biz.id, biz);
        });
        
        // Format campaigns with business data
        const formattedCampaigns = campaignsData.map(c => {
          let partnershipType: PartnershipType = "Open to Offers";
          if (c.pay_rate && c.pay_rate > 0 && c.type?.toLowerCase().includes('code')) {
            partnershipType = "Pay + Code";
          } else if (c.pay_rate && c.pay_rate > 0) {
            partnershipType = "Paying";
          } else if (c.type?.toLowerCase().includes('code')) {
            partnershipType = "Code Only";
          }
          
          return {
            ...c,
            partnership_type: partnershipType,
            streams_required: 3,
            business: businessMap.get(c.business_id) || null
          };
        });
        
        setCampaigns(formattedCampaigns);
        setIsDemoMode(false);
        
        if (showRefreshToast) {
          toast.success(`Updated ${formattedCampaigns.length} campaigns`);
        }
      } else {
        // No campaigns in database, show empty state
        setCampaigns([]);
        setIsDemoMode(false);
        
        if (showRefreshToast) {
          toast.info('No active campaigns found');
        }
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      if (showRefreshToast) {
        toast.error('Failed to refresh campaigns');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Fetch creator profile
  useEffect(() => {
    if (!user) return;

    const fetchCreatorProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("creator_profiles")
          .select("id, avg_viewers, niche, status, full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setCreatorProfile(data);
          setCreatorId(data.id);
        }
      } catch (error) {
        console.error('Error fetching creator profile:', error);
      }
    };

    fetchCreatorProfile();
  }, [user]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchCampaigns();

    // Set up real-time subscription for campaigns
    const campaignsSubscription = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `status=eq.active`
        },
        (payload) => {
          console.log('Campaign change detected:', payload);
          
          // Refresh campaigns when any change occurs
          fetchCampaigns(true);
          
          // Show toast notification based on event type
          if (payload.eventType === 'INSERT') {
            toast.info('New campaign available!', {
              description: 'A new opportunity has been posted',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Campaign updated', {
              description: 'A campaign has been updated',
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for businesses (in case business details change)
    const businessesSubscription = supabase
      .channel('businesses-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
        },
        () => {
          // Refresh campaigns when business details change
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      campaignsSubscription.unsubscribe();
      businessesSubscription.unsubscribe();
    };
  }, [user, fetchCampaigns]);

  // Fetch user's applications
  useEffect(() => {
    if (!creatorId) return;

    async function fetchUserApplications() {
      try {
        const { data, error } = await supabase
          .from("campaign_creators")
          .select("campaign_id, status")
          .eq("creator_id", creatorId);

        if (error) throw error;

        if (data) {
          setAppliedIds(new Set(data.map(a => a.campaign_id)));
        }

        // Load saved campaigns from localStorage
        const saved = localStorage.getItem(`saved_campaigns_${user?.id}`);
        if (saved) {
          setSavedIds(new Set(JSON.parse(saved)));
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    }

    // Set up real-time subscription for applications
    const applicationsSubscription = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_creators',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          // Update applied IDs when new application is created
          setAppliedIds(prev => new Set(prev).add(payload.new.campaign_id));
        }
      )
      .subscribe();

    fetchUserApplications();

    return () => {
      applicationsSubscription.unsubscribe();
    };
  }, [creatorId, user]);

  // Check if user meets minimum viewer requirements
  const meetsViewerRequirement = (minFollowers: number) => {
    if (!creatorProfile) return minFollowers === 0;
    return (creatorProfile.avg_viewers || 0) >= minFollowers;
  };

  // Get unique industries for filter
  const industries = ["All", ...Array.from(new Set(
    campaigns
      .map(c => c.business?.industry)
      .filter((i): i is string => !!i)
  ))];
  
  const types = ["All", "Pay + Code", "Paying", "Code Only", "Open to Offers"];

  // Filter campaigns based on search and filters
  const filteredData = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = 
        campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        campaign.business?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesIndustry = activeFilters.industry === "All" || campaign.business?.industry === activeFilters.industry;
      const matchesType = activeFilters.type === "All" || campaign.partnership_type === activeFilters.type;
      const matchesViewers = (campaign.min_followers || 0) >= activeFilters.minViewers;
      
      return matchesSearch && matchesIndustry && matchesType && matchesViewers;
    });
  }, [searchQuery, activeFilters, campaigns]);

  // Toggle save campaign
  const toggleSave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please login to save campaigns');
      navigate('/login/portal');
      return;
    }

    try {
      const newSavedIds = new Set(savedIds);
      if (savedIds.has(id)) {
        newSavedIds.delete(id);
        toast.success('Campaign removed from saved');
      } else {
        newSavedIds.add(id);
        toast.success('Campaign saved!');
      }
      
      setSavedIds(newSavedIds);
      localStorage.setItem(`saved_campaigns_${user.id}`, JSON.stringify([...newSavedIds]));
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to save campaign');
    }
  };

  // Apply to campaign
  const applyToCampaign = async (campaign: CampaignWithBusiness) => {
    if (!user) {
      toast.error('Please login to apply');
      navigate('/login/portal');
      return;
    }

    if (!creatorProfile || !creatorId) {
      toast.error('Please complete your creator profile first');
      navigate('/become-creator');
      return;
    }

    if (creatorProfile.status !== 'active') {
      toast.error('Your creator account must be approved first');
      return;
    }

    if (campaign.min_followers > 0 && !meetsViewerRequirement(campaign.min_followers)) {
      toast.error(`This campaign requires at least ${campaign.min_followers} average viewers`);
      return;
    }

    try {
      // Check if already applied
      const { data: existing, error: checkError } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", creatorId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        toast.error('You have already applied to this campaign');
        return;
      }

      // Insert into campaign_creators
      const { error: insertError } = await supabase
        .from("campaign_creators")
        .insert({ 
          campaign_id: campaign.id,
          creator_id: creatorId,
          status: 'pending',
          streams_target: campaign.streams_required,
          streams_completed: 0,
          total_earnings: campaign.pay_rate || campaign.bid_amount || campaign.budget || 0,
          paid_out: 0,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setAppliedIds(prev => new Set(prev).add(campaign.id));
      toast.success('Application submitted successfully!');
      
      // Create notification for business
      if (campaign.business?.id) {
        await supabase.from("notifications").insert({
          user_id: campaign.business.id,
          type: "new_application",
          title: "New Campaign Application! 🎉",
          message: `${creatorProfile.full_name || 'A creator'} applied to your campaign "${campaign.name}"`,
          data: { 
            campaign_id: campaign.id,
            creator_id: creatorId
          },
          created_at: new Date().toISOString()
        }).catch(console.error);
      }

      setTimeout(() => setSelectedCampaign(null), 1500);
    } catch (error) {
      console.error('Error applying to campaign:', error);
      toast.error('Failed to submit application');
    }
  };

  // Get badge color based on partnership type
  const getBadgeColor = (type: PartnershipType) => {
    switch(type) {
      case "Pay + Code": return "bg-[#1D1D1D] text-white border-none";
      case "Paying": return "bg-[#389C9A] text-white border-none";
      case "Code Only": return "bg-[#FEDB71] text-[#1D1D1D] border-none";
      case "Open to Offers": return "bg-white text-[#1D1D1D] border-2 border-[#1D1D1D]";
      default: return "bg-[#1D1D1D] text-white";
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Closed';
    if (diffDays === 0) return 'Closing today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getPayRate = (campaign: CampaignWithBusiness) => {
    const amount = campaign.pay_rate || campaign.bid_amount || campaign.budget;
    return amount ? `₦${amount.toLocaleString()}` : 'Negotiable';
  };

  const handleManualRefresh = async () => {
    await fetchCampaigns(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
          <p className="text-sm text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      {/* Header */}
      <div className="px-5 py-6 sticky top-[84px] bg-[#FDFDFD]/95 backdrop-blur-md z-20 border-b border-[#1D1D1D]/10">
        {/* Real-time Status Bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-green-600">
                LIVE
              </span>
            </div>
            <span className="text-[8px] text-[#1D1D1D]/40">
              • {campaigns.length} active campaigns
            </span>
            <span className="text-[8px] text-[#1D1D1D]/30">
              • Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              {refreshing ? 'Updating...' : 'Refresh'}
            </span>
          </button>
        </div>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-20" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BRANDS OR INDUSTRY..."
              className="w-full bg-white border-2 border-[#1D1D1D] py-4 pl-12 pr-4 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:bg-[#1D1D1D] focus:text-white transition-all italic placeholder:opacity-30"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`border-2 border-[#1D1D1D] px-5 transition-all active:scale-95 ${isFilterOpen ? 'bg-[#1D1D1D] text-white' : 'bg-white text-[#1D1D1D]'}`}
          >
            <Filter className={`w-5 h-5 ${isFilterOpen ? 'text-white' : 'text-[#389C9A]'}`} />
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 pb-2 flex flex-col gap-6">
                {/* Industry Filter */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-3 opacity-40">Industry</p>
                  <div className="flex flex-wrap gap-2">
                    {industries.map(industry => (
                      <button
                        key={industry}
                        onClick={() => setActiveFilters(prev => ({ ...prev, industry }))}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                          activeFilters.industry === industry
                            ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                            : 'bg-white text-[#1D1D1D] border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partnership Type Filter */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-3 opacity-40">Partnership Type</p>
                  <div className="flex flex-wrap gap-2">
                    {types.map(type => (
                      <button
                        key={type}
                        onClick={() => setActiveFilters(prev => ({ ...prev, type }))}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                          activeFilters.type === type
                            ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                            : 'bg-white text-[#1D1D1D] border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => setActiveFilters({ industry: "All", type: "All", minViewers: 0 })}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline text-left"
                >
                  Clear all filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Browse Feed */}
      <main className="flex-1 px-5 pt-4 flex flex-col gap-6">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium opacity-40">No campaigns found</p>
            <p className="text-xs opacity-30 mt-2">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <>
            {/* Real-time indicator for new campaigns */}
            {refreshing && (
              <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-[#1D1D1D] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-50 shadow-lg">
                Updating campaigns...
              </div>
            )}
            
            {filteredData.map((campaign) => {
              const isSaved = savedIds.has(campaign.id);
              const hasApplied = appliedIds.has(campaign.id);
              const meetsViewers = meetsViewerRequirement(campaign.min_followers || 0);
              const daysLeft = formatDate(campaign.end_date);
              
              return (
                <motion.div 
                  key={campaign.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  layout
                  onClick={() => setSelectedCampaign(campaign)}
                  className="relative bg-white border-2 border-[#1D1D1D] rounded-xl overflow-visible transition-all cursor-pointer group hover:shadow-lg active:scale-[0.99]"
                >
                  {/* New Campaign Badge */}
                  {new Date(campaign.created_at).getTime() > Date.now() - 86400000 && (
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-green-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest z-10">
                      NEW
                    </div>
                  )}
                  
                  {/* Partnership Type Badge */}
                  <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-10 ${getBadgeColor(campaign.partnership_type)}`}>
                    {campaign.partnership_type}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={(e) => toggleSave(campaign.id, e)}
                    className="absolute top-4 left-4 z-10 p-2 bg-white border-2 border-[#1D1D1D] rounded-full hover:bg-[#1D1D1D] hover:text-white transition-all"
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-4 h-4 text-[#389C9A]" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  {/* Verification Badge */}
                  {campaign.business?.verification_status === 'verified' && (
                    <div className="absolute top-4 right-20 z-10 flex items-center gap-1 bg-[#389C9A]/10 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[7px] font-black uppercase tracking-widest">Verified</span>
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="p-6 flex gap-5 pt-12">
                    <div className="relative w-24 h-32 shrink-0 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-lg overflow-hidden">
                      <ImageWithFallback 
                        src={campaign.business?.logo_url || 'https://via.placeholder.com/100'} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        alt={campaign.name}
                        fallbackSrc="https://via.placeholder.com/100?text=Brand"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-start gap-3 pt-2">
                      <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
                        {campaign.business?.business_name || campaign.name}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/40 italic">
                          {campaign.business?.industry?.toUpperCase() || 'GENERAL'}
                        </span>
                        <span className="text-[#1D1D1D]/20">·</span>
                        <MapPin className="w-3 h-3 text-[#389C9A]" />
                        <span className="text-[9px] font-bold text-[#1D1D1D]/40 italic">
                          {campaign.business?.city?.toUpperCase() || 'REMOTE'}
                        </span>
                      </div>
                      
                      <p className="text-[11px] font-medium leading-relaxed text-[#1D1D1D]/60 italic line-clamp-2">
                        {campaign.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3.5 h-3.5 text-[#389C9A]" />
                        <span className={`text-[9px] font-bold italic ${
                          meetsViewers ? 'text-green-600' : 'text-[#1D1D1D]/50'
                        }`}>
                          Min. {campaign.min_followers || 0} avg viewers required
                          {!meetsViewers && creatorProfile && creatorProfile.avg_viewers && ` (You have ${creatorProfile.avg_viewers})`}
                        </span>
                      </div>

                      {/* Niche Tags */}
                      {campaign.target_niches && campaign.target_niches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campaign.target_niches.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-[#F8F8F8] text-[8px] font-black uppercase tracking-widest">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-[2px] bg-[#1D1D1D]" />

                  {/* Footer */}
                  <div className="bg-[#F8F8F8] p-6 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-3xl font-black leading-none text-[#D2691E] tracking-tight">
                        {getPayRate(campaign)}
                      </p>
                      <p className="text-[11px] font-medium leading-none text-[#D2691E]/70">
                        for {campaign.streams_required} Live Streams
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 opacity-40" />
                        <span className="text-[8px] font-medium opacity-40">{daysLeft}</span>
                      </div>
                    </div>
                    
                    {hasApplied ? (
                      <div className="bg-green-500 text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        <CheckCircle2 className="w-4 h-4" /> APPLIED
                      </div>
                    ) : (
                      <button className="bg-[#1D1D1D] text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all active:scale-[0.98] whitespace-nowrap rounded-lg">
                        VIEW DETAILS <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </main>

      {/* Campaign Detail Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setSelectedCampaign(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t-4 border-[#1D1D1D] z-50 rounded-t-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="absolute top-4 right-4 p-2 bg-[#F8F8F8] rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-20 h-20 border-2 border-[#1D1D1D] rounded-lg overflow-hidden">
                    <ImageWithFallback 
                      src={selectedCampaign.business?.logo_url || 'https://via.placeholder.com/100'} 
                      className="w-full h-full object-cover" 
                      alt={selectedCampaign.name}
                      fallbackSrc="https://via.placeholder.com/100?text=Brand"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-1">
                      {selectedCampaign.business?.business_name || selectedCampaign.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest ${getBadgeColor(selectedCampaign.partnership_type)}`}>
                        {selectedCampaign.partnership_type}
                      </span>
                      {selectedCampaign.business?.verification_status === 'verified' && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-[#389C9A]">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-[#1D1D1D]/10 p-4 rounded-lg">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Pay Rate</p>
                    <p className="text-xl font-black text-[#D2691E]">{getPayRate(selectedCampaign)}</p>
                    <p className="text-[8px] font-medium opacity-40">per {selectedCampaign.streams_required} streams</p>
                  </div>
                  <div className="border border-[#1D1D1D]/10 p-4 rounded-lg">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Min. Viewers</p>
                    <p className="text-xl font-black">{selectedCampaign.min_followers || 0}</p>
                    <p className="text-[8px] font-medium opacity-40">average concurrent</p>
                  </div>
                </div>

                {/* About */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2">About the Campaign</h3>
                  <p className="text-sm leading-relaxed opacity-60">{selectedCampaign.description}</p>
                </div>

                {/* Requirements */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2">Requirements</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                      <span>Minimum {selectedCampaign.min_followers || 0} concurrent viewers</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                      <span>Complete {selectedCampaign.streams_required} live streams</span>
                    </li>
                    {selectedCampaign.target_niches?.map(tag => (
                      <li key={tag} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                        <span>Content in: {tag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={(e) => toggleSave(selectedCampaign.id, e)}
                    className={`flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-lg ${
                      savedIds.has(selectedCampaign.id) ? 'bg-[#389C9A] text-white border-[#389C9A]' : 'hover:bg-[#1D1D1D] hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    {savedIds.has(selectedCampaign.id) ? 'Saved' : 'Save'}
                  </button>
                  
                  <button
                    onClick={() => applyToCampaign(selectedCampaign)}
                    disabled={appliedIds.has(selectedCampaign.id) || !meetsViewerRequirement(selectedCampaign.min_followers || 0)}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-lg ${
                      appliedIds.has(selectedCampaign.id)
                        ? 'bg-green-500 text-white cursor-not-allowed'
                        : !meetsViewerRequirement(selectedCampaign.min_followers || 0)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#1D1D1D] text-white hover:bg-[#389C9A]'
                    }`}
                  >
                    {appliedIds.has(selectedCampaign.id) ? (
                      <>Applied <CheckCircle2 className="w-4 h-4" /></>
                    ) : !meetsViewerRequirement(selectedCampaign.min_followers || 0) ? (
                      <>Requirements Not Met</>
                    ) : (
                      <>Apply Now <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {/* Deadline */}
                {selectedCampaign.end_date && (
                  <p className="text-center text-[9px] font-medium opacity-40 mt-4">
                    Applications close {new Date(selectedCampaign.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
