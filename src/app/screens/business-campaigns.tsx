import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Users,
  DollarSign,
  BarChart2,
  Calendar,
  Loader2,
  Eye,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  title?: string;
  type: string;
  status: string;
  budget?: number;
  pay_rate?: number;
  bid_amount?: number;
  created_at: string;
  published_at?: string;
  completed_at?: string;
  creator_count?: number;
  streams_completed?: number;
  streams_target?: number;
}

export function BusinessCampaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending_review" | "completed" | "rejected">("all");
  const [businessId, setBusinessId] = useState<string | null>(null);

  // ── Fetch business ID then campaigns ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        const { data: biz, error: bizError } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (bizError || !biz) {
          toast.error("Business profile not found");
          return;
        }

        setBusinessId(biz.id);
        await fetchCampaigns(biz.id);
      } catch (err) {
        console.error("Init error:", err);
      }
    };

    init();
  }, [user]);

  const fetchCampaigns = async (bizId: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from("campaigns")
        .select(`
          id,
          name,
          title,
          type,
          status,
          budget,
          pay_rate,
          bid_amount,
          created_at,
          published_at,
          completed_at
        `)
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch creator counts per campaign
      const enriched = await Promise.all(
        (data || []).map(async (camp) => {
          const { count: creatorCount } = await supabase
            .from("campaign_creators")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", camp.id);

          const { data: streamData } = await supabase
            .from("campaign_creators")
            .select("streams_completed, streams_target")
            .eq("campaign_id", camp.id);

          const streamsCompleted = (streamData || []).reduce((s, r) => s + (r.streams_completed || 0), 0);
          const streamsTarget    = (streamData || []).reduce((s, r) => s + (r.streams_target || 0), 0);

          return {
            ...camp,
            creator_count:     creatorCount || 0,
            streams_completed: streamsCompleted,
            streams_target:    streamsTarget,
          };
        })
      );

      setCampaigns(enriched);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filter or search changes
  useEffect(() => {
    if (businessId) fetchCampaigns(businessId);
  }, [filter, searchTerm, businessId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getCampaignName = (c: Campaign) => c.name || c.title || "Untitled Campaign";

  const getPrice = (c: Campaign) =>
    c.pay_rate ?? c.bid_amount ?? c.budget ?? 0;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Active", bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" /> };
      case "pending_review":
        return { label: "Under Review", bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-3 h-3" /> };
      case "completed":
        return { label: "Completed", bg: "bg-blue-100", text: "text-blue-700", icon: <TrendingUp className="w-3 h-3" /> };
      case "rejected":
        return { label: "Rejected", bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" /> };
      case "draft":
        return { label: "Draft", bg: "bg-gray-100", text: "text-gray-600", icon: <AlertCircle className="w-3 h-3" /> };
      default:
        return { label: status, bg: "bg-gray-100", text: "text-gray-600", icon: <AlertCircle className="w-3 h-3" /> };
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const filteredCampaigns = campaigns.filter((c) => {
    const name = getCampaignName(c).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const stats = {
    total:     campaigns.length,
    active:    campaigns.filter(c => c.status === "active").length,
    pending:   campaigns.filter(c => c.status === "pending_review").length,
    completed: campaigns.filter(c => c.status === "completed").length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-24">
      <AppHeader showLogo userType="business" subtitle="Business" />

      <div className="max-w-[480px] mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">My Campaigns</h1>
            <p className="text-[9px] opacity-40 uppercase tracking-widest mt-0.5">{stats.total} total campaigns</p>
          </div>
          <button
            onClick={() => navigate("/campaign/type")}
            className="flex items-center gap-2 bg-[#1D1D1D] text-white px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total",     value: stats.total,     color: "border-[#1D1D1D]" },
            { label: "Active",    value: stats.active,    color: "border-green-400" },
            { label: "Pending",   value: stats.pending,   color: "border-yellow-400" },
            { label: "Done",      value: stats.completed, color: "border-blue-400" },
          ].map((s, i) => (
            <div key={i} className={`bg-white border-2 ${s.color} rounded-xl p-3 text-center`}>
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none rounded-xl text-sm transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "active", "pending_review", "completed", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-[#1D1D1D] text-white"
                  : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/50 hover:text-[#1D1D1D]"
              }`}
            >
              {tab === "all" ? "All" : tab.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#1D1D1D]/10 rounded-xl p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-black uppercase text-sm mb-1">No campaigns yet</p>
            <p className="text-[9px] text-gray-400 mb-6">Create your first campaign to start working with creators</p>
            <button
              onClick={() => navigate("/campaign/type")}
              className="bg-[#1D1D1D] text-white px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCampaigns.map((camp, i) => {
              const statusConfig = getStatusConfig(camp.status);
              const price        = getPrice(camp);
              const progress     = camp.streams_target
                ? Math.min(100, Math.round((camp.streams_completed! / camp.streams_target) * 100))
                : 0;

              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/business/campaign/overview/${camp.id}`)}
                  className="bg-white border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] rounded-xl p-4 cursor-pointer transition-all active:scale-[0.99]"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-black text-sm uppercase tracking-tight truncate">
                        {getCampaignName(camp)}
                      </h3>
                      <p className="text-[9px] text-gray-400 mt-0.5 capitalize">
                        {camp.type?.replace(/_/g, " ") || "Standard"}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-full whitespace-nowrap ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <DollarSign className="w-3 h-3 text-[#389C9A]" />
                      </div>
                      <p className="text-xs font-black text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                      <p className="text-[6px] uppercase tracking-widest opacity-40">Budget</p>
                    </div>
                    <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Users className="w-3 h-3 text-blue-500" />
                      </div>
                      <p className="text-xs font-black">{camp.creator_count}</p>
                      <p className="text-[6px] uppercase tracking-widest opacity-40">Creators</p>
                    </div>
                    <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Zap className="w-3 h-3 text-[#FEDB71]" />
                      </div>
                      <p className="text-xs font-black">{camp.streams_completed}/{camp.streams_target || 0}</p>
                      <p className="text-[6px] uppercase tracking-widest opacity-40">Streams</p>
                    </div>
                  </div>

                  {/* Progress bar — only for active campaigns */}
                  {camp.status === "active" && camp.streams_target! > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#389C9A] rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1D1D1D]/5">
                    <div className="flex items-center gap-1 text-[8px] text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(camp.created_at)}</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1">
                      View Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
