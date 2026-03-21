import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { 
  Search, 
  Plus, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Video as VideoIcon,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Users,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Copy,
  Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget: number;
  pay_rate: number;
  start_date: string;
  end_date: string;
  target_niches: string[];
  target_locations: string[];
  min_followers: number;
  created_at: string;
  applications_count?: number;
  accepted_creators?: number;
}

interface CampaignStats {
  total_applications: number;
  accepted_creators: number;
  total_spent: number;
  active_campaigns: number;
}

export function BusinessCampaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<CampaignStats>({
    total_applications: 0,
    accepted_creators: 0,
    total_spent: 0,
    active_campaigns: 0
  });
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
    }
  }, [user]);

  const fetchBusinessProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setBusinessId(data.id);
        fetchCampaigns(data.id);
      } else {
        toast.error("Business profile not found");
        navigate("/business/setup");
      }
    } catch (error) {
      console.error("Error fetching business profile:", error);
      toast.error("Failed to load business profile");
    }
  };

  const fetchCampaigns = async (bizId: string) => {
    if (!bizId) return;
    
    try {
      setLoading(true);

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      if (campaignsData && campaignsData.length > 0) {
        // Get application counts for each campaign
        const campaignsWithStats = await Promise.all(
          campaignsData.map(async (campaign) => {
            // Get total applications
            const { count: applicationsCount } = await supabase
              .from("campaign_creators")
              .select("*", { count: 'exact', head: true })
              .eq("campaign_id", campaign.id);

            // Get accepted creators
            const { count: acceptedCount } = await supabase
              .from("campaign_creators")
              .select("*", { count: 'exact', head: true })
              .eq("campaign_id", campaign.id)
              .eq("status", "active");

            return {
              ...campaign,
              applications_count: applicationsCount || 0,
              accepted_creators: acceptedCount || 0
            };
          })
        );

        setCampaigns(campaignsWithStats);

        // Calculate overall stats
        const total_applications = campaignsWithStats.reduce((sum, c) => sum + (c.applications_count || 0), 0);
        const accepted_creators = campaignsWithStats.reduce((sum, c) => sum + (c.accepted_creators || 0), 0);
        const total_spent = campaignsWithStats
          .filter(c => c.status === 'completed')
          .reduce((sum, c) => sum + (c.budget || 0), 0);
        const active_campaigns = campaignsWithStats.filter(c => c.status === 'active').length;

        setStats({
          total_applications,
          accepted_creators,
          total_spent,
          active_campaigns
        });
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!businessId) return;
    setRefreshing(true);
    await fetchCampaigns(businessId);
    setRefreshing(false);
    toast.success('Campaigns updated');
  };

  const handleDeleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast.success("Campaign deleted successfully");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          business_id: campaign.business_id,
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          description: campaign.description,
          budget: campaign.budget,
          pay_rate: campaign.pay_rate,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          target_niches: campaign.target_niches,
          target_locations: campaign.target_locations,
          min_followers: campaign.min_followers,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (businessId) {
        await fetchCampaigns(businessId);
      }
      
      toast.success("Campaign duplicated successfully");
      navigate(`/business/campaign/edit/${data.id}`);
    } catch (error) {
      console.error("Error duplicating campaign:", error);
      toast.error("Failed to duplicate campaign");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-[#389C9A] text-white border-[#389C9A]';
      case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'paused': return 'bg-[#FEDB71] text-[#1D1D1D] border-[#FEDB71]';
      case 'completed': return 'bg-green-500 text-white border-green-500';
      case 'cancelled': return 'bg-red-500 text-white border-red-500';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return <CheckCircle2 className="w-3 h-3" />;
      case 'draft': return <Edit className="w-3 h-3" />;
      case 'paused': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const filters = [
    { value: "all", label: "All Campaigns" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" }
  ];

  const filteredCampaigns = campaigns.filter(camp => {
    const matchesSearch = 
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === "all" || camp.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Campaigns" userType="business" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your campaigns...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Campaigns" userType="business" />
      
      <div className="px-6 py-6 sticky top-[84px] max-w-[480px] bg-white z-20 border-b border-[#1D1D1D]/10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#F8F8F8] p-4 border-2 border-[#1D1D1D]">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Applications</span>
            </div>
            <p className="text-2xl font-black">{stats.total_applications}</p>
            <p className="text-[8px] font-medium opacity-40 mt-1">Total applications received</p>
          </div>
          
          <div className="bg-[#F8F8F8] p-4 border-2 border-[#1D1D1D]">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Accepted</span>
            </div>
            <p className="text-2xl font-black">{stats.accepted_creators}</p>
            <p className="text-[8px] font-medium opacity-40 mt-1">Creators accepted</p>
          </div>
          
          <div className="bg-[#F8F8F8] p-4 border-2 border-[#1D1D1D]">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-4 h-4 text-[#D2691E]" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Spent</span>
            </div>
            <p className="text-2xl font-black">₦{stats.total_spent.toLocaleString()}</p>
            <p className="text-[8px] font-medium opacity-40 mt-1">Total campaign spend</p>
          </div>
          
          <div className="bg-[#F8F8F8] p-4 border-2 border-[#1D1D1D]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Active</span>
            </div>
            <p className="text-2xl font-black">{stats.active_campaigns}</p>
            <p className="text-[8px] font-medium opacity-40 mt-1">Live campaigns</p>
          </div>
        </div>

        {/* Create Campaign Button */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/business/create-campaign" 
            className="w-full bg-[#1D1D1D] text-white py-4 px-6 text-[10px] font-black uppercase italic tracking-widest flex items-center justify-between active:scale-[0.98] transition-all hover:bg-[#389C9A]"
          >
            Create New Campaign
            <Plus className="w-5 h-5 text-[#FEDB71]" />
          </Link>
        </div>
        
        {/* Search and Refresh */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH CAMPAIGNS..."
              className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 py-3 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#1D1D1D] italic transition-all"
            />
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`whitespace-nowrap px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border-2 transition-all ${
                activeFilter === filter.value 
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" 
                : "bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40"
              }`}
            >
              {filter.label} 
              {filter.value !== 'all' && ` (${campaigns.filter(c => c.status === filter.value).length})`}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        {filteredCampaigns.length === 0 ? (
          <div className="mt-12 p-8 border-2 border-dashed border-[#1D1D1D]/10 flex flex-col items-center text-center">
            <Megaphone className="w-12 h-12 opacity-20 mb-4 text-[#389C9A]" />
            <p className="text-sm font-medium text-[#1D1D1D]/40 leading-relaxed max-w-[220px] italic mb-4">
              {searchQuery 
                ? "No campaigns match your search"
                : "You haven't created any campaigns yet."}
            </p>
            {!searchQuery && (
              <Link to="/business/create-campaign" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                Create Your First Campaign →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCampaigns.map((camp) => (
                <motion.div 
                  key={camp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white border-2 border-[#1D1D1D] overflow-hidden transition-all group"
                >
                  {/* Header with Status */}
                  <div className={`p-4 border-b-2 border-[#1D1D1D] ${camp.status === 'active' ? 'bg-[#389C9A]/5' : 'bg-white'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-1">
                          {camp.name}
                        </h3>
                        <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                          {camp.type} • Created {new Date(camp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${getStatusColor(camp.status)}`}>
                        {getStatusIcon(camp.status)}
                        {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                      </div>
                    </div>
                  </div>

                  {/* Campaign Details */}
                  <div className="p-4 space-y-4">
                    {/* Description */}
                    <p className="text-[11px] text-[#1D1D1D]/60 line-clamp-2">
                      {camp.description || "No description provided"}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center">
                        <DollarSign className="w-4 h-4 text-[#D2691E] mx-auto mb-1" />
                        <p className="text-sm font-black">₦{camp.budget?.toLocaleString() || 0}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Budget</p>
                      </div>
                      <div className="text-center">
                        <Users className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
                        <p className="text-sm font-black">{camp.applications_count || 0}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Applications</p>
                      </div>
                      <div className="text-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        <p className="text-sm font-black">{camp.accepted_creators || 0}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Accepted</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center justify-between text-[8px] font-medium text-[#1D1D1D]/40 pt-2 border-t border-[#1D1D1D]/10">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Start: {new Date(camp.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>End: {new Date(camp.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Niches */}
                    {camp.target_niches && camp.target_niches.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {camp.target_niches.slice(0, 3).map(niche => (
                          <span key={niche} className="px-2 py-0.5 bg-[#F8F8F8] text-[7px] font-black uppercase tracking-widest">
                            {niche}
                          </span>
                        ))}
                        {camp.target_niches.length > 3 && (
                          <span className="px-2 py-0.5 bg-[#F8F8F8] text-[7px] font-black uppercase tracking-widest">
                            +{camp.target_niches.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-[#F8F8F8] p-3 flex items-center gap-2 border-t-2 border-[#1D1D1D]">
                    <button
                      onClick={() => navigate(`/business/campaign/overview/${camp.id}`)}
                      className="flex-1 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 hover:bg-[#389C9A] transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View Details
                    </button>
                    
                    {camp.status === 'draft' && (
                      <button
                        onClick={() => navigate(`/business/campaign/edit/${camp.id}`)}
                        className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    
                    <div className="relative group/actions">
                      <button className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors">
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 bottom-full mb-1 bg-white border-2 border-[#1D1D1D] shadow-xl hidden group-hover/actions:block z-10 min-w-[140px]">
                        <button
                          onClick={(e) => handleDuplicateCampaign(camp, e)}
                          className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        {camp.status !== 'completed' && camp.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/business/campaign/edit/${camp.id}`)}
                            className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteCampaign(camp.id, e)}
                          className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Summary Stats */}
            <div className="mt-8 p-6 bg-[#F8F8F8] border-2 border-[#1D1D1D]">
              <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-4">Campaign Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black">{campaigns.length}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Campaigns</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.active_campaigns}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Active Now</p>
                </div>
                <div>
                  <p className="text-2xl font-black">₦{stats.total_spent.toLocaleString()}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.accepted_creators}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Creators Hired</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default BusinessCampaigns;
