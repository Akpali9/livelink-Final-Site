import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import {
  Users, Clock, CheckCircle, XCircle, User, RefreshCw,
  Filter, Download, Mail, Calendar, Star, Award, Eye,
  ChevronRight, AlertCircle, CheckSquare, Square, Bell
} from "lucide-react";
import { motion } from "framer-motion";

interface ApplicationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
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

  // Get admin user
  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    };
    getAdmin();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("creator_profiles")
        .select(`
          id,
          user_id,
          full_name,
          username,
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
      setSelectedItems([]); // Clear selections when filter changes
    } catch (err) {
      console.error(err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [filter]);

  // Send notification to user
  const sendNotification = async (userId: string, type: string, title: string, message: string, data?: any) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Log admin action
  const logAdminAction = async (actionType: string, resourceId: string, details: any) => {
    try {
      await supabase.from("admin_actions_log").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: actionType,
        resource_type: "creator",
        resource_id: resourceId,
        details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  };

  // Update single creator status
  const updateStatus = async (id: string, newStatus: "active" | "rejected") => {
    setActionLoading(true);
    try {
      // Get the creator first to get user_id
      const { data: creator, error: fetchError } = await supabase
        .from("creator_profiles")
        .select("user_id, full_name, email")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Update creator profile
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === "active") {
        updates.approved_at = new Date().toISOString();
        updates.rejected_at = null;
      } else {
        updates.rejected_at = new Date().toISOString();
        updates.approved_at = null;
      }

      const { error: updateError } = await supabase
        .from("creator_profiles")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;

      // Update user metadata
      if (creator?.user_id) {
        // Get current metadata
        const { data: userData } = await supabase.auth.admin.getUserById(creator.user_id);
        
        if (userData?.user) {
          await supabase.auth.admin.updateUserById(creator.user_id, {
            user_metadata: {
              ...userData.user.user_metadata,
              creator_approved: newStatus === "active",
              creator_status: newStatus,
              approved_at: newStatus === "active" ? new Date().toISOString() : null
            }
          });
        }

        // Send notification
        if (newStatus === "active") {
          await sendNotification(
            creator.user_id,
            "creator_approved",
            "🎉 Application Approved!",
            `Congratulations ${creator.full_name || "Creator"}! Your creator application has been approved. You can now start accepting offers and earning!`,
            { creator_id: id }
          );
        } else {
          await sendNotification(
            creator.user_id,
            "creator_rejected",
            "Application Update",
            `Thank you for your interest. After reviewing your application, we regret to inform you that it was not approved at this time.`,
            { creator_id: id }
          );
        }

        // Log admin action
        await logAdminAction(`${newStatus}_creator`, id, {
          creator_name: creator.full_name,
          creator_email: creator.email
        });
      }

      toast.success(`Creator ${newStatus === "active" ? "approved" : "rejected"} successfully`);
      setApplications(prev =>
        prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk approve selected creators
  const bulkApprove = async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Approve ${selectedItems.length} selected creators?`)) return;
    
    setActionLoading(true);
    try {
      // Get all selected creators
      const { data: creators, error: fetchError } = await supabase
        .from("creator_profiles")
        .select("id, user_id, full_name, email")
        .in("id", selectedItems);

      if (fetchError) throw fetchError;

      // Update all to active
      const { error: updateError } = await supabase
        .from("creator_profiles")
        .update({ 
          status: "active",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in("id", selectedItems);

      if (updateError) throw updateError;

      // Update each user's metadata and send notifications
      for (const creator of creators || []) {
        if (creator.user_id) {
          // Update metadata
          const { data: userData } = await supabase.auth.admin.getUserById(creator.user_id);
          if (userData?.user) {
            await supabase.auth.admin.updateUserById(creator.user_id, {
              user_metadata: {
                ...userData.user.user_metadata,
                creator_approved: true,
                creator_status: "active",
                approved_at: new Date().toISOString()
              }
            });
          }

          // Send notification
          await sendNotification(
            creator.user_id,
            "creator_approved",
            "🎉 Application Approved!",
            `Congratulations ${creator.full_name || "Creator"}! Your creator application has been approved.`,
            { creator_id: creator.id }
          );
        }
      }

      // Log bulk action
      await supabase.from("admin_actions_log").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: "bulk_approve_creators",
        resource_type: "creators",
        details: { count: selectedItems.length, ids: selectedItems },
        created_at: new Date().toISOString()
      });

      toast.success(`✅ Approved ${selectedItems.length} creators`);
      setSelectedItems([]);
      fetchApplications();
    } catch (error) {
      console.error("Error in bulk approve:", error);
      toast.error("Failed to approve selected creators");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk reject selected creators
  const bulkReject = async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Reject ${selectedItems.length} selected creators?`)) return;
    
    setActionLoading(true);
    try {
      const { data: creators, error: fetchError } = await supabase
        .from("creator_profiles")
        .select("id, user_id, full_name, email")
        .in("id", selectedItems);

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from("creator_profiles")
        .update({ 
          status: "rejected",
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in("id", selectedItems);

      if (updateError) throw updateError;

      for (const creator of creators || []) {
        if (creator.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(creator.user_id);
          if (userData?.user) {
            await supabase.auth.admin.updateUserById(creator.user_id, {
              user_metadata: {
                ...userData.user.user_metadata,
                creator_approved: false,
                creator_status: "rejected"
              }
            });
          }

          await sendNotification(
            creator.user_id,
            "creator_rejected",
            "Application Update",
            `Thank you for your interest. After review, your application was not approved at this time.`,
            { creator_id: creator.id }
          );
        }
      }

      await supabase.from("admin_actions_log").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: "bulk_reject_creators",
        resource_type: "creators",
        details: { count: selectedItems.length, ids: selectedItems },
        created_at: new Date().toISOString()
      });

      toast.success(`Rejected ${selectedItems.length} creators`);
      setSelectedItems([]);
      fetchApplications();
    } catch (error) {
      console.error("Error in bulk reject:", error);
      toast.error("Failed to reject selected creators");
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

  const statusIcon = (status: string) => {
    switch (status) {
      case "active":        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":     return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending_review":return <Clock className="w-4 h-4 text-[#FEDB71]" />;
      default:              return <Clock className="w-4 h-4 text-gray-400" />;
    }
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

  const filteredApplications = applications.filter(app => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-20">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="admin" subtitle="Admin Panel" />

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header with Bulk Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Creator Applications</h1>
            <p className="text-xs text-gray-400 mt-1">{filteredApplications.length} applications</p>
          </div>
          <div className="flex gap-3">
            {selectedItems.length > 0 && (
              <>
                <button
                  onClick={bulkApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-500 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve {selectedItems.length}
                </button>
                <button
                  onClick={bulkReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject {selectedItems.length}
                </button>
              </>
            )}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
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
              {tab === "pending_review" ? "Pending" : tab} ({applications.filter(a => 
                tab === "all" ? true : a.status === tab
              ).length})
            </button>
          ))}
        </div>

        {/* Select All Row */}
        {filteredApplications.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <button onClick={toggleSelectAll} className="flex items-center gap-2">
              {selectedItems.length === filteredApplications.length ? (
                <CheckSquare className="w-5 h-5 text-[#389C9A]" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-xs font-black uppercase tracking-widest">
                {selectedItems.length === filteredApplications.length ? "Deselect All" : "Select All"}
              </span>
            </button>
            {selectedItems.length > 0 && (
              <span className="text-xs text-gray-500">
                {selectedItems.length} of {filteredApplications.length} selected
              </span>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No applications in this category</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredApplications.map(app => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-6 rounded-xl hover:shadow-lg transition-shadow ${
                  selectedItems.includes(app.id) 
                    ? 'border-[#389C9A] bg-[#389C9A]/5' 
                    : 'border-[#1D1D1D]'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleSelectItem(app.id)} className="mt-1">
                    {selectedItems.includes(app.id) ? (
                      <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                )}
                  </button>

                  <div className="flex-1">
                    {/* Header */}
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
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-lg uppercase tracking-tight">{app.full_name || "Unknown"}</h3>
                            {statusIcon(app.status)}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{app.email || "—"}</p>
                          {app.username && <p className="text-[9px] text-gray-400">@{app.username}</p>}
                          {app.location && <p className="text-[9px] text-gray-400 mt-1">{app.location}</p>}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={statusBadge(app.status)}>{app.status}</span>
                        <p className="text-[8px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Niches */}
                    {app.niche && app.niche.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {app.niche.map(n => (
                          <span key={n} className="text-[7px] font-black uppercase bg-[#F8F8F8] border border-[#1D1D1D]/10 px-2 py-0.5 rounded-full">
                            {n}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex gap-6 mb-4 text-[9px] font-black uppercase">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#389C9A]" />
                        {app.avg_viewers?.toLocaleString() || 0} avg viewers
                      </span>
                      {app.creator_platforms?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#FEDB71]" />
                          {app.creator_platforms.length} platform{app.creator_platforms.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Platforms preview */}
                    {app.creator_platforms && app.creator_platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {app.creator_platforms.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                            {p.platform_type}: {p.followers_count?.toLocaleString() || 0}
                          </span>
                        ))}
                        {app.creator_platforms.length > 3 && (
                          <span className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                            +{app.creator_platforms.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons — only show for pending */}
                    {app.status === "pending_review" && (
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => updateStatus(app.id, "active")}
                          disabled={actionLoading}
                          className="flex-1 bg-[#1D1D1D] text-white py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> 
                          {actionLoading ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, "rejected")}
                          disabled={actionLoading}
                          className="flex-1 border-2 border-[#1D1D1D] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> 
                          {actionLoading ? "Processing..." : "Reject"}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/creator/${app.id}`)}
                          className="px-6 border-2 border-[#1D1D1D]/20 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-[#1D1D1D] transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    )}

                    {/* View only for non-pending */}
                    {app.status !== "pending_review" && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => navigate(`/admin/creator/${app.id}`)}
                          className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
                        >
                          View Details <ChevronRight className="w-3 h-3" />
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
