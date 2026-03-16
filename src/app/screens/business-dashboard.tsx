import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Users,
  Calendar,
  Filter,
  Download
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  price: string;
  budget?: number;
  campaign_creators: any[];
  created_at: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface Offer {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  message?: string;
  creators: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    followers?: number;
  };
  campaigns: {
    id: string;
    name: string;
    type: string;
    budget?: number;
  };
}

interface BusinessProfile {
  id: string;
  company_name: string;
  logo_url?: string;
  email?: string;
}

export function BusinessDashboard() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<"LIVE" | "PENDING" | "COMPLETED">("LIVE");
  const [showOffersOnly, setShowOffersOnly] = useState(false);

  /* ---------------------------------- */
  /* 1️⃣ GET LOGGED IN BUSINESS ID & PROFILE */
  /* ---------------------------------- */
  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          toast.error("Please log in to access your dashboard");
          navigate("/login/business");
          return;
        }

        // Fetch business profile
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id, company_name, logo_url, email")
          .eq("user_id", user.id)
          .single();

        if (businessError) {
          if (businessError.code === 'PGRST116') {
            toast.error("Please complete your business profile first");
            navigate("/become-business");
            return;
          }
          throw businessError;
        }

        if (business) {
          setBusinessId(business.id);
          setBusinessProfile(business);
        }
      } catch (error) {
        console.error("Error fetching business:", error);
        toast.error("Failed to load business profile");
      }
    };

    fetchBusiness();
  }, [navigate]);

  /* ---------------------------------- */
  /* 2️⃣ FETCH DASHBOARD DATA */
  /* ---------------------------------- */
  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch campaigns with more details
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select(`
            *,
            campaign_creators (
              id,
              status,
              creator_id,
              streams_completed,
              streams_target
            )
          `)
          .eq("business_id", businessId)
          .order('created_at', { ascending: false });

        if (campaignError) throw campaignError;

        // Fetch offers with more details
        const { data: offerData, error: offerError } = await supabase
          .from("offers")
          .select(`
            *,
            creators (
              id,
              name,
              avatar,
              email,
              followers_count
            ),
            campaigns (
              id,
              name,
              type,
              budget
            )
          `)
          .eq("business_id", businessId)
          .in("status", ["Offer Received", "Negotiating", "Pending"])
          .order('created_at', { ascending: false });

        if (offerError) throw offerError;

        setCampaigns(campaignData || []);
        setOffers(offerData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for offers
    const offersSubscription = supabase
      .channel('offers_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          fetchNewOffer(payload.new.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          // Handle offer updates if needed
          console.log("Offer updated:", payload);
        }
      )
      .subscribe();

    // Set up realtime subscription for campaigns
    const campaignsSubscription = supabase
      .channel('campaigns_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          // Refresh campaigns on any change
          refreshData();
        }
      )
      .subscribe();

    return () => {
      offersSubscription.unsubscribe();
      campaignsSubscription.unsubscribe();
    };
  }, [businessId]);

  const fetchNewOffer = async (offerId: string) => {
    const { data, error } = await supabase
      .from("offers")
      .select(`
        *,
        creators (
          id,
          name,
          avatar,
          email,
          followers_count
        ),
        campaigns (
          id,
          name,
          type,
          budget
        )
      `)
      .eq("id", offerId)
      .single();

    if (!error && data) {
      setOffers(prev => [data, ...prev]);
      toast.info(`New offer received from ${data.creators.name}!`, {
        action: {
          label: "View",
          onClick: () => setShowOffersOnly(true)
        }
      });
    }
  };

  const refreshData = async () => {
    if (!businessId) return;
    
    setRefreshing(true);
    try {
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_creators (
            id,
            status,
            creator_id,
            streams_completed,
            streams_target
          )
        `)
        .eq("business_id", businessId)
        .order('created_at', { ascending: false });

      const { data: offerData } = await supabase
        .from("offers")
        .select(`
          *,
          creators (
            id,
            name,
            avatar,
            email,
            followers_count
          ),
          campaigns (
            id,
            name,
            type,
            budget
          )
        `)
        .eq("business_id", businessId)
        .in("status", ["Offer Received", "Negotiating", "Pending"])
        .order('created_at', { ascending: false });

      setCampaigns(campaignData || []);
      setOffers(offerData || []);
      toast.success("Dashboard updated");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------------------------- */
  /* 3️⃣ STATS CALCULATIONS */
  /* ---------------------------------- */
  const activeCampaigns = campaigns.filter(c => 
    ["ACTIVE", "LIVE", "OPEN"].includes(c.status)
  ).length;
  
  const pendingCampaigns = campaigns.filter(c => 
    ["PENDING REVIEW", "DRAFT", "PENDING"].includes(c.status)
  ).length;
  
  const completedCampaigns = campaigns.filter(c => 
    c.status === "COMPLETED"
  ).length;

  const totalCreators = campaigns.reduce((sum, c) => 
    sum + (c.campaign_creators?.length || 0), 0
  );

  const totalSpent = campaigns.reduce((sum, c) => {
    const budget = c.budget || parseInt(c.price?.replace(/[^\d]/g, "") || "0");
    return sum + (isNaN(budget) ? 0 : budget);
  }, 0);

  const totalOffers = offers.length;

  const stats = [
    { 
      label: "Active Campaigns", 
      value: activeCampaigns, 
      sub: `${totalCreators} creators working`,
      icon: TrendingUp,
      color: "text-[#389C9A]"
    },
    { 
      label: "Pending", 
      value: pendingCampaigns, 
      sub: `${totalOffers} offers waiting`,
      icon: Clock,
      color: "text-[#FEDB71]"
    },
    { 
      label: "Completed", 
      value: completedCampaigns, 
      sub: "Campaigns finished",
      icon: CheckCircle,
      color: "text-green-500"
    },
    { 
      label: "Total Spent", 
      value: `₦${totalSpent.toLocaleString()}`, 
      sub: `Across ${campaigns.length} campaigns`,
      icon: DollarSign,
      color: "text-[#389C9A]"
    }
  ];

  /* ---------------------------------- */
  /* 4️⃣ OFFER ACTIONS */
  /* ---------------------------------- */
  const acceptOffer = async (offer: Offer) => {
    try {
      // Update offer status
      const { error: offerError } = await supabase
        .from("offers")
        .update({ 
          status: "Accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      // Check if creator already exists in campaign
      const { data: existing } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", offer.campaigns.id)
        .eq("creator_id", offer.creators.id)
        .maybeSingle();

      if (!existing) {
        // Create campaign creator relationship
        const { error: creatorError } = await supabase
          .from("campaign_creators")
          .insert({
            campaign_id: offer.campaigns.id,
            creator_id: offer.creators.id,
            status: "ACTIVE",
            streams_target: 4,
            streams_completed: 0,
            accepted_at: new Date().toISOString()
          });

        if (creatorError) throw creatorError;
      }

      toast.success(`Offer accepted! ${offer.creators.name} added to campaign 🎉`);
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      
      // Refresh campaigns to show new creator
      refreshData();
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Failed to accept offer");
    }
  };

  const rejectOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from("offers")
        .update({ 
          status: "Rejected",
          rejected_at: new Date().toISOString()
        })
        .eq("id", offerId);

      if (error) throw error;

      toast.success("Offer rejected");
      setOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (error) {
      console.error("Error rejecting offer:", error);
      toast.error("Failed to reject offer");
    }
  };

  const negotiateOffer = async (offerId: string) => {
    // This would open a negotiation modal
    toast.info("Negotiation feature coming soon!");
  };

  /* ---------------------------------- */
  /* FILTER CAMPAIGNS */
  /* ---------------------------------- */
  const filteredCampaigns = campaigns.filter(c => {
    if (campaignFilter === "LIVE")
      return ["ACTIVE", "LIVE", "OPEN"].includes(c.status);
    if (campaignFilter === "PENDING")
      return ["PENDING REVIEW", "DRAFT", "PENDING"].includes(c.status);
    if (campaignFilter === "COMPLETED")
      return c.status === "COMPLETED";
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showLogo userType="business" subtitle="Business Hub" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="business" subtitle="Business Hub" />

      {/* Welcome Header */}
      <div className="px-8 py-6 bg-gradient-to-r from-[#1D1D1D] to-gray-800 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Welcome back, {businessProfile?.company_name || 'Business'}!
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-3 border-2 border-white/30 hover:border-white text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="border-2 border-[#1D1D1D] p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {stat.label}
                </p>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <h2 className="text-3xl font-black mb-2">{stat.value}</h2>
              <p className="text-xs text-gray-500">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Toggle between Campaigns and Offers */}
      <div className="px-8 flex gap-4 mb-4">
        <button
          onClick={() => setShowOffersOnly(false)}
          className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors ${
            !showOffersOnly 
              ? 'border-b-2 border-[#1D1D1D] text-[#1D1D1D]' 
              : 'text-gray-400'
          }`}
        >
          Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setShowOffersOnly(true)}
          className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors relative ${
            showOffersOnly 
              ? 'border-b-2 border-[#1D1D1D] text-[#1D1D1D]' 
              : 'text-gray-400'
          }`}
        >
          Offers ({offers.length})
          {offers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] text-xs flex items-center justify-center font-black">
              {offers.length}
            </span>
          )}
        </button>
      </div>

      {/* Conditional Rendering: Campaigns or Offers */}
      {!showOffersOnly ? (
        /* CAMPAIGNS SECTION */
        <div className="px-8 mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight italic">
              My Campaigns
            </h2>
            <button
              onClick={() => navigate('/campaign/type')}
              className="bg-[#1D1D1D] text-white px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-opacity-80 transition-colors"
            >
              + New Campaign
            </button>
          </div>

          {/* Campaign Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {(["LIVE", "PENDING", "COMPLETED"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCampaignFilter(tab)}
                className={`px-6 py-3 text-sm font-black uppercase tracking-widest italic transition-colors ${
                  campaignFilter === tab
                    ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                    : "text-gray-400 hover:text-[#1D1D1D]"
                }`}
              >
                {tab} ({campaigns.filter(c => 
                  tab === "LIVE" ? ["ACTIVE", "LIVE", "OPEN"].includes(c.status) :
                  tab === "PENDING" ? ["PENDING REVIEW", "DRAFT", "PENDING"].includes(c.status) :
                  c.status === "COMPLETED"
                ).length})
              </button>
            ))}
          </div>

          {/* Campaign List */}
          {filteredCampaigns.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-400 mb-4">No campaigns in this category</p>
              <button
                onClick={() => navigate('/campaign/type')}
                className="text-[#389C9A] font-black uppercase text-sm hover:underline"
              >
                Create your first campaign →
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map(campaign => (
                <div
                  key={campaign.id}
                  onClick={() => navigate(`/business/campaign/${campaign.id}`)}
                  className="border-2 border-[#1D1D1D] p-6 cursor-pointer hover:bg-[#1D1D1D] hover:text-white transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg mb-2">{campaign.name}</h3>
                      <p className="text-sm opacity-60 mb-3">{campaign.type}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {campaign.campaign_creators?.length || 0} creators
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {campaign.budget || campaign.price || "Negotiable"}
                        </span>
                        {campaign.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(campaign.start_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* OFFERS SECTION */
        <div className="px-8 mt-4">
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6">
            Incoming Offers ({offers.length})
          </h2>

          {offers.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-400">No pending offers</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {offers.map(offer => (
                <div key={offer.id} className="border-2 border-[#FEDB71] p-6 bg-yellow-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {offer.creators.avatar ? (
                          <img 
                            src={offer.creators.avatar} 
                            alt={offer.creators.name}
                            className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#389C9A] flex items-center justify-center text-white font-black">
                            {offer.creators.name[0]}
                          </div>
                        )}
                        <div>
                          <h3 className="font-black">{offer.creators.name}</h3>
                          <p className="text-xs opacity-60">
                            {offer.creators.followers?.toLocaleString() || '0'} followers
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-lg">{offer.campaigns.name}</p>
                      <p className="text-sm mt-1">Offer: {offer.amount}</p>
                      {offer.message && (
                        <p className="text-xs mt-2 bg-white p-2 border italic">
                          "{offer.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptOffer(offer);
                        }}
                        className="bg-[#1D1D1D] text-white px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-opacity-80 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          negotiateOffer(offer.id);
                        }}
                        className="border-2 border-[#389C9A] text-[#389C9A] px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-[#389C9A] hover:text-white transition-colors"
                      >
                        Negotiate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectOffer(offer.id);
                        }}
                        className="border-2 border-[#1D1D1D] px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-8 mt-16">
        <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/browse-creators')}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <Users className="w-6 h-6 mb-3 text-[#389C9A] group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">Find Creators</h3>
            <p className="text-xs opacity-60 mb-4">Discover creators for your campaigns</p>
            <span className="text-[#389C9A] text-xs group-hover:text-white">Browse →</span>
          </button>

          <button
            onClick={() => navigate('/business/settings')}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <Filter className="w-6 h-6 mb-3 text-[#FEDB71] group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">Business Settings</h3>
            <p className="text-xs opacity-60 mb-4">Update your profile and preferences</p>
            <span className="text-[#FEDB71] text-xs group-hover:text-white">Settings →</span>
          </button>

          <button
            onClick={() => navigate('/business/analytics')}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <TrendingUp className="w-6 h-6 mb-3 text-green-500 group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">View Analytics</h3>
            <p className="text-xs opacity-60 mb-4">Check your campaign performance</p>
            <span className="text-green-500 text-xs group-hover:text-white">Analytics →</span>
          </button>

          <button
            onClick={() => navigate('/business/reports')}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <Download className="w-6 h-6 mb-3 text-blue-500 group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">Download Reports</h3>
            <p className="text-xs opacity-60 mb-4">Export campaign data and insights</p>
            <span className="text-blue-500 text-xs group-hover:text-white">Export →</span>
          </button>
        </div>
      </div>
    </div>
  );
}