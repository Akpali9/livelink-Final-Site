import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  ArrowLeft, 
  ChevronRight, 
  Star, 
  Tv, 
  Users, 
  Calendar, 
  DollarSign,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  MoreVertical,
  Download,
  Mail
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  email?: string;
  followers_count?: number;
  avg_concurrent?: number;
  categories?: string[];
  country?: string;
}

interface CampaignCreator {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'REJECTED';
  streams_completed: number;
  streams_required: number;
  accepted_at?: string;
  completed_at?: string;
  payment_status?: 'pending' | 'paid';
  payment_amount?: number;
  creators: Creator;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  description?: string;
  budget?: number;
  price?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  streams_required: number;
  min_viewers?: number;
  target_audience?: string;
  business_id: string;
}

export function BusinessCampaignCreators() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCreator, setSelectedCreator] = useState<CampaignCreator | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    totalStreams: 0,
    completedStreams: 0
  });

  useEffect(() => {
    if (id) fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    setLoading(true);

    try {
      // 1️⃣ Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          *,
          business:businesses (
            business_name,
            logo_url
          )
        `)
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      
      if (campaignData) {
        setCampaign(campaignData);
      }

      // 2️⃣ Fetch creators linked to campaign
      const { data: linkedCreators, error: creatorsError } = await supabase
        .from("campaign_creators")
        .select(`
          id,
          status,
          streams_completed,
          streams_required,
          accepted_at,
          completed_at,
          payment_status,
          payment_amount,
          creator:creator_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq("campaign_id", id);

      if (creatorsError) throw creatorsError;

      if (linkedCreators) {
        // Format creator data
        const formattedCreators = linkedCreators.map((item: any) => ({
          id: item.id,
          status: item.status,
          streams_completed: item.streams_completed || 0,
          streams_required: item.streams_required || 4,
          accepted_at: item.accepted_at,
          completed_at: item.completed_at,
          payment_status: item.payment_status || 'pending',
          payment_amount: item.payment_amount,
          creators: {
            id: item.creator?.id,
            name: item.creator?.user_metadata?.full_name || 'Unknown',
            handle: item.creator?.user_metadata?.handle || '@creator',
            avatar: item.creator?.user_metadata?.avatar_url,
            rating: item.creator?.user_metadata?.rating || 4.5,
            email: item.creator?.email,
            followers_count: item.creator?.user_metadata?.followers_count,
            avg_concurrent: item.creator?.user_metadata?.avg_concurrent,
            categories: item.creator?.user_metadata?.categories || [],
            country: item.creator?.user_metadata?.country
          }
        }));

        setCreators(formattedCreators);

        // Calculate stats
        const total = formattedCreators.length;
        const active = formattedCreators.filter(c => c.status === 'ACTIVE').length;
        const pending = formattedCreators.filter(c => c.status === 'PENDING').length;
        const completed = formattedCreators.filter(c => c.status === 'COMPLETED').length;
        const totalStreams = formattedCreators.reduce((sum, c) => sum + c.streams_required, 0);
        const completedStreams = formattedCreators.reduce((sum, c) => sum + c.streams_completed, 0);

        setStats({
          total,
          active,
          pending,
          completed,
          totalStreams,
          completedStreams
        });
      }

    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const updateCreatorStatus = async (creatorId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ 
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq("id", creatorId);

      if (error) throw error;

      // Update local state
      setCreators(prev => prev.map(c => 
        c.id === creatorId ? { ...c, status: newStatus as any } : c
      ));

      toast.success(`Creator status updated to ${newStatus}`);
      setShowActions(false);
      
      // Refresh stats
      fetchCampaignData();
    } catch (error) {
      console.error('Error updating creator status:', error);
      toast.error('Failed to update status');
    }
  };

  const sendPayment = async (creator: CampaignCreator) => {
    try {
      // This would integrate with your payment system
      toast.info('Payment processing feature coming soon');
      
      // For now, just update payment status
      const { error } = await supabase
        .from("campaign_creators")
        .update({ payment_status: 'paid' })
        .eq("id", creator.id);

      if (error) throw error;

      setCreators(prev => prev.map(c => 
        c.id === creator.id ? { ...c, payment_status: 'paid' } : c
      ));

      toast.success('Payment marked as sent');
    } catch (error) {
      console.error('Error sending payment:', error);
      toast.error('Failed to process payment');
    }
  };

  const messageCreator = (creatorId: string) => {
    navigate(`/messages/${creatorId}`);
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = 
      creator.creators.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.creators.handle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || creator.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-[#389C9A] text-white';
      case 'PENDING': return 'bg-[#FEDB71] text-[#1D1D1D]';
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'REJECTED': return 'bg-red-500 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const getProgressPercentage = (completed: number, required: number) => {
    return Math.min(100, Math.round((completed / required) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading campaign creators...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/business/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" />

      <main className="flex-1 max-w-[480px] mx-auto w-full">
        {/* Campaign Header */}
        <section className="px-6 py-8 bg-gradient-to-r from-[#1D1D1D] to-gray-800 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
                {campaign.name}
              </h1>
              <p className="text-sm text-gray-300 opacity-80">{campaign.type}</p>
            </div>
            <div className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest ${
              campaign.status === 'ACTIVE' ? 'bg-[#389C9A]' : 'bg-gray-500'
            }`}>
              {campaign.status}
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Budget</p>
              <p className="text-xl font-black">₦{campaign.budget || campaign.price || '0'}</p>
            </div>
            <div className="bg-white/10 p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Streams Required</p>
              <p className="text-xl font-black">{campaign.streams_required}</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="px-6 py-8 border-b border-[#1D1D1D]/10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">Campaign Progress</h2>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-2xl font-black text-[#389C9A]">{stats.total}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#389C9A]">{stats.active}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#FEDB71]">{stats.pending}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-green-500">{stats.completed}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Done</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-2">
              <span>Stream Progress</span>
              <span>{stats.completedStreams}/{stats.totalStreams}</span>
            </div>
            <div className="h-2 bg-gray-100 w-full">
              <div 
                className="h-full bg-[#389C9A] transition-all duration-500"
                style={{ width: `${(stats.completedStreams / stats.totalStreams) * 100}%` }}
              />
            </div>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="px-6 py-6 border-b border-[#1D1D1D]/10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm font-black uppercase"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </section>

        {/* Creators List */}
        <section className="px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Active Creators</h3>
            <span className="text-xs font-bold bg-[#F8F8F8] px-3 py-1">
              {filteredCreators.length} of {creators.length}
            </span>
          </div>

          {filteredCreators.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium opacity-40">No creators found</p>
              <p className="text-xs opacity-30 mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCreators.map((item) => {
                const creator = item.creators;
                const progress = getProgressPercentage(item.streams_completed, item.streams_required);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-white border-2 border-[#1D1D1D] p-5 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => navigate(`/business/campaign/${campaign.id}/creator/${creator.id}`)}
                  >
                    {/* Status Badge */}
                    <div className={`absolute -top-3 right-6 px-3 py-1 text-[8px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                      {item.status}
                    </div>

                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden rounded-lg">
                        <ImageWithFallback
                          src={creator.avatar}
                          className="w-full h-full object-cover"
                          fallbackSrc="https://via.placeholder.com/100"
                        />
                      </div>

                      {/* Creator Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-base uppercase tracking-tight truncate">
                            {creator.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[8px] font-black bg-[#FEDB71] px-1.5 py-0.5">
                            <Star size={8} />
                            {creator.rating}
                          </div>
                        </div>

                        <p className="text-[9px] font-medium text-gray-400 mb-2">
                          {creator.handle}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="flex items-center gap-1 text-[8px]">
                            <Users className="w-3 h-3 text-[#389C9A]" />
                            <span>{creator.followers_count?.toLocaleString() || '0'} followers</span>
                          </div>
                          <div className="flex items-center gap-1 text-[8px]">
                            <Tv className="w-3 h-3 text-[#389C9A]" />
                            <span>{creator.avg_concurrent || '0'} avg</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[7px] font-black uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{item.streams_completed}/{item.streams_required}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 w-full">
                            <div 
                              className="h-full bg-[#389C9A] transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col items-end gap-2">
                        <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Payment Status */}
                        {item.payment_status && (
                          <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 ${
                            item.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                          }`}>
                            {item.payment_status}
                          </div>
                        )}

                        {/* Quick Actions (visible on hover) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              messageCreator(creator.id);
                            }}
                            className="p-1.5 bg-[#F8F8F8] hover:bg-[#1D1D1D] hover:text-white transition-colors"
                            title="Send message"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          {item.status === 'COMPLETED' && item.payment_status !== 'paid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendPayment(item);
                              }}
                              className="p-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors"
                              title="Send payment"
                            >
                              <DollarSign className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Categories Tags */}
                    {creator.categories && creator.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1D1D1D]/10">
                        {creator.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="text-[7px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Browse Marketplace CTA */}
        <section className="px-6 pb-12">
          <div className="bg-[#1D1D1D] text-white p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
            
            <h4 className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-2">
              Need more creators?
            </h4>
            
            <p className="text-xl font-black uppercase tracking-tight italic mb-4">
              Your campaign is still accepting applications
            </p>
            
            <button
              onClick={() => navigate("/browse")}
              className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#FEDB71] hover:gap-4 transition-all"
            >
              Browse Marketplace <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
              <div>
                <p className="text-xl font-black text-[#389C9A]">150+</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Available</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#FEDB71]">4.8</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Avg Rating</p>
              </div>
              <div>
                <p className="text-xl font-black text-green-500">24h</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Response</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}