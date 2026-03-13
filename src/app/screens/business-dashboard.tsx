import React,{ useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Video as VideoIcon,
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,
  BarChart3,
  Users,
  Target,
  Calendar,
  Award,
  Star,
  Zap,
  Globe,
  MessageCircle,
  Share2,
  Eye,
  ThumbsUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
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
  status: 'Active' | 'Upcoming' | 'Completed' | 'Pending';
  progress: number;
  streams_completed: number;
  streams_target: number;
  earnings: string;
  logo: string;
  business_name: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  campaign_creators?: {
    streams_completed: number;
    streams_target: number;
    status: string;
  }[];
}

interface BusinessMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpent: number;
  averageROI: number;
  totalCreators: number;
  totalStreams: number;
  avgEngagementRate: number;
  topPerformingCampaign: string;
  monthlyGrowth: number;
}

interface CampaignPerformance {
  id: string;
  name: string;
  type: string;
  status: string;
  streams: number;
  engagement: number;
  roi: number;
  spend: number;
  revenue: number;
  creators: number;
  completionRate: number;
}

export function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'creator' | 'business'>('creator');
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpent: 0,
    averageROI: 0,
    totalCreators: 0,
    totalStreams: 0,
    avgEngagementRate: 0,
    topPerformingCampaign: '',
    monthlyGrowth: 0
  });
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchBusinessMetrics();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Get creator profile first to get creator_id if needed
      const { data: creatorProfile } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      // Fetch campaigns where creator is involved
      const { data: campaignCreators, error: campaignError } = await supabase
        .from("campaign_creators")
        .select(`
          id,
          streams_completed,
          streams_target,
          status,
          accepted_at,
          completed_at,
          campaign:campaigns (
            id,
            name,
            type,
            status,
            budget,
            start_date,
            end_date,
            business:businesses (
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq("creator_id", creatorProfile?.id || user.id)
        .order("accepted_at", { ascending: false });

      if (campaignError) throw campaignError;

      if (campaignCreators) {
        // Transform data to match our interface
        const formattedCampaigns = campaignCreators.map((item: any) => {
          const campaign = item.campaign;
          const streamsCompleted = item.streams_completed || 0;
          const streamsTarget = item.streams_target || 4;
          const progress = Math.min(100, Math.round((streamsCompleted / streamsTarget) * 100));
          
          // Determine campaign status based on creator's status and dates
          let status: 'Active' | 'Upcoming' | 'Completed' | 'Pending' = 'Pending';
          
          if (item.status === 'COMPLETED' || progress === 100) {
            status = 'Completed';
          } else if (item.status === 'ACTIVE') {
            status = 'Active';
          } else if (item.status === 'PENDING') {
            status = 'Upcoming';
          }

          // Calculate earnings (placeholder - replace with actual earnings logic)
          const earnings = campaign.budget ? `£${campaign.budget}` : '£0.00';

          return {
            id: campaign.id,
            business_id: campaign.business?.id,
            name: campaign.name,
            type: campaign.type,
            status,
            progress,
            streams_completed: streamsCompleted,
            streams_target: streamsTarget,
            earnings,
            logo: campaign.business?.logo_url || 'https://via.placeholder.com/100',
            business_name: campaign.business?.business_name || 'Unknown Brand',
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            budget: campaign.budget,
            campaign_creators: [item]
          };
        });

        setCampaigns(formattedCampaigns);

        // Calculate stats
        const total = formattedCampaigns.length;
        const active = formattedCampaigns.filter(c => c.status === 'Active').length;
        const upcoming = formattedCampaigns.filter(c => c.status === 'Upcoming').length;
        const completed = formattedCampaigns.filter(c => c.status === 'Completed').length;
        const totalEarnings = formattedCampaigns
          .filter(c => c.status === 'Completed')
          .reduce((sum, c) => sum + (parseFloat(c.earnings.replace('£', '')) || 0), 0);

        setStats({ total, active, upcoming, completed, totalEarnings });
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessMetrics = async () => {
    if (!user) return;

    try {
      // Fetch business campaigns data
      const { data: businessCampaigns, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_creators (
            id,
            streams_completed,
            status,
            creator:creator_profiles (
              id,
              user_id
            )
          )
        `)
        .eq("business_id", user.id);

      if (error) throw error;

      if (businessCampaigns) {
        // Calculate business metrics
        const totalCampaigns = businessCampaigns.length;
        const activeCampaigns = businessCampaigns.filter(c => c.status === 'ACTIVE').length;
        const totalSpent = businessCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
        const totalCreators = businessCampaigns.reduce((sum, c) => sum + (c.campaign_creators?.length || 0), 0);
        const totalStreams = businessCampaigns.reduce((sum, c) => 
          sum + (c.campaign_creators?.reduce((s, cc) => s + (cc.streams_completed || 0), 0) || 0), 0);
        
        // Calculate average ROI (mock calculation - replace with actual revenue data)
        const averageROI = totalSpent > 0 ? ((totalStreams * 10) / totalSpent) * 100 : 0;
        
        // Calculate engagement rate (mock)
        const avgEngagementRate = totalStreams > 0 ? 4.5 : 0;
        
        // Find top performing campaign
        const topPerforming = businessCampaigns.reduce((top, current) => {
          const currentStreams = current.campaign_creators?.reduce((s, cc) => s + (cc.streams_completed || 0), 0) || 0;
          const topStreams = top?.campaign_creators?.reduce((s, cc) => s + (cc.streams_completed || 0), 0) || 0;
          return currentStreams > topStreams ? current : top;
        }, businessCampaigns[0]);

        // Calculate monthly growth (mock)
        const monthlyGrowth = 15.5;

        setBusinessMetrics({
          totalCampaigns,
          activeCampaigns,
          totalSpent,
          averageROI,
          totalCreators,
          totalStreams,
          avgEngagementRate,
          topPerformingCampaign: topPerforming?.name || 'None',
          monthlyGrowth
        });

        // Generate campaign performance data
        const performance: CampaignPerformance[] = businessCampaigns.map(c => {
          const streams = c.campaign_creators?.reduce((s, cc) => s + (cc.streams_completed || 0), 0) || 0;
          const activeCreators = c.campaign_creators?.filter(cc => cc.status === 'ACTIVE').length || 0;
          const totalCreatorsInCampaign = c.campaign_creators?.length || 0;
          const completionRate = totalCreatorsInCampaign > 0 ? (activeCreators / totalCreatorsInCampaign) * 100 : 0;
          
          return {
            id: c.id,
            name: c.name,
            type: c.type || 'Standard',
            status: c.status,
            streams,
            engagement: Math.min(100, streams * 2.5),
            roi: c.budget ? ((streams * 10) / c.budget) * 100 : 0,
            spend: c.budget || 0,
            revenue: streams * 10,
            creators: totalCreatorsInCampaign,
            completionRate
          };
        });

        setCampaignPerformance(performance);
      }
    } catch (error) {
      console.error('Error fetching business metrics:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchCampaigns(), fetchBusinessMetrics()]);
    setRefreshing(false);
    toast.success('Data updated');
  };

  // Filter campaigns based on search and status filter
  const filteredCampaigns = campaigns.filter(camp => {
    const matchesSearch = 
      camp.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === "All" || camp.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filters = ["All", "Active", "Upcoming", "Completed", "Pending"];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-[#389C9A] text-white border-[#389C9A]';
      case 'Upcoming': return 'bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10';
      case 'Completed': return 'bg-green-500 text-white border-green-500';
      case 'Pending': return 'bg-gray-100 text-gray-500 border-gray-200';
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
    if (campaign.status === 'Active') {
      return `/campaign/live-update/${campaign.id}`;
    } else if (campaign.status === 'Upcoming') {
      return `/creator/upcoming-gig/${campaign.id}`;
    } else {
      return `/campaign/${campaign.id}/summary`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Campaign Dashboard" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Campaign Dashboard" />
      
      <div className="px-6 py-4 sticky top-[84px] bg-white z-20 border-b border-[#1D1D1D]/10">
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('creator')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest italic border-2 transition-all ${
              activeTab === 'creator'
                ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                : 'bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40'
            }`}
          >
            Creator View
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest italic border-2 transition-all ${
              activeTab === 'business'
                ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                : 'bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40'
            }`}
          >
            Business Dashboard
          </button>
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

        {/* Status Filters (only show for creator view) */}
        {activeTab === 'creator' && (
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
        )}
      </div>

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        {activeTab === 'creator' ? (
          /* Creator View - Your existing campaigns list */
          <>
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
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Done</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-[#1D1D1D]">₦{stats.totalEarnings}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Earned</p>
              </div>
            </div>

            {/* Find Opportunities Button */}
            <div className="flex items-center justify-between mb-6">
              <Link 
                to="/browse-businesses" 
                className="w-full bg-[#1D1D1D] text-white py-4 px-6 text-[10px] font-black uppercase italic tracking-widest flex items-center justify-between active:scale-[0.98] transition-all hover:bg-[#389C9A]"
              >
                Find New Opportunities
                <Plus className="w-5 h-5 text-[#FEDB71]" />
              </Link>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="mt-12 p-8 border-2 border-dashed border-[#1D1D1D]/10 flex flex-col items-center text-center">
                <VideoIcon className="w-12 h-12 opacity-20 mb-4 text-[#389C9A]" />
                <p className="text-sm font-medium text-[#1D1D1D]/40 leading-relaxed max-w-[220px] italic mb-4">
                  {searchQuery 
                    ? "No campaigns match your search"
                    : "New campaigns appear here once you've been accepted by a brand."}
                </p>
                {!searchQuery && (
                  <Link to="/browse-businesses" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                    Find Opportunities →
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
                              {camp.business_name}
                            </h3>
                            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                              {camp.name} • {camp.type}
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
                          <span className="opacity-40">Progress</span>
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

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-[7px] font-black uppercase tracking-widest opacity-30 mb-1 italic">
                            {camp.status === 'Completed' ? 'Total Earned' : 'Potential Earnings'}
                          </p>
                          <p className="text-xl font-black italic leading-none text-[#389C9A]">
                            {camp.earnings}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Status-specific indicators */}
                          {camp.status === 'Active' && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-[#389C9A]">
                              <Clock className="w-3 h-3" /> Live
                            </div>
                          )}
                          {camp.status === 'Upcoming' && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-[#FEDB71]">
                              <Clock className="w-3 h-3" /> Starts Soon
                            </div>
                          )}
                          {camp.status === 'Completed' && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-green-500">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest underline underline-offset-4 decoration-[#389C9A] text-[#1D1D1D]">
                            Manage <ChevronRight className="w-3 h-3 text-[#FEDB71]" />
                          </div>
                        </div>
                      </div>

                      {/* Campaign Type Badge */}
                      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <VideoIcon className="w-12 h-12" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Summary Stats */}
                <div className="mt-8 p-6 bg-[#F8F8F8] border-2 border-[#1D1D1D]">
                  <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-4">Campaign Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-black">{stats.active}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Active Now</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">₦{stats.totalEarnings}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Earned</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">{stats.completed}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black">{stats.upcoming}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Upcoming</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Business Dashboard View */
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1D1D1D] text-white p-4 border-2 border-[#1D1D1D]">
                <BarChart3 className="w-5 h-5 mb-2 text-[#FEDB71]" />
                <p className="text-2xl font-black">{businessMetrics.totalCampaigns}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Total Campaigns</p>
              </div>
              <div className="bg-[#389C9A] text-white p-4 border-2 border-[#389C9A]">
                <TrendingUp className="w-5 h-5 mb-2 text-white" />
                <p className="text-2xl font-black">{businessMetrics.activeCampaigns}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Active Now</p>
              </div>
              <div className="bg-white p-4 border-2 border-[#1D1D1D]">
                <DollarSign className="w-5 h-5 mb-2 text-[#389C9A]" />
                <p className="text-2xl font-black">₦{businessMetrics.totalSpent.toLocaleString()}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Spent</p>
              </div>
              <div className="bg-white p-4 border-2 border-[#1D1D1D]">
                <Target className="w-5 h-5 mb-2 text-[#FEDB71]" />
                <p className="text-2xl font-black">{businessMetrics.averageROI.toFixed(1)}%</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Avg ROI</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-[#F8F8F8] p-6 border-2 border-[#1D1D1D]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest">Performance Metrics</h3>
                <span className="text-[8px] font-black text-green-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +{businessMetrics.monthlyGrowth}% vs last month
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Total Creators</p>
                  <p className="text-xl font-black flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#389C9A]" />
                    {businessMetrics.totalCreators}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Total Streams</p>
                  <p className="text-xl font-black flex items-center gap-2">
                    <VideoIcon className="w-4 h-4 text-[#FEDB71]" />
                    {businessMetrics.totalStreams}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Engagement Rate</p>
                  <p className="text-xl font-black flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    {businessMetrics.avgEngagementRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Top Campaign</p>
                  <p className="text-sm font-black truncate" title={businessMetrics.topPerformingCampaign}>
                    {businessMetrics.topPerformingCampaign}
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign Performance Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#389C9A]" />
                Campaign Performance
              </h3>
              
              {campaignPerformance.map((camp) => (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-[#1D1D1D] p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-sm">{camp.name}</h4>
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">
                        {camp.type} • {camp.creators} creators
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-[7px] font-black uppercase border ${
                      camp.status === 'ACTIVE' ? 'bg-[#389C9A] text-white' : 'bg-gray-100'
                    }`}>
                      {camp.status}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[8px] font-black">
                      <span className="opacity-40">Completion Rate</span>
                      <span className="text-[#389C9A]">{camp.completionRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1D1D1D]/5 w-full overflow-hidden">
                      <div 
                        className="h-full bg-[#389C9A] transition-all duration-500"
                        style={{ width: `${camp.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-black">{camp.streams}</p>
                      <p className="text-[7px] font-black uppercase opacity-40">Streams</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black">{camp.engagement.toFixed(0)}%</p>
                      <p className="text-[7px] font-black uppercase opacity-40">Engage</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black">{camp.roi.toFixed(0)}%</p>
                      <p className="text-[7px] font-black uppercase opacity-40">ROI</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black">₦{camp.revenue}</p>
                      <p className="text-[7px] font-black uppercase opacity-40">Revenue</p>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <button
                    onClick={() => navigate(`/campaign/${camp.id}/analytics`)}
                    className="w-full mt-3 text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center justify-center gap-1 hover:gap-2 transition-all"
                  >
                    View Detailed Analytics <ChevronRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Link
                to="/create-campaign"
                className="bg-[#1D1D1D] text-white py-4 px-4 text-[10px] font-black uppercase italic tracking-widest flex items-center justify-center gap-2 hover:bg-[#389C9A] transition-all text-center"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </Link>
              <Link
                to="/find-creators"
                className="bg-white border-2 border-[#1D1D1D] py-4 px-4 text-[10px] font-black uppercase italic tracking-widest flex items-center justify-center gap-2 hover:bg-[#F8F8F8] transition-all text-center"
              >
                <Users className="w-4 h-4" />
                Find Creators
              </Link>
            </div>

            {/* Export Data */}
            <button
              onClick={() => toast.success('Report generated and downloaded')}
              className="w-full py-3 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-3 h-3" />
              Export Performance Report
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
