import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Megaphone,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Building2,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  pay_rate: number;
  bid_amount: number;
  created_at: string;
  businesses?: {
    id: string;
    business_name: string;
    logo_url: string;
  };
}

type FilterType = "pending_review" | "active" | "completed" | "rejected" | "all";

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterType>("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating]   = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("campaigns")
        .select(`*, businesses (id, business_name, logo_url)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm)       query = query.ilike("name", `%${searchTerm}%`);

      const { data, error } = await query;
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter, searchTerm]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("admin-campaigns-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => fetchCampaigns()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [filter, searchTerm]);

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: "active" | "rejected" | "completed") => {
    setUpdating(id);
    try {
      const updates: any = {
        status: newStatus,
        ...(newStatus === "active"    ? { approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}),
        ...(newStatus === "rejected"  ? { rejected_at: new Date().toISOString() } : {}),
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
      };

      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Notify the business owner
      const campaign = campaigns.find((c) => c.id === id);
      if (campaign?.businesses?.id) {
        // Get business user_id
        const { data: biz } = await supabase
          .from("businesses")
          .select("user_id")
          .eq("id", campaign.businesses.id)
          .maybeSingle();

        if (biz?.user_id) {
          await supabase.from("notifications").insert({
            user_id:    biz.user_id,
            type:       newStatus === "active" ? "campaign_approved" : "campaign_rejected",
            title:      newStatus === "active" ? "Campaign Approved! ✅" : "Campaign Rejected",
            message:    newStatus === "active"
              ? `Your campaign "${campaign.name}" has been approved and is now live.`
              : `Your campaign "${campaign.name}" was not approved. Please review and resubmit.`,
            data:       { campaign_id: id },
            created_at: new Date().toISOString(),
          }).catch(console.error);
        }
      }

      toast.success(`Campaign ${newStatus === "active" ? "approved" : newStatus}`);
      fetchCampaigns();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-1 text-[8px] font-black uppercase rounded-full";
    switch (status) {
      case "active":         return `${base} bg-green-100 text-green-700`;
      case "completed":      return `${base} bg-blue-100 text-blue-700`;
      case "rejected":       return `${base} bg-red-100 text-red-700`;
      case "pending_review": return `${base} bg-yellow-100 text-yellow-700`;
      default:               return `${base} bg-gray-100 text-gray-500`;
    }
  };

  const TABS: FilterType[] = ["pending_review", "active", "completed", "rejected", "all"];

  const tabLabel = (t: FilterType) =>
    t === "all" ? "All" : t.replace("_", " ");

  // Count per tab for badges
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("status");
      if (!data) return;
      const c: Record<string, number> = { all: data.length };
      data.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
      setCounts(c);
    };
    fetchCounts();
  }, [campaigns]);

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="font-black uppercase tracking-tight text-xl flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#389C9A]" />
          Campaigns
        </h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors w-full md:w-64 text-sm rounded-lg"
            />
          </div>
          <button className="p-2.5 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-lg">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-[#1D1D1D]/10 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filter === tab
                ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tabLabel(tab)}
            {counts[tab === "all" ? "all" : tab] > 0 && (
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
                filter === tab ? "bg-[#1D1D1D] text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[tab === "all" ? "all" : tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-medium">No campaigns found</p>
          {filter === "pending_review" && (
            <p className="text-gray-300 text-xs mt-1">No campaigns awaiting review</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-5 transition-all rounded-xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                {/* Business info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {campaign.businesses?.logo_url ? (
                    <img
                      src={campaign.businesses.logo_url}
                      alt={campaign.businesses.business_name}
                      className="w-11 h-11 border-2 border-[#1D1D1D] object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center rounded-lg shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm uppercase tracking-tight truncate">
                      {campaign.name}
                    </h4>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {campaign.businesses?.business_name || "Unknown Business"}
                    </p>
                  </div>
                </div>

                {/* Amount + status */}
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-[#389C9A]">
                    ₦{(campaign.pay_rate || campaign.bid_amount || campaign.budget || 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] text-gray-400 mb-1">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                  <span className={getStatusBadge(campaign.status)}>
                    {campaign.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* ✅ Actions shown for pending, rejected — not for active/completed */}
              {(campaign.status === "pending_review" || campaign.status === "rejected") && (
                <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                  <button
                    onClick={() => updateStatus(campaign.id, "active")}
                    disabled={updating === campaign.id}
                    className="flex-1 bg-[#1D1D1D] text-white py-2.5 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {updating === campaign.id ? "Approving..." : "Approve"}
                  </button>
                  {campaign.status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(campaign.id, "rejected")}
                      disabled={updating === campaign.id}
                      className="flex-1 border-2 border-red-400 text-red-500 py-2.5 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              )}

              {/* Active campaigns can be marked completed */}
              {campaign.status === "active" && (
                <div className="flex gap-2 pt-3 border-t border-[#1D1D1D]/5">
                  <button
                    onClick={() => updateStatus(campaign.id, "completed")}
                    disabled={updating === campaign.id}
                    className="flex-1 border-2 border-blue-400 text-blue-500 py-2.5 text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {updating === campaign.id ? "Updating..." : "Mark Completed"}
                  </button>
                  <button
                    onClick={() => updateStatus(campaign.id, "rejected")}
                    disabled={updating === campaign.id}
                    className="flex-1 border-2 border-red-400 text-red-500 py-2.5 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
