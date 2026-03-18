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
  RefreshCw,
  ChevronRight,
  Users,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
// ─────────────────────────────────────────────
// INTERFACES  (aligned with schema)
// ─────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget?: number;
  bid_amount?: number;
  pay_rate?: number;
  campaign_creators: CampaignCreator[];
  created_at: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface CampaignCreator {
  id: string;
  status: string;
  creator_id: string | null;
  user_id: string | null;
  streams_completed: number;
  streams_target: number;
}

/**
 * "Offers" do not exist as a standalone table in the schema.
 * We model them as campaign_creators rows that are still 'pending',
 * joined with the creator_profiles and campaigns data.
 */
interface PendingCreator {
  id: string;                 // campaign_creators.id
  status: string;
  created_at: string;
  streams_target: number;
  // joined
  creator_profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    payout_email: string | null;
    avg_viewers: number;
    niche: string[] | null;
  } | null;
  campaigns: {
    id: string;
    name: string;
    type: string;
    budget: number | null;
  } | null;
}

interface BusinessProfile {
  id: string;
  business_name: string | null;   // ✅ was company_name
  logo_url: string | null;
  contact_email: string | null;   // ✅ was email
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function BusinessDashboard() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingCreators, setPendingCreators] = useState<PendingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<"LIVE" | "PENDING" | "COMPLETED">("LIVE");
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // ─── 1. AUTH + BUSINESS PROFILE ───────────────────────────────────────────

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
 
        if (userError) throw userError;
        if (!user) {
          toast.error("Please log in to access your dashboard");
          navigate("/login/portal", { replace: true });
          return;
        }
 
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id, business_name, logo_url, contact_email, application_status, status")
          .eq("user_id", user.id)
          .single();
 
        if (businessError) {
          if (businessError.code === "PGRST116") {
            // No profile found — send back to registration (not yet complete)
            navigate("/become-business", { replace: true });
            return;
          }
          throw businessError;
        }
 
        if (business.status === "deleted") {
          await supabase.auth.signOut();
          navigate("/login/portal", { replace: true });
          return;
        }
 
        setBusinessId(business.id);
        setBusinessProfile(business as BusinessProfile);
      } catch (error) {
        console.error("Error fetching business:", error);
        toast.error("Failed to load business profile");
      }
    };
 
    fetchBusiness();
  }, [navigate]);
  
  // ─── 2. FETCH DASHBOARD DATA ──────────────────────────────────────────────

  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchCampaigns(), fetchPendingCreators()]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime: campaign_creators (pending invites / offers)
    const creatorsSubscription = supabase
      .channel("pending_creators_channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_creators",
        },
        () => fetchPendingCreators()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_creators",
        },
        () => fetchPendingCreators()
      )
      .subscribe();

    // Realtime: campaigns
    const campaignsSubscription = supabase
      .channel("campaigns_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
          filter: `business_id=eq.${businessId}`,
        },
        () => fetchCampaigns()
      )
      .subscribe();

    return () => {
      creatorsSubscription.unsubscribe();
      campaignsSubscription.unsubscribe();
    };
  }, [businessId]);

  // ─── FETCH HELPERS ────────────────────────────────────────────────────────

  const fetchCampaigns = async () => {
    if (!businessId) return;

    const { data, error } = await supabase
      .from("campaigns")
      .select(
        `
        id, name, type, status, budget, bid_amount, pay_rate,
        created_at, start_date, end_date, description,
        campaign_creators (
          id, status, creator_id, user_id,
          streams_completed, streams_target
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setCampaigns((data as Campaign[]) || []);
  };

  /**
   * Pending creators = campaign_creators rows with status 'pending' or 'PENDING'
   * that belong to campaigns owned by this business.
   * ✅ Uses creator_profiles (not "creators"), full_name (not "name"),
   *    avatar_url (not "avatar"), avg_viewers (not "followers_count")
   */
  const fetchPendingCreators = async () => {
    if (!businessId) return;

    const { data, error } = await supabase
      .from("campaign_creators")
      .select(
        `
        id, status, created_at, streams_target,
        creator_profiles (
          id, full_name, avatar_url, payout_email, avg_viewers, niche
        ),
        campaigns (
          id, name, type, budget
        )
      `
      )
      .in("status", ["pending", "PENDING"])
      // Filter to only this business's campaigns via the campaigns join
      .filter("campaigns.business_id", "eq", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending creators:", error);
      return;
    }

    // Extra safety: filter out rows where the campaign doesn't belong to this business
    // (Supabase .filter on joined tables sometimes returns nulls instead of excluding rows)
    const filtered = (data || []).filter(
      (row: any) => row.campaigns !== null
    ) as PendingCreator[];

    setPendingCreators(filtered);
  };

  // ─── 3. REFRESH ───────────────────────────────────────────────────────────

  const refreshData = async () => {
    if (!businessId) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchCampaigns(), fetchPendingCreators()]);
      toast.success("Dashboard updated");
    } catch {
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // ─── 4. STATS ─────────────────────────────────────────────────────────────

  const activeCampaigns = campaigns.filter((c) =>
    ["active", "ACTIVE", "live", "LIVE", "open", "OPEN"].includes(c.status)
  ).length;

  const pendingCampaigns = campaigns.filter((c) =>
    ["pending_review", "PENDING_REVIEW", "draft", "DRAFT", "pending", "PENDING", "review", "REVIEW"].includes(c.status)
  ).length;

  const completedCampaigns = campaigns.filter((c) =>
    ["completed", "COMPLETED"].includes(c.status)
  ).length;

  const totalCreators = campaigns.reduce(
    (sum, c) => sum + (c.campaign_creators?.length || 0),
    0
  );

  // Use budget, fallback to bid_amount or pay_rate
  const totalSpent = campaigns.reduce((sum, c) => {
    const val = c.budget ?? c.bid_amount ?? c.pay_rate ?? 0;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalPending = pendingCreators.length;

  const stats = [
    {
      label: "Active Campaigns",
      value: activeCampaigns,
      sub: `${totalCreators} creators working`,
      icon: TrendingUp,
      color: "text-[#389C9A]",
    },
    {
      label: "Pending",
      value: pendingCampaigns,
      sub: `${totalPending} creators waiting`,
      icon: Clock,
      color: "text-[#FEDB71]",
    },
    {
      label: "Completed",
      value: completedCampaigns,
      sub: "Campaigns finished",
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      label: "Total Spent",
      value: `₦${totalSpent.toLocaleString()}`,
      sub: `Across ${campaigns.length} campaigns`,
      icon: DollarSign,
      color: "text-[#389C9A]",
    },
  ];

  // ─── 5. ACCEPT / REJECT CREATOR ──────────────────────────────────────────

  const acceptCreator = async (row: PendingCreator) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({
          status: "ACTIVE",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) throw error;

      const name = row.creator_profiles?.full_name || "Creator";
      toast.success(`${name} accepted into campaign 🎉`);
      setPendingCreators((prev) => prev.filter((r) => r.id !== row.id));
      fetchCampaigns(); // refresh creator counts
    } catch (error) {
      console.error("Error accepting creator:", error);
      toast.error("Failed to accept creator");
    }
  };

  const declineCreator = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ status: "DECLINED" })
        .eq("id", rowId);

      if (error) throw error;

      toast.success("Creator declined");
      setPendingCreators((prev) => prev.filter((r) => r.id !== rowId));
    } catch (error) {
      console.error("Error declining creator:", error);
      toast.error("Failed to decline creator");
    }
  };

  // ─── 6. FILTER CAMPAIGNS ─────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter((c) => {
    const s = c.status?.toLowerCase();
    if (campaignFilter === "LIVE")
      return ["active", "live", "open"].includes(s);
    if (campaignFilter === "PENDING")
      return ["pending_review", "pending", "draft", "review"].includes(s);
    if (campaignFilter === "COMPLETED")
      return s === "completed";
    return false;
  });

  const countFor = (tab: "LIVE" | "PENDING" | "COMPLETED") =>
    campaigns.filter((c) => {
      const s = c.status?.toLowerCase();
      if (tab === "LIVE") return ["active", "live", "open"].includes(s);
      if (tab === "PENDING") return ["pending_review", "pending", "draft", "review"].includes(s);
      return s === "completed";
    }).length;

  // ─── LOADING STATE ────────────────────────────────────────────────────────

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

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white pb-20">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="business" subtitle="Business Hub" />

      {/* Welcome Header */}
      <div className="px-8 py-6 bg-gradient-to-r from-[#1D1D1D] to-gray-800 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              {/* ✅ business_name not company_name */}
              Welcome back, {businessProfile?.business_name || "Business"}!
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-3 border-2 border-white/30 hover:border-white text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="border-2 border-[#1D1D1D] p-6 bg-white hover:shadow-lg transition-shadow"
            >
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

      {/* Toggle: Campaigns / Pending Creators */}
      <div className="px-8 flex gap-4 mb-4">
        <button
          onClick={() => setShowPendingOnly(false)}
          className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors ${
            !showPendingOnly
              ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
              : "text-gray-400"
          }`}
        >
          Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setShowPendingOnly(true)}
          className={`px-4 py-2 text-sm font-black uppercase tracking-widest transition-colors relative ${
            showPendingOnly
              ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
              : "text-gray-400"
          }`}
        >
          Pending Creators ({pendingCreators.length})
          {pendingCreators.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] text-xs flex items-center justify-center font-black">
              {pendingCreators.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Campaigns ── */}
      {!showPendingOnly ? (
        <div className="px-8 mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight italic">
              My Campaigns
            </h2>
            <button
              onClick={() => navigate("/campaign/type")}
              className="bg-[#1D1D1D] text-white px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-opacity-80 transition-colors"
            >
              + New Campaign
            </button>
          </div>

          {/* Campaign Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {(["LIVE", "PENDING", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCampaignFilter(tab)}
                className={`px-6 py-3 text-sm font-black uppercase tracking-widest italic transition-colors ${
                  campaignFilter === tab
                    ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                    : "text-gray-400 hover:text-[#1D1D1D]"
                }`}
              >
                {tab} ({countFor(tab)})
              </button>
            ))}
          </div>

          {/* Campaign List */}
          {filteredCampaigns.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-400 mb-4">No campaigns in this category</p>
              <button
                onClick={() => navigate("/campaign/type")}
                className="text-[#389C9A] font-black uppercase text-sm hover:underline"
              >
                Create your first campaign →
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map((campaign) => (
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
                          {/* ✅ Correct budget fields */}
                          {campaign.budget ?? campaign.bid_amount ?? campaign.pay_rate ?? "Negotiable"}
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
        /* ── Pending Creators ── */
        <div className="px-8 mt-4">
          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6">
            Pending Creators ({pendingCreators.length})
          </h2>

          {pendingCreators.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-400">No pending creator requests</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingCreators.map((row) => {
                // ✅ full_name not name, avatar_url not avatar, avg_viewers not followers_count
                const creator = row.creator_profiles;
                const displayName = creator?.full_name || "Unknown Creator";
                const initial = displayName[0]?.toUpperCase() ?? "?";

                return (
                  <div
                    key={row.id}
                    className="border-2 border-[#FEDB71] p-6 bg-yellow-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          {creator?.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-full border-2 border-[#1D1D1D] object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[#389C9A] flex items-center justify-center text-white font-black">
                              {initial}
                            </div>
                          )}
                          <div>
                            <h3 className="font-black">{displayName}</h3>
                            {/* ✅ avg_viewers instead of followers_count */}
                            <p className="text-xs opacity-60">
                              ~{creator?.avg_viewers?.toLocaleString() ?? 0} avg viewers
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-lg">
                          {row.campaigns?.name ?? "Unknown Campaign"}
                        </p>
                        <p className="text-sm mt-1">
                          Type: {row.campaigns?.type ?? "—"}
                        </p>
                        {creator?.niche && creator.niche.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {creator.niche.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-white border border-gray-200 px-2 py-0.5"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptCreator(row);
                          }}
                          className="bg-[#1D1D1D] text-white px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-opacity-80 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            declineCreator(row.id);
                          }}
                          className="border-2 border-[#1D1D1D] px-6 py-3 text-sm font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            onClick={() => navigate("/browse-creators")}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <Users className="w-6 h-6 mb-3 text-[#389C9A] group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">Find Creators</h3>
            <p className="text-xs opacity-60 mb-4">Discover creators for your campaigns</p>
            <span className="text-[#389C9A] text-xs group-hover:text-white">Browse →</span>
          </button>

          <button
            onClick={() => navigate("/business/settings")}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <Filter className="w-6 h-6 mb-3 text-[#FEDB71] group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">Business Settings</h3>
            <p className="text-xs opacity-60 mb-4">Update your profile and preferences</p>
            <span className="text-[#FEDB71] text-xs group-hover:text-white">Settings →</span>
          </button>

          <button
            onClick={() => navigate("/business/analytics")}
            className="border-2 border-[#1D1D1D] p-6 text-left hover:bg-[#1D1D1D] hover:text-white transition-colors group"
          >
            <TrendingUp className="w-6 h-6 mb-3 text-green-500 group-hover:text-white" />
            <h3 className="font-black text-sm mb-2 italic">View Analytics</h3>
            <p className="text-xs opacity-60 mb-4">Check your campaign performance</p>
            <span className="text-green-500 text-xs group-hover:text-white">Analytics →</span>
          </button>

          <button
            onClick={() => navigate("/business/reports")}
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
