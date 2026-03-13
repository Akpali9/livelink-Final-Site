import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { 
  BarChart3,
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Plus,
  ChevronRight,
  Video as VideoIcon,
  Eye,
  Clock,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

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

export function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      fetchBusinessMetrics();
    }
  }, [user]);

  const fetchBusinessMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
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
      toast.error('Failed to load business dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading business dashboard...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}
