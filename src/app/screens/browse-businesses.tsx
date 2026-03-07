import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, Filter, ArrowRight, X, Users, CheckCircle2, Bookmark, BookmarkCheck, Briefcase, MapPin, DollarSign, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/ImageWithFallback";

type PartnershipType = "Pay + Code" | "Paying" | "Code Only" | "Open to Offers";

interface BusinessCampaign {
  id: string;
  name: string;
  industry: string;
  logo: string;
  partnership_type: PartnershipType;
  pay_rate: string;
  min_viewers: number;
  location: string;
  description: string;
  niche_tags: string[];
  response_rate: string;
  closing_date?: string;
  is_verified: boolean;
  is_featured: boolean;
  budget_range: string;
  about: string;
  business_id: string;
  streams_required: number;
  created_at: string;
}

interface Business {
  id: string;
  business_name: string;
  logo_url: string;
  industry: string;
  location: string;
  description: string;
  is_verified: boolean;
}

interface CampaignWithBusiness extends BusinessCampaign {
  business?: Business;
}

export function BrowseBusinesses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [applications, setApplications] = useState<any[]>([]);

  // Fetch campaigns with business details
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true);
        
        const { data: campaignsData, error: campaignsError } = await supabase
          .from("campaigns")
          .select(`
            *,
            business:businesses (
              id,
              business_name,
              logo_url,
              industry,
              city,
              description,
              id_verified
            )
          `)
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false });

        if (campaignsError) throw campaignsError;

        if (campaignsData) {
          const formattedCampaigns = campaignsData.map(c => ({
            ...c,
            name: c.name,
            industry: c.business?.industry || c.industry,
            logo: c.business?.logo_url || 'https://via.placeholder.com/100',
            partnership_type: c.type as PartnershipType,
            pay_rate: c.budget ? `₦${c.budget}` : 'Negotiable',
            min_viewers: c.min_viewers || 0,
            location: c.business?.city || 'Remote',
            description: c.description || c.business?.description || '',
            niche_tags: c.niche_tags || [],
            response_rate: '95%',
            is_verified: c.business?.id_verified || false,
            is_featured: c.is_featured || false,
            budget_range: c.budget_range || '₦50k-₦200k',
            about: c.about || c.description || '',
            streams_required: c.streams_required || 4,
            business: c.business
          }));
          
          setCampaigns(formattedCampaigns);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  // Fetch user data (saved, applications, creator profile)
  useEffect(() => {
    if (!user) return;

    async function fetchUserData() {
      try {
        // Fetch saved campaigns
        const { data: savedData } = await supabase
          .from("saved_campaigns")
          .select("campaign_id")
          .eq("user_id", user.id);
        
        if (savedData) {
          setSavedIds(new Set(savedData.map(s => s.campaign_id)));
        }

        // Fetch applications
        const { data: appliedData } = await supabase
          .from("campaign_applications")
          .select("campaign_id, status")
          .eq("creator_id", user.id);
        
        if (appliedData) {
          setAppliedIds(new Set(appliedData.map(a => a.campaign_id)));
          setApplications(appliedData);
        }

        // Fetch creator profile for stats
        const { data: profileData } = await supabase
          .from("creator_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          setCreatorProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    fetchUserData();
  }, [user]);

  // Check if user meets minimum viewer requirements
  const meetsViewerRequirement = (minViewers: number) => {
    if (!creatorProfile) return false;
    return (creatorProfile.avg_concurrent || 0) >= minViewers;
  };

  // Get unique industries for filter
  const industries = ["All", ...Array.from(new Set(campaigns.map(c => c.industry)))];
  const types = ["All", "Pay + Code", "Paying", "Code Only", "Open to Offers"];

  // Filter campaigns based on search and filters
  const filteredData = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = 
        campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        campaign.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.business?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesIndustry = activeFilters.industry === "All" || campaign.industry === activeFilters.industry;
      const matchesType = activeFilters.type === "All" || campaign.partnership_type === activeFilters.type;
      const matchesViewers = campaign.min_viewers >= activeFilters.minViewers;
      
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
      if (savedIds.has(id)) {
        const { error } = await supabase
          .from("saved_campaigns")
          .delete()
          .eq("user_id", user.id)
          .eq("campaign_id", id);

        if (error) throw error;
        
        setSavedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        
        toast.success('Campaign removed from saved');
      } else {
        const { error } = await supabase
          .from("saved_campaigns")
          .insert({ 
            user_id: user.id, 
            campaign_id: id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        
        setSavedIds(prev => new Set(prev).add(id));
        toast.success('Campaign saved!');
      }
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

    if (!creatorProfile) {
      toast.error('Please complete your creator profile first');
      navigate('/become-creator');
      return;
    }

    // Check viewer requirement
    if (campaign.min_viewers > 0 && !meetsViewerRequirement(campaign.min_viewers)) {
      toast.error(`This campaign requires at least ${campaign.min_viewers} average viewers`);
      return;
    }

    try {
      const { error } = await supabase
        .from("campaign_applications")
        .insert({ 
          creator_id: user.id,
          campaign_id: campaign.id,
          business_id: campaign.business_id,
          status: 'pending',
          proposed_amount: campaign.budget || null,
          applied_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast.error('You have already applied to this campaign');
        } else {
          throw error;
        }
      } else {
        setAppliedIds(prev => new Set(prev).add(campaign.id));
        toast.success('Application submitted successfully!');
        setTimeout(() => setSelectedCampaign(null), 1500);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] text-[#1D1D1D] font-sans overflow-x-hidden pb-[100px]">
      {/* Header */}
      <div className="px-5 py-6 sticky top-[84px] bg-[#FDFDFD]/95 backdrop-blur-md z-20 border-b border-[#1D1D1D]/10">
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
            <p className="text-xs opacity-30 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          filteredData.map((campaign) => {
            const isSaved = savedIds.has(campaign.id);
            const hasApplied = appliedIds.has(campaign.id);
            const meetsViewers = meetsViewerRequirement(campaign.min_viewers);
            const daysLeft = formatDate(campaign.closing_date);
            
            return (
              <motion.div 
                key={campaign.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedCampaign(campaign)}
                className="relative bg-white border-2 border-[#1D1D1D] rounded-xl overflow-visible transition-all cursor-pointer group hover:shadow-lg active:scale-[0.99]"
              >
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
                {campaign.is_verified && (
                  <div className="absolute top-4 right-20 z-10 flex items-center gap-1 bg-[#389C9A]/10 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Verified</span>
                  </div>
                )}

                {/* Main Content */}
                <div className="p-6 flex gap-5 pt-12">
                  <div className="relative w-24 h-32 shrink-0 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-lg overflow-hidden">
                    <ImageWithFallback 
                      src={campaign.logo} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                      alt={campaign.name}
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-start gap-3 pt-2">
                    <h3 className="text-xl font-black uppercase tracking-tight leading-tight">
                      {campaign.business?.business_name || campaign.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/40 italic">
                        {campaign.industry?.toUpperCase()}
                      </span>
                      <span className="text-[#1D1D1D]/20">·</span>
                      <MapPin className="w-3 h-3 text-[#389C9A]" />
                      <span className="text-[9px] font-bold text-[#1D1D1D]/40 italic">
                        {campaign.location?.toUpperCase()}
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
                        Min. {campaign.min_viewers} avg viewers required
                        {!meetsViewers && creatorProfile && ` (You have ${creatorProfile.avg_concurrent || 0})`}
                      </span>
                    </div>

                    {/* Niche Tags */}
                    {campaign.niche_tags && campaign.niche_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {campaign.niche_tags.slice(0, 3).map(tag => (
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
                      {campaign.pay_rate}
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
                    <div className="bg-green-500 text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 className="w-4 h-4" /> APPLIED
                    </div>
                  ) : (
                    <button className="bg-[#1D1D1D] text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all active:scale-[0.98] whitespace-nowrap">
                      VIEW DETAILS <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
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
                      src={selectedCampaign.logo} 
                      className="w-full h-full object-cover" 
                      alt={selectedCampaign.name}
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
                      {selectedCampaign.is_verified && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-[#389C9A]">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-[#1D1D1D]/10 p-4">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Pay Rate</p>
                    <p className="text-xl font-black text-[#D2691E]">{selectedCampaign.pay_rate}</p>
                    <p className="text-[8px] font-medium opacity-40">per {selectedCampaign.streams_required} streams</p>
                  </div>
                  <div className="border border-[#1D1D1D]/10 p-4">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Min. Viewers</p>
                    <p className="text-xl font-black">{selectedCampaign.min_viewers}</p>
                    <p className="text-[8px] font-medium opacity-40">average concurrent</p>
                  </div>
                </div>

                {/* About */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2">About the Campaign</h3>
                  <p className="text-sm leading-relaxed opacity-60">{selectedCampaign.about}</p>
                </div>

                {/* Requirements */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2">Requirements</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                      <span>Minimum {selectedCampaign.min_viewers} concurrent viewers</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                      <span>Complete {selectedCampaign.streams_required} live streams</span>
                    </li>
                    {selectedCampaign.niche_tags?.map(tag => (
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
                    onClick={() => toggleSave(selectedCampaign.id, {} as any)}
                    className={`flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      savedIds.has(selectedCampaign.id) ? 'bg-[#389C9A] text-white border-[#389C9A]' : 'hover:bg-[#1D1D1D] hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    {savedIds.has(selectedCampaign.id) ? 'Saved' : 'Save'}
                  </button>
                  
                  <button
                    onClick={() => applyToCampaign(selectedCampaign)}
                    disabled={appliedIds.has(selectedCampaign.id) || !meetsViewerRequirement(selectedCampaign.min_viewers)}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      appliedIds.has(selectedCampaign.id)
                        ? 'bg-green-500 text-white cursor-not-allowed'
                        : !meetsViewerRequirement(selectedCampaign.min_viewers)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#1D1D1D] text-white hover:bg-[#389C9A]'
                    }`}
                  >
                    {appliedIds.has(selectedCampaign.id) ? (
                      <>Applied <CheckCircle2 className="w-4 h-4" /></>
                    ) : !meetsViewerRequirement(selectedCampaign.min_viewers) ? (
                      <>Requirements Not Met</>
                    ) : (
                      <>Apply Now <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {/* Deadline */}
                {selectedCampaign.closing_date && (
                  <p className="text-center text-[9px] font-medium opacity-40 mt-4">
                    Applications close {new Date(selectedCampaign.closing_date).toLocaleDateString()}
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