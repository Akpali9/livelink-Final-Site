import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import {
  Users, Clock, CheckCircle, XCircle, User, RefreshCw,
  Filter, Calendar, Star, Award, Eye,
  ChevronRight, CheckSquare, Square
} from "lucide-react";
import { motion } from "framer-motion";

interface ApplicationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  location: string | null;
  niche: string[] | null;
  avg_viewers: number;
  status: string;
  created_at: string;
  creator_platforms: { platform_type: string; followers_count: number }[];
}

export function AdminApplicationQueue() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending_review" | "active" | "rejected">("pending_review");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    };
    getAdmin();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("creator_profiles")
        .select(`
          id,
          user_id,
          full_name,
          email,
          avatar_url,
          location,
          niche,
          avg_viewers,
          status,
          created_at,
          creator_platforms (
            platform_type,
            followers_count
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications((data as ApplicationRow[]) || []);
      setSelectedItems([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "active" | "rejected") => {
    setActionLoading(true);
    try {
      const { data: creator } = await supabase
        .from("creator_profiles")
        .select("user_id, full_name, email")
        .eq("id", id)
        .single();

      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === "active") {
        updates.approved_at = new Date().toISOString();
      } else {
        updates.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("creator_profiles")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      if (creator?.user_id) {
        await supabase.from("notifications").insert({
          user_id: creator.user_id,
          type: newStatus === "active" ? "creator_approved" : "creator_rejected",
          title: newStatus === "active" ? "🎉 Application Approved!" : "Application Update",
          message: newStatus === "active" 
            ? `Congratulations! Your creator application has been approved.`
            : `After review, your application was not approved at this time.`,
          created_at: new Date().toISOString()
        });
      }

      toast.success(`Creator ${newStatus === "active" ? "approved" : "rejected"}`);
      fetchApplications();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === applications.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(applications.map(app => app.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const statusBadge = (status: string) => {
    const base = "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full";
    switch (status) {
      case "active":         return `${base} bg-green-100 text-green-700`;
      case "rejected":      return `${base} bg-red-100 text-red-700`;
      case "pending_review": return `${base} bg-[#FEDB71]/30 text-[#1D1D1D]`;
      default:               return `${base} bg-gray-100 text-gray-500`;
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-20">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="admin" subtitle="Admin Panel" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Creator Applications</h1>
            <p className="text-xs text-gray-400 mt-1">{applications.length} applications</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex gap-2 mb-8 border-b border-[#1D1D1D]/10">
          {(["pending_review", "active", "rejected", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
                filter === tab
                  ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                  : "text-gray-400 hover:text-[#1D1D1D]"
              }`}
            >
              {tab === "pending_review" ? "Pending" : tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No applications found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {applications.map(app => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        {app.avatar_url ? (
                          <img src={app.avatar_url} alt={app.full_name || ""} className="w-14 h-14 rounded-xl border-2 border-[#1D1D1D] object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-black text-lg uppercase tracking-tight">{app.full_name || "Unknown"}</h3>
                          <p className="text-xs text-gray-500 mb-1">{app.email || "—"}</p>
                          {app.location && <p className="text-[9px] text-gray-400">{app.location}</p>}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={statusBadge(app.status)}>{app.status}</span>
                        <p className="text-[8px] text-gray-400">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {app.niche && app.niche.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {app.niche.map(n => (
                          <span key={n} className="text-[7px] font-black uppercase bg-[#F8F8F8] border border-[#1D1D1D]/10 px-2 py-0.5 rounded-full">
                            {n}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-6 mb-4 text-[9px] font-black uppercase">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#389C9A]" />
                        {app.avg_viewers?.toLocaleString() || 0} avg viewers
                      </span>
                      {app.creator_platforms?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#FEDB71]" />
                          {app.creator_platforms.length} platforms
                        </span>
                      )}
                    </div>

                    {app.status === "pending_review" && (
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => updateStatus(app.id, "active")}
                          disabled={actionLoading}
                          className="flex-1 bg-[#1D1D1D] text-white py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, "rejected")}
                          disabled={actionLoading}
                          className="flex-1 border-2 border-[#1D1D1D] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
