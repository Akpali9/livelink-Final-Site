import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
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
  status: string;
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
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [stats, setStats] = useState<CampaignStats>({
    total_applications: 0,
    accepted_creators: 0,
    total_spent: 0,
    active_campaigns: 0,
  });
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchBusinessProfile();
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
    } catch (e) {
      console.error(e);
      toast.error("Failed to load business profile");
    }
  };

  const fetchCampaigns = async (bizId: string) => {
    if (!bizId) return;
    try {
      setLoading(true);
      const { data: campaignsData, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (campaignsData && campaignsData.length > 0) {
        const withStats = await Promise.all(
          campaignsData.map(async (c) => {
            const { count: appCount } = await supabase
              .from("campaign_creators")
              .select("*", { count: "exact", head: true })
              .eq("campaign_id", c.id);
            const { count: accCount } = await supabase
              .from("campaign_creators")
              .select("*", { count: "exact", head: true })
              .eq("campaign_id", c.id)
              .eq("status", "active");
            return { ...c, applications_count: appCount || 0, accepted_creators: accCount || 0 };
          })
        );
        setCampaigns(withStats);
        setStats({
          total_applications: withStats.reduce((s, c) => s + (c.applications_count || 0), 0),
          accepted_creators:  withStats.reduce((s, c) => s + (c.accepted_creators || 0), 0),
          total_spent:        withStats.filter(c => c.status === "completed").reduce((s, c) => s + (c.budget || 0), 0),
          active_campaigns:   withStats.filter(c => c.status === "active").length,
        });
      } else {
        setCampaigns([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!businessId) return;
    setRefreshing(true);
    await fetchCampaigns(businessId);
    setRefreshing(false);
    toast.success("Campaigns updated");
  };

  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this campaign? Cannot be undone.")) return;
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campaign deleted");
    } catch (e) {
      toast.error("Failed to delete campaign");
    }
  };

  const handleDuplicateCampaign = async (camp: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          business_id: camp.business_id, name: `${camp.name} (Copy)`,
          type: camp.type, description: camp.description,
          budget: camp.budget, pay_rate: camp.pay_rate,
          start_date: camp.start_date, end_date: camp.end_date,
          target_niches: camp.target_niches, target_locations: camp.target_locations,
          min_followers: camp.min_followers, status: "draft",
          created_at: new Date().toISOString(),
        })
        .select().single();
      if (error) throw error;
      if (businessId) await fetchCampaigns(businessId);
      toast.success("Campaign duplicated");
      navigate(`/business/campaign/edit/${data.id}`);
    } catch (e) {
      toast.error("Failed to duplicate campaign");
    }
  };

  const statusColor = (s: string) => {
    if (s === "active")    return "bg-[#389C9A] text-white border-[#389C9A]";
    if (s === "draft")     return "bg-gray-100 text-gray-600 border-gray-200";
    if (s === "paused")    return "bg-[#FEDB71] text-[#1D1D1D] border-[#FEDB71]";
    if (s === "completed") return "bg-green-500 text-white border-green-500";
    if (s === "cancelled") return "bg-red-500 text-white border-red-500";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const statusIcon = (s: string) => {
    if (s === "active" || s === "completed") return <CheckCircle2 className="w-3 h-3" />;
    if (s === "draft")     return <Edit className="w-3 h-3" />;
    if (s === "paused")    return <Clock className="w-3 h-3" />;
    if (s === "cancelled") return <AlertCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const filters = [
    { value: "all",       label: "All" },
    { value: "active",    label: "Active" },
    { value: "pending_review", label: "Pending" },
    { value: "draft",     label: "Draft" },
    { value: "completed", label: "Done" },
  ];

  const filteredCampaigns = campaigns.filter(c => {
    const matchSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === "all" || c.status === activeFilter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Campaigns" userType="business" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Campaigns" userType="business" />

      <main className="max-w-[480px] mx-auto w-full px-4 pt-4 pb-8">

        {/* ── Compact Stats Row ── */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: Users,      color: "text-[#389C9A]", val: stats.total_applications, label: "Applied" },
            { icon: CheckCircle2, color: "text-green-500", val: stats.accepted_creators, label: "Hired" },
            { icon: TrendingUp, color: "text-[#389C9A]", val: stats.active_campaigns,   label: "Active" },
            { icon: DollarSign, color: "text-[#D2691E]",  val: `₦${(stats.total_spent/1000).toFixed(0)}k`, label: "Spent" },
          ].map((s, i) => (
            <div key={i} className="border-2 border-[#1D1D1D] p-2 text-center">
              <s.icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-1`} />
              <p className="text-base font-black leading-none">{s.val}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Create Button ── */}
        <Link
          to="/business/create-campaign"
          className="flex items-center justify-between w-full bg-[#1D1D1D] text-white px-4 py-3 mb-4 text-[10px] font-black uppercase tracking-widest italic hover:bg-[#389C9A] transition-colors"
        >
          Create New Campaign
          <Plus className="w-4 h-4 text-[#FEDB71]" />
        </Link>

        {/* ── Search + Refresh ── */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] py-2.5 pl-9 pr-3 text-[10px] font-bold uppercase tracking-widest outline-none italic transition-colors"
            />
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Filter Tabs — wrapped, no scroll ── */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest italic border-2 transition-all ${
                activeFilter === f.value
                  ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                  : "bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 opacity-60">
                  ({campaigns.filter(c => c.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Campaign List ── */}
        {filteredCampaigns.length === 0 ? (
          <div className="mt-8 p-8 border-2 border-dashed border-[#1D1D1D]/10 flex flex-col items-center text-center">
            <Megaphone className="w-10 h-10 opacity-20 mb-3 text-[#389C9A]" />
            <p className="text-sm font-medium text-[#1D1D1D]/40 italic mb-3">
              {searchQuery ? "No campaigns match your search" : "No campaigns yet"}
            </p>
            {!searchQuery && (
              <Link to="/business/create-campaign" className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                Create Your First Campaign →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {filteredCampaigns.map((camp) => (
                <motion.div
                  key={camp.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border-2 border-[#1D1D1D] bg-white overflow-hidden"
                >
                  {/* Card Header */}
                  <div className={`px-4 pt-4 pb-3 border-b-2 border-[#1D1D1D] ${camp.status === "active" ? "bg-[#389C9A]/5" : "bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-tight leading-tight truncate">{camp.name}</h3>
                        <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic mt-0.5">
                          {camp.type} · {new Date(camp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`shrink-0 px-2 py-1 text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${statusColor(camp.status)}`}>
                        {statusIcon(camp.status)}
                        {camp.status?.replace("_", " ")}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3 space-y-3">
                    {camp.description && (
                      <p className="text-[11px] text-[#1D1D1D]/50 line-clamp-2">{camp.description}</p>
                    )}

                    {/* Mini Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: DollarSign, color: "text-[#D2691E]", val: `₦${(camp.budget||0).toLocaleString()}`, label: "Budget" },
                        { icon: Users,      color: "text-[#389C9A]", val: camp.applications_count || 0,              label: "Applied" },
                        { icon: CheckCircle2, color: "text-green-500", val: camp.accepted_creators || 0,             label: "Hired" },
                      ].map((s, i) => (
                        <div key={i} className="text-center bg-[#F8F8F8] py-2">
                          <s.icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-1`} />
                          <p className="text-xs font-black">{s.val}</p>
                          <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Dates */}
                    {(camp.start_date || camp.end_date) && (
                      <div className="flex items-center justify-between text-[8px] text-[#1D1D1D]/40 border-t border-[#1D1D1D]/10 pt-2">
                        {camp.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(camp.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {camp.end_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(camp.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Niches */}
                    {camp.target_niches?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {camp.target_niches.slice(0, 3).map(n => (
                          <span key={n} className="px-2 py-0.5 bg-[#F8F8F8] text-[7px] font-black uppercase tracking-widest">{n}</span>
                        ))}
                        {camp.target_niches.length > 3 && (
                          <span className="px-2 py-0.5 bg-[#F8F8F8] text-[7px] font-black uppercase tracking-widest">+{camp.target_niches.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="bg-[#F8F8F8] border-t-2 border-[#1D1D1D] px-3 py-2 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/business/campaign/overview/${camp.id}`)}
                      className="flex-1 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 hover:bg-[#389C9A] transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>

                    {camp.status === "draft" && (
                      <button
                        onClick={() => navigate(`/business/campaign/edit/${camp.id}`)}
                        className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase hover:bg-[#1D1D1D] hover:text-white transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}

                    <div className="relative group/actions">
                      <button className="px-3 py-2 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors">
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      <div className="absolute right-0 bottom-full mb-1 bg-white border-2 border-[#1D1D1D] shadow-xl hidden group-hover/actions:block z-10 min-w-[140px]">
                        <button
                          onClick={e => handleDuplicateCampaign(camp, e)}
                          className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        {!["completed", "cancelled"].includes(camp.status) && (
                          <button
                            onClick={() => navigate(`/business/campaign/edit/${camp.id}`)}
                            className="w-full text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <button
                          onClick={e => handleDeleteCampaign(camp.id, e)}
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
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default BusinessCampaigns;
