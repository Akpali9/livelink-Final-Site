import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { 
  Bell, 
  ArrowUpRight, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Briefcase,
  Wallet,
  User,
  List,
  Monitor,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  Award,
  AlertCircle,
  MessageSquare,
  HelpCircle,
  Zap,
  Shield,
  Gift,
  Target,
  Users  // <-- This was missing
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { DeclineOfferModal } from "../components/decline-offer-modal";


interface IncomingRequest {
  id: string;
  business_id: string;
  business: string;
  name: string;
  type: string;
  streams: number;
  price: number;
  daysLeft: number;
  logo: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  campaign_id?: string;
}

interface Application {
  id: string;
  business_id: string;
  business: string;
  logo: string;
  type: string;
  amount?: number;
  status: string;
  appliedAt: string;
  campaign_id: string;
}

interface UpcomingCampaign {
  id: string;
  business_id: string;
  business: string;
  logo: string;
  startDate: string;
  package: string;
  streams_required: number;
}

interface LiveCampaign {
  id: string;
  campaign_id: string;
  business_id: string;
  business: string;
  name: string;
  logo: string;
  sessionEarnings: number;
  streamTime: string;
  progress: number;
  remainingMins: number;
  streams_completed: number;
  streams_target: number;
}

interface DashboardStats {
  totalEarned: number;
  pendingEarnings: number;
  paidOut: number;
  requestedCount: number;
  activeCount: number;
  completedCount: number;
  averageRating: number;
  totalFollowers: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const earningsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [applicationsExpanded, setApplicationsExpanded] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IncomingRequest | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEarned: 0,
    pendingEarnings: 0,
    paidOut: 0,
    requestedCount: 0,
    activeCount: 0,
    completedCount: 0,
    averageRating: 4.8,
    totalFollowers: 0
  });

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [liveCampaign, setLiveCampaign] = useState<LiveCampaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [upcomingCampaigns, setUpcomingCampaigns] = useState<UpcomingCampaign[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  // Fetch creator profile
  useEffect(() => {
    if (user) {
      fetchCreatorProfile();
    }
  }, [user]);

  const fetchCreatorProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCreatorProfile(data);
      setStats(prev => ({
        ...prev,
        averageRating: data.rating || 4.8,
        totalFollowers: data.total_followers || 0
      }));
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to incoming requests/offers
    const requestsSubscription = supabase
      .channel('creator_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `creator_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch business details
          const { data: businessData } = await supabase
            .from("businesses")
            .select("business_name, logo_url")
            .eq("id", payload.new.business_id)
            .single();

          const newRequest: IncomingRequest = {
            id: payload.new.id,
            business_id: payload.new.business_id,
            business: businessData?.business_name || 'Unknown Business',
            name: payload.new.campaign_name,
            type: payload.new.campaign_type,
            streams: payload.new.streams_required || 4,
            price: payload.new.amount,
            daysLeft: calculateDaysLeft(payload.new.expires_at),
            logo: businessData?.logo_url || 'https://via.placeholder.com/100',
            status: 'pending',
            created_at: payload.new.created_at,
            campaign_id: payload.new.campaign_id
          };

          setIncomingRequests(prev => [newRequest, ...prev]);
          setStats(prev => ({ ...prev, requestedCount: prev.requestedCount + 1 }));
          
          toast.success(`New offer from ${newRequest.business}!`, {
            description: `${newRequest.type} · N${newRequest.price}`,
            action: {
              label: 'View',
              onClick: () => setRequestsExpanded(true)
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `creator_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.status === 'accepted') {
            setIncomingRequests(prev => prev.filter(r => r.id !== payload.new.id));
            setStats(prev => ({ 
              ...prev, 
              requestedCount: prev.requestedCount - 1,
              activeCount: prev.activeCount + 1
            }));
            
            toast.success('Offer Accepted! 🎉', {
              description: 'You can now start working on this campaign',
              action: {
                label: 'View',
                onClick: () => navigate('/campaigns')
              }
            });
          }
        }
      )
      .subscribe();

    // Subscribe to campaign creator updates
    const campaignSubscription = supabase
      .channel('creator_campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_creators',
          filter: `creator_id=eq.${user.id}`
        },
        (payload) => {
          refreshLiveCampaign();
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to application updates
    const applicationsSubscription = supabase
      .channel('creator_applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_applications',
          filter: `creator_id=eq.${user.id}`
        },
        () => {
          refreshApplications();
        }
      )
      .subscribe();

    // Initial data fetch
    fetchDashboardData();
    refreshLiveCampaign();
    refreshApplications();

    return () => {
      requestsSubscription.unsubscribe();
      campaignSubscription.unsubscribe();
      applicationsSubscription.unsubscribe();
    };
  }, [user]);

  const calculateDaysLeft = (expiresAt?: string): number => {
    if (!expiresAt) return 7;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch earnings data
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (earningsData) {
        setStats(prev => ({
          ...prev,
          totalEarned: earningsData.total || 0,
          pendingEarnings: earningsData.pending || 0,
          paidOut: earningsData.paid_out || 0
        }));
      }

      // Fetch counts
      const { count: requestedCount } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'pending');

      const { count: activeCount } = await supabase
        .from('campaign_creators')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'active');

      const { count: completedCount } = await supabase
        .from('campaign_creators')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'completed');

      setStats(prev => ({
        ...prev,
        requestedCount: requestedCount || 0,
        activeCount: activeCount || 0,
        completedCount: completedCount || 0
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveCampaign = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('campaign_creators')
      .select(`
        id,
        streams_completed,
        streams_target,
        status,
        campaign:campaigns (
          id,
          name,
          business:businesses (
            id,
            business_name,
            logo_url
          )
        )
      `)
      .eq('creator_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      const progress = (data.streams_completed / data.streams_target) * 100;
      const earningsPerStream = 15; // This should come from campaign data
      
      setLiveCampaign({
        id: data.id,
        campaign_id: data.campaign.id,
        business_id: data.campaign.business.id,
        business: data.campaign.business.business_name,
        name: data.campaign.name,
        logo: data.campaign.business.logo_url || 'https://via.placeholder.com/100',
        sessionEarnings: data.streams_completed * earningsPerStream,
        streamTime: formatStreamTime(data.streams_completed),
        progress: progress,
        remainingMins: calculateRemainingMins(data.streams_completed, data.streams_target),
        streams_completed: data.streams_completed,
        streams_target: data.streams_target
      });
    } else {
      setLiveCampaign(null);
    }
  };

  const formatStreamTime = (completed: number): string => {
    const totalMins = completed * 45;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateRemainingMins = (completed: number, target: number): number => {
    const remainingStreams = target - completed;
    return remainingStreams * 45;
  };

  const refreshApplications = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('campaign_applications')
      .select(`
        id,
        status,
        proposed_amount,
        created_at,
        campaign:campaigns (
          id,
          name,
          type,
          business:businesses (
            id,
            business_name,
            logo_url
          )
        )
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedApps = data.map(app => ({
        id: app.id,
        business_id: app.campaign.business.id,
        business: app.campaign.business.business_name,
        logo: app.campaign.business.logo_url || 'https://via.placeholder.com/100',
        type: app.campaign.type,
        amount: app.proposed_amount,
        status: app.status,
        appliedAt: formatDate(app.created_at),
        campaign_id: app.campaign.id
      }));
      setApplications(formattedApps);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      refreshLiveCampaign(),
      refreshApplications(),
      fetchCreatorProfile()
    ]);
    setRefreshing(false);
    toast.success('Dashboard updated');
  };

  const handleDeclineClick = (req: IncomingRequest) => {
    setSelectedRequest(req);
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = async (reason: string) => {
    if (!selectedRequest || !user) return;
    
    try {
      const { error } = await supabase
        .from('offers')
        .update({ 
          status: 'declined',
          declined_reason: reason,
          declined_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      setIsDeclineModalOpen(false);
      toast.success(`Offer declined`);
      
      setIncomingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setStats(prev => ({ ...prev, requestedCount: prev.requestedCount - 1 }));
      setSelectedRequest(null);
      
    } catch (error) {
      toast.error('Failed to decline offer');
    }
  };

  const handleAcceptOffer = async (req: IncomingRequest) => {
    if (!user) return;
    
    try {
      // Update offer status
      const { error: offerError } = await supabase
        .from('offers')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', req.id);

      if (offerError) throw offerError;

      // Create campaign creator entry
      const { error: creatorError } = await supabase
        .from('campaign_creators')
        .insert({
          campaign_id: req.campaign_id,
          creator_id: user.id,
          business_id: req.business_id,
          status: 'active',
          streams_completed: 0,
          streams_target: req.streams,
          accepted_at: new Date().toISOString()
        });

      if (creatorError) throw creatorError;

      toast.success('Offer accepted!');
      
      setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
      setStats(prev => ({ 
        ...prev, 
        requestedCount: prev.requestedCount - 1,
        activeCount: prev.activeCount + 1
      }));
      
      navigate(`/gig-accepted/${req.campaign_id}`);
      
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept offer');
    }
  };

  const earningsRatio = stats.totalEarned > 0 
    ? (stats.paidOut / stats.totalEarned) * 100 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showLogo subtitle="Creator Hub" userType="creator" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px]">
      <AppHeader 
        showLogo 
        subtitle="Creator Hub" 
        userType="creator"
        showHome={false}
      />
      <Toaster position="top-center" richColors />
      
      <main className="max-w-[480px] mx-auto w-full">
        {/* Welcome Section */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">
              Welcome back,
            </h1>
            <p className="text-sm text-gray-500">{creatorProfile?.full_name || 'Creator'}!</p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-2">
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Star className="w-4 h-4 text-[#FEDB71] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.averageRating}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Rating</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Users className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.totalFollowers.toLocaleString()}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Followers</p>
          </div>
          <div className="bg-[#F8F8F8] p-3 rounded-xl text-center">
            <Award className="w-4 h-4 text-[#389C9A] mx-auto mb-1" />
            <p className="text-sm font-black">{stats.completedCount}</p>
            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Completed</p>
          </div>
        </div>

        {/* Section 1 — Earnings Card */}
        <div className="p-6" ref={earningsRef}>
          <div className="bg-[#1D1D1D] p-8 text-white relative overflow-hidden border-2 border-[#1D1D1D] rounded-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
            
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Total Earnings</span>
              <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white/40" />
              </button>
            </div>
            
            <h2 className="text-4xl font-black tracking-tighter leading-none mb-8 text-center italic relative z-10">
              N{stats.totalEarned.toFixed(2)}
            </h2>
            
            <div className="h-[1px] bg-white/10 mb-8 relative z-10" />
            
            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pending</span>
                <span className="text-xl font-black text-[#FEDB71]">N{stats.pendingEarnings.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Paid Out</span>
                <span className="text-xl font-black text-[#389C9A]">N{stats.paidOut.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#389C9A] rounded-full transition-all duration-1000" 
                  style={{ width: `${earningsRatio}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                {Math.round(earningsRatio)}% of earnings paid out
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 — Primary CTA Button */}
        <div className="px-6 pb-6">
          <Link 
            to="/browse-businesses" 
            className="w-full bg-[#1D1D1D] text-white py-8 px-8 text-xl font-black uppercase italic tracking-tighter flex items-center justify-between hover:bg-[#389C9A] transition-all rounded-xl"
          >
            Browse Opportunities
            <ArrowUpRight className="w-6 h-6 text-[#FEDB71]" />
          </Link>
        </div>

        {/* Section 3 — Campaign Status Row */}
        <div className="px-6 pb-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Inbox, count: stats.requestedCount, label: "Requests", path: "/offers", color: "text-[#389C9A]" },
              { icon: Clock, count: stats.activeCount, label: "Active", path: "/campaigns?status=active", color: "text-[#FEDB71]" },
              { icon: CheckCircle2, count: stats.completedCount, label: "Completed", path: "/campaigns?status=completed", color: "text-green-500" },
            ].map((card, i) => (
              <button 
                key={i} 
                onClick={() => navigate(card.path)}
                className="bg-white border-2 border-[#1D1D1D] p-4 flex flex-col items-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-all cursor-pointer rounded-xl group"
              >
                <card.icon className={`w-5 h-5 ${card.color} group-hover:text-white`} />
                <span className="text-xl font-black italic">{card.count}</span>
                <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight opacity-40 group-hover:opacity-100">
                  {card.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4 — Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">Incoming Requests</h3>
              <span className="bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black uppercase px-3 py-1 tracking-widest italic rounded-full">
                {incomingRequests.length} new
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {(requestsExpanded ? incomingRequests : incomingRequests.slice(0, 2)).map(req => (
                  <motion.div 
                    layout
                    key={req.id} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-6 rounded-xl hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 rounded-xl overflow-hidden">
                          <ImageWithFallback 
                            src={req.logo} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                          />
                        </div>
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-1">{req.business}</h4>
                          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{req.type}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-2xl font-black italic leading-none mb-2 text-[#389C9A]">N{req.price}</p>
                        <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5 ${
                          req.daysLeft <= 1 ? "bg-red-100 text-red-600" : 
                          req.daysLeft <= 2 ? "bg-orange-100 text-orange-600" : "bg-[#FEDB71]/10 text-[#FEDB71]"
                        }`}>
                          <Clock className="w-2.5 h-2.5" /> {req.daysLeft} days left
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[9px] font-medium text-[#1D1D1D]/60 italic">
                      {req.name} — {req.streams} streams required
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleAcceptOffer(req)}
                        className="bg-[#1D1D1D] text-white py-4 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#389C9A] transition-all rounded-xl"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button 
                        onClick={() => handleDeclineClick(req)}
                        className="border-2 py-4 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-xl"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {incomingRequests.length > 2 && (
                <button 
                  onClick={() => setRequestsExpanded(!requestsExpanded)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
                >
                  {requestsExpanded ? (
                    <>Show less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show {incomingRequests.length - 2} more requests <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 5 — Live Now */}
        <div className="px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">Live Now</h3>
            {liveCampaign && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#1D1D1D]">
                <span className="w-1.5 h-1.5 bg-[#389C9A] rounded-full animate-pulse" />
                Active
              </div>
            )}
          </div>
          
          {liveCampaign ? (
            <div className="bg-[#1D1D1D] p-6 flex flex-col gap-6 relative overflow-hidden border-2 border-[#1D1D1D] rounded-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 border-2 border-white/20 rounded-xl overflow-hidden">
                  <ImageWithFallback 
                    src={liveCampaign.logo} 
                    className="w-full h-full object-cover grayscale" 
                  />
                </div>
                <div className="flex-1 text-white">
                  <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-1">{liveCampaign.business}</h4>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{liveCampaign.name}</p>
                </div>
                <div className="text-right text-white">
                  <p className="text-xl font-black italic leading-none mb-1 text-[#FEDB71]">N{liveCampaign.sessionEarnings}</p>
                  <p className="text-[9px] font-black text-[#389C9A] uppercase tracking-widest italic">{liveCampaign.streamTime}</p>
                </div>
              </div>
              
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/40">
                  <span>Progress</span>
                  <span>{liveCampaign.streams_completed}/{liveCampaign.streams_target}</span>
                </div>
                <div className="h-1.5 bg-white/10 w-full rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#389C9A] rounded-full" 
                    style={{ width: `${liveCampaign.progress}%` }}
                  />
                </div>
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                  {liveCampaign.remainingMins} mins to qualify for next payment
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end relative z-10">
                <Link 
                  to={`/campaign/live-update/${liveCampaign.campaign_id}`} 
                  className="text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-2 group hover:text-[#FEDB71] transition-all"
                >
                  Update Campaign <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#1D1D1D] p-12 text-center rounded-xl">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-xs text-[#1D1D1D]/40 mb-4">No active campaign right now</p>
              <Link to="/browse-businesses" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                Find Opportunities →
              </Link>
            </div>
          )}
        </div>

        {/* Section 6 — My Applications */}
        {applications.length > 0 && (
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40">My Applications</h3>
              <span className="text-[9px] font-black uppercase text-[#1D1D1D]/40">{applications.length} total</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {(applicationsExpanded ? applications : applications.slice(0, 3)).map(app => (
                <div 
                  key={app.id} 
                  onClick={() => navigate(`/campaign/${app.campaign_id}`)}
                  className="bg-white border-2 border-[#1D1D1D] p-4 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-[#1D1D1D]/10 rounded-lg overflow-hidden">
                      <ImageWithFallback src={app.logo} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight mb-1">{app.business}</h4>
                      <span className="text-[7px] font-black uppercase tracking-widest bg-[#1D1D1D]/5 px-2 py-0.5 rounded-full">
                        {app.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {app.amount && <p className="text-sm font-black italic mb-1 text-[#389C9A]">N{app.amount}</p>}
                    <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      app.status === "Awaiting Response" ? "bg-[#FEDB71] text-[#1D1D1D]" :
                      app.status === "Under Review" ? "bg-blue-500 text-white" :
                      app.status === "Accepted" ? "bg-[#389C9A] text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {app.status}
                    </div>
                    <p className="text-[6px] font-medium text-[#1D1D1D]/20 uppercase tracking-widest mt-1">
                      {app.appliedAt}
                    </p>
                  </div>
                </div>
              ))}

              {applications.length > 3 && (
                <button 
                  onClick={() => setApplicationsExpanded(!applicationsExpanded)}
                  className="w-full py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#1D1D1D]/30 hover:text-[#1D1D1D] transition-colors"
                >
                  {applicationsExpanded ? (
                    <>Show less <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Show {applications.length - 3} more applications <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 7 — Upcoming Campaigns */}
        {upcomingCampaigns.length > 0 && (
          <div className="px-6 pb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-6">Coming Up</h3>
            <div className="flex flex-col gap-3">
              {upcomingCampaigns.map(camp => (
                <div 
                  key={camp.id} 
                  onClick={() => navigate(`/creator/upcoming-gig/${camp.id}`)}
                  className="bg-white border-2 border-[#1D1D1D] p-4 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#1D1D1D]/10 rounded-lg overflow-hidden">
                      <ImageWithFallback src={camp.logo} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight">{camp.business}</h4>
                      <p className="text-[7px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                        {new Date(camp.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1">{camp.package}</p>
                    <span className="text-[7px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                      View Details
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 8 — Quick Actions Row */}
        <div className="px-6 pb-24">
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => navigate("/campaigns")}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <List className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">My Campaigns</span>
            </button>
            
            <button 
              onClick={() => earningsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <Wallet className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">Earnings</span>
            </button>
            
            <button 
              onClick={() => navigate("/profile/1")}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col items-center gap-3 hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl"
            >
              <div className="p-3 bg-[#F8F8F8] rounded-xl group-hover:bg-white/20">
                <User className="w-5 h-5 text-[#389C9A] group-hover:text-white" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">My Profile</span>
            </button>
          </div>
        </div>
      </main>
      
      <BottomNav />

      <DeclineOfferModal 
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleConfirmDecline}
        offerDetails={selectedRequest ? {
          partnerName: selectedRequest.business,
          offerName: selectedRequest.name,
          campaignType: selectedRequest.type,
          amount: `N${selectedRequest.price}`,
          logo: selectedRequest.logo,
          partnerType: "Business"
        } : {
          partnerName: "",
          offerName: "",
          campaignType: "",
          amount: "",
          logo: "",
          partnerType: ""
        }}
      />
    </div>
  );
}