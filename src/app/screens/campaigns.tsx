import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,
  Video,
  Calendar,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface CampaignCreator {
  id: string;
  creator_id: string;
  streams_completed: number;
  streams_target: number;
  status: string;
  creator?: {
    id: string;
    stage_name: string;
    profile_image: string;
  };
}

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: string;
  description?: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Draft' | 'Pending';
  progress: number;
  streams_completed: number;
  streams_target: number;
  budget: number;
  spent: number;
  creator_count: number;
  creators_accepted: number;
  logo: string;
  business_name: string;
  start_date?: string;
  end_date?: string;
  campaign_creators?: CampaignCreator[];
  created_at: string;
}

export function BusinessCampaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0,
    totalSpent: 0,
    totalCreators: 0,
    totalStreams: 0
  });

  useEffect(() => {
    if (user) {
      fetchBusinessCampaigns();
    }
  }, [user]);

  const fetchBusinessCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // First get business profile
      const { data: businessProfile, error: profileError } = await supabase
        .from("businesses")
        .select("id, business_name, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking business profile:', profileError);
        toast.error('Business profile system unavailable');
        setCampaigns([]);
        return;
      }

      if (!businessProfile) {
        // User is not a business
        setCampaigns([]);
        setStats({
          total: 0,
          active: 0,
          upcoming: 0,
          completed: 0,
          totalSpent: 0,
          totalCreators: 0,
          totalStreams: 0
        });
        return;
      }

      // Fetch campaigns created by this business
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_creators (
            id,
            creator_id,
            streams_completed,
            streams_target,
            status,
            creator:creators (
              id,
              stage_name,
              profile_image
            )
          )
        `)
        .eq("business_id", businessProfile.id)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      if (campaignsData) {
        // Transform data to match our interface
        const formattedCampaigns = campaignsData.map((campaign: any) => {
          const creators = campaign.campaign_creators || [];
          const acceptedCreators = creators.filter((c: any) => 
            c.status === 'ACTIVE' || c.status === 'COMPLETED'
          );
          
          const streamsCompleted = acceptedCreators.reduce(
            (sum: number, c: any) => sum + (c.streams_completed || 0), 
            0
          );
          
          const streamsTarget = acceptedCreators.reduce(
            (sum: number, c: any) => sum + (c.streams_target || 4), 
            0
          );
          
          const progress = streamsTarget > 0 
            ? Math.min(100, Math.round((streamsCompleted / streamsTarget) * 100))
            : 0;

          // Calculate spent amount based on completed streams
          const spent = acceptedCreators.reduce((sum: number, c: any) => {
            if (c.status === 'COMPLETED') {
              // Assuming £50 per completed stream - adjust based on your payment model
              return sum + (c.streams_completed * 50);
            }
            return sum;
          }, 0);

          // Determine campaign status
          let status: 'Active' | 'Upcoming' | 'Completed' | 'Draft' | 'Pending' = 'Draft';
          
          const now = new Date();
          const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
          const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
          
          if (campaign.status === 'ACTIVE') {
            status = 'Active';
          } else if (campaign.status === 'COMPLETED' || (endDate && endDate < now)) {
            status = 'Completed';
          } else if (campaign.status === 'DRAFT') {
            status = 'Draft';
          } else if (startDate && startDate > now) {
            status = 'Upcoming';
          } else {
            status = 'Pending';
          }

          return {
            id: campaign.id,
            business_id: campaign.business_id,
            name: campaign.name,
            type: campaign.type || 'Standard',
            description: campaign.description,
            status,
            progress,
            streams_completed: streamsCompleted,
            streams_target: streamsTarget,
            budget: campaign.budget || 0,
            spent,
            creator_count: creators.length,
            creators_accepted: acceptedCreators.length,
            logo: businessProfile.logo_url || 'https://via.placeholder.com/100',
            business_name: businessProfile.business_name,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            campaign_creators: creators,
            created_at: campaign.created_at
          };
        });

        setCampaigns(formattedCampaigns);

        // Calculate stats
        const total = formattedCampaigns.length;
        const active = formattedCampaigns.filter(c => c.status === 'Active').length;
        const upcoming = formattedCampaigns.filter(c => c.status === 'Upcoming').length;
        const completed = formattedCampaigns.filter(c => c.status === 'Completed').length;
        const totalSpent = formattedCampaigns.reduce((sum, c) => sum + c.spent, 0);
        const totalCreators = formattedCampaigns.reduce((sum, c) => sum + c.creator_count, 0);
        const totalStreams = formattedCampaigns.reduce((sum, c) => sum + c.streams_completed, 0);

        setStats({
          total,
          active,
          upcoming,
          completed,
          totalSpent,
          totalCreators,
          totalStreams
        });
      }
    } catch (error) {
      console.error('Error fetching business campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchBusinessCampaigns();
    setRefreshing(false);
    toast.success('Campaigns updated');
  };

  // Filter campaigns based on search and status filter
  const filteredCampaigns = campaigns.filter(camp => {
    const matchesSearch = 
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (camp.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === "All" || camp.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filters = ["All", "Active", "Upcoming", "Completed", "Draft", "Pending"];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-[#389C9A] text-white border-[#389C9A]';
      case 'Upcoming': return 'bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10';
      case 'Completed': return 'bg-green-500 text-white border-green-500';
      case 'Draft': return 'bg-gray-200 text-gray-600 border-gray-300';
      case 'Pending': return 'bg-orange-100 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const getProgressColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-[#389C9A]';
      case 'Upcoming': return 'bg-[#FEDB71]';
      case 'Completed': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getCampaignLink = (campaign: Campaign) => {
    if (campaign.status === 'Draft') {
      return `/campaign/setup/${campaign.id}`;
    } else if (campaign.status === 'Active') {
      return `/business/campaign/overview/${campaign.id}`;
    } else if (campaign.status === 'Upcoming') {
      return `/business/campaign/${campaign.id}/preview`;
    } else {
      return `/business/campaign/${campaign.id}/analytics`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Active': return <Clock className="w-3 h-3" />;
      case 'Completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'Draft': return <AlertCircle className="w-3 h-3" />;
      default: return <Calendar className="w-3 h-3" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="My Campaigns" />
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

  // If user is not a business
  if (!loading && campaigns.length === 0 && !stats.total) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="My Campaigns" />
        <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center">
          <Video className="w-16 h-16 text-[#389C9A] mb-4" />
          <h3 className="text-lg font-black uppercase mb-2">Not a Business</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-[280px]">
            You need to be a business to create and manage campaigns.
          </p>
          <Link 
            to="/become-business" 
            className="bg-[#1D1D1D] text-white px-8 py-4 text-xs font-black uppercase tracking-widest italic"
          >
            Become a Business
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="My Campaigns" />
      
      <div className="px-6 py-6 sticky top-[84px] bg-white z-20 border-b border-[#1D1D1D]/10">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="text-center">
            <p className="text-lg font-black text-[#389C9A]">{stats.active}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-[#FEDB71]">{stats.upcoming}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Upcoming</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-green-500">{stats.completed}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-[#1D1D1D]">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Spent</p>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#F8F8F8] border border-[#1D1D1D]/10">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#389C9A]" />
            <div>
              <p className="text-sm font-black">{stats.totalCreators}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Total Creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#FEDB71]" />
            <div>
              <p className="text-sm font-black">{stats.totalStreams}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Streams Completed</p>
            </div>
          </div>
        </div>

        {/* Create New Campaign Button */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/campaign/type" 
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
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border-2 transition-all ${
                activeFilter === filter 
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" 
                : "bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40"
              }`}
            >
              {filter} {filter !== 'All' && `(${campaigns.filter(c => c.status === filter).length})`}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        {filteredCampaigns.length === 0 ? (
          <div className="mt-12 p-8 border-2 border-dashed border-[#1D1D1D]/10 flex flex-col items-center text-center">
            <Video className="w-12 h-12 opacity-20 mb-4 text-[#389C9A]" />
            <p className="text-sm font-medium text-[#1D1D1D]/40 leading-relaxed max-w-[220px] italic mb-4">
              {searchQuery 
                ? "No campaigns match your search"
                : "Create your first campaign to start working with creators."}
            </p>
            {!searchQuery && (
              <Link to="/campaign/type" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                Create Campaign →
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
                  onClick={() => navigate(getCampaignLink(camp))}
                  className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-6 active:bg-[#F8F8F8] transition-colors cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 grayscale group-hover:grayscale-0 transition-all overflow-hidden">
                        <ImageWithFallback src={camp.logo} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1 group-hover:italic transition-all">
                          {camp.name}
                        </h3>
                        <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                          {camp.type} • {camp.creator_count} Creator{camp.creator_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border ${getStatusColor(camp.status)}`}>
                      {camp.status}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest italic">
                      <span className="opacity-40">Overall Progress</span>
                      <span className="text-[#389C9A]">
                        {camp.streams_completed}/{camp.streams_target} Streams
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1D1D1D]/5 w-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getProgressColor(camp.status)}`}
                        style={{ width: `${camp.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget/Spend Row */}
                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-[#1D1D1D]/10">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-30 mb-1 italic">Budget</p>
                      <p className="text-sm font-black text-[#389C9A]">{formatCurrency(camp.budget)}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-30 mb-1 italic">Spent</p>
                      <p className="text-sm font-black">{formatCurrency(camp.spent)}</p>
                    </div>
                  </div>

                  {/* Creators Preview */}
                  {camp.campaign_creators && camp.campaign_creators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {camp.campaign_creators.slice(0, 3).map((creator, idx) => (
                          <div 
                            key={creator.id || idx}
                            className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
                          >
                            {creator.creator?.profile_image ? (
                              <img 
                                src={creator.creator.profile_image} 
                                alt={creator.creator.stage_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#389C9A] flex items-center justify-center text-white text-xs font-black">
                                {(creator.creator?.stage_name?.[0] || 'C').toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {camp.creator_count > 3 && (
                        <span className="text-[8px] font-black text-[#1D1D1D]/40">
                          +{camp.creator_count - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      {/* Status-specific indicators */}
                      <div className={`flex items-center gap-1 text-[8px] font-black ${
                        camp.status === 'Active' ? 'text-[#389C9A]' :
                        camp.status === 'Completed' ? 'text-green-500' :
                        camp.status === 'Draft' ? 'text-gray-400' :
                        'text-[#FEDB71]'
                      }`}>
                        {getStatusIcon(camp.status)}
                        {camp.status === 'Active' && 'Live Now'}
                        {camp.status === 'Upcoming' && 'Starts ' + new Date(camp.start_date || '').toLocaleDateString()}
                        {camp.status === 'Completed' && 'Completed'}
                        {camp.status === 'Draft' && 'Draft'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest underline underline-offset-4 decoration-[#389C9A] text-[#1D1D1D]">
                      Manage <ChevronRight className="w-3 h-3 text-[#FEDB71]" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Summary Stats */}
            <div className="mt-8 p-6 bg-[#F8F8F8] border-2 border-[#1D1D1D]">
              <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-4">Campaign Summary</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-2xl font-black">{stats.active}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Active Now</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{formatCurrency(stats.totalSpent)}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.completed}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.totalCreators}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Creators</p>
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
