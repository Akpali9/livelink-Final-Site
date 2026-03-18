import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  Building2,
  Megaphone,
  DollarSign,
  Clock,
  Eye,
  Search,
  Filter,
  Download,
  LogOut,
  Bell,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  Shield,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  User,
  RefreshCw,
  Video,
  Star,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  Award,
  Briefcase,
  ThumbsUp,
  AlertTriangle,
  CreditCard,
  PieChart,
  Zap,
  Heart,
  Share2,
  MessageCircle,
  Flag,
  Trash2,
  Edit,
  EyeOff,
  Check,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface DashboardStats {
  totalCreators: number;
  pendingCreators: number;
  activeCreators: number;
  suspendedCreators: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  rejectedBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pendingCampaigns: number;
  totalRevenue: number;
  pendingPayouts: number;
  totalUsers: number;
  reportedContent: number;
  openSupportTickets: number;
  platformFee: number;
}

interface CreatorProfile {
  id: string;
  user_id?: string;
  full_name?: string;
  username?: string;
  email?: string;
  category?: string;
  niche?: string;
  platform?: string;
  followers?: number;
  avg_viewers?: number;
  city?: string;
  location?: string;
  country?: string;
  status: 'pending_review' | 'active' | 'suspended';
  created_at: string;
  bio?: string;
  avatar_url?: string;
  rate?: number;
  platforms?: CreatorPlatform[];
}

interface CreatorPlatform {
  id?: string;
  creator_id?: string;
  platform_type?: string;
  platform?: string;
  followers_count?: number;
  followers?: number;
  username?: string;
  verified?: boolean;
}

interface BusinessProfile {
  id: string;
  user_id?: string;
  business_name?: string;
  name?: string;
  full_name?: string;
  job_title?: string;
  email?: string;
  phone_number?: string;
  industry?: string;
  city?: string;
  country?: string;
  postcode?: string;
  logo_url?: string;
  logo?: string;
  website?: string;
  description?: string;
  bio?: string;
  budget?: string;
  status: string;
  application_status?: string;
  verification_status?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name?: string;
  title?: string;
  type?: 'banner' | 'promo' | 'banner_promo' | string;
  status: 'pending_review' | 'active' | 'completed' | 'rejected' | string;
  budget?: number;
  pay_rate?: number;
  bid_amount?: number;
  created_at: string;
  admin_notes?: string;
  business_id?: string;
  businesses?: {
    id: string;
    business_name?: string;
    name?: string;
    logo_url?: string;
  };
}

interface SupportTicket {
  id: string;
  category?: string;
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | string;
  admin_reply?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

interface ReportedContent {
  id: string;
  content_type: 'campaign' | 'message' | 'profile' | string;
  content_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed' | string;
  created_at: string;
  reported_by: string;
  reported_user_email?: string;
  details?: any;
}

interface Transaction {
  id: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | string;
  type: 'payment' | 'withdrawal' | 'refund' | string;
  created_at: string;
  user_id?: string;
  business_id?: string;
  campaign_id?: string;
}

interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  created_at: string;
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD MAIN COMPONENT
// ─────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "creators" | "businesses" | "campaigns" | "support" | "reports" | "transactions" | "settings"
  >("overview");
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0,
    pendingCreators: 0,
    activeCreators: 0,
    suspendedCreators: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    rejectedBusinesses: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    pendingCampaigns: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
    totalUsers: 0,
    reportedContent: 0,
    openSupportTickets: 0,
    platformFee: 10,
  });

  // ─── CHECK ADMIN ACCESS ──────────────────────────────────────────────

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Not authenticated");
          navigate("/login/portal");
          return;
        }

        setAdminUser(user);

        const isAdmin = user.user_metadata?.role === "admin" || 
                        user.user_metadata?.user_type === "admin" ||
                        user.user_metadata?.is_admin === true ||
                        user.email === "admin@livelink.com";

        if (!isAdmin) {
          toast.error("Unauthorized access");
          await supabase.auth.signOut();
          navigate("/login/portal");
          return;
        }

        await fetchDashboardData();
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("Authentication error");
        navigate("/login/portal");
      }
    };

    checkAdminAccess();
  }, []);

  // ─── FETCH DASHBOARD STATS ───────────────────────────────────────────

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ── CREATORS ───────────────────────────────
      let totalCreators = 0, pendingCreators = 0, activeCreators = 0, suspendedCreators = 0;
      try {
        const { count: total } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        totalCreators = total || 0;
        const { count: pending } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "pending_review");
        pendingCreators = pending || 0;
        const { count: active } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "active");
        activeCreators = active || 0;
        const { count: suspended } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "suspended");
        suspendedCreators = suspended || 0;
      } catch (e) { console.error("Creator stats error:", e); }

      // ── BUSINESSES ─────────────────────────────
      let totalBusinesses = 0, pendingBusinesses = 0, approvedBusinesses = 0, rejectedBusinesses = 0;
      try {
        const { count: total } = await supabase.from("businesses").select("*", { count: "exact", head: true }).neq("status", "deleted");
        totalBusinesses = total || 0;
        const { count: pending } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.pending,status.eq.pending_review`);
        pendingBusinesses = pending || 0;
        const { count: approved } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.approved,status.eq.active`);
        approvedBusinesses = approved || 0;
        const { count: rejected } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.rejected,status.eq.rejected`);
        rejectedBusinesses = rejected || 0;
      } catch (e) { console.error("Business stats error:", e); }

      // ── CAMPAIGNS ──────────────────────────────
      let totalCampaigns = 0, activeCampaigns = 0, completedCampaigns = 0, pendingCampaigns = 0;
      try {
        const { count: total } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
        totalCampaigns = total || 0;
        const { count: active } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active");
        activeCampaigns = active || 0;
        const { count: completed } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "completed");
        completedCampaigns = completed || 0;
        const { count: pending } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "pending_review");
        pendingCampaigns = pending || 0;
      } catch (e) { console.error("Campaign stats error:", e); }

      // ── REVENUE ──
      let totalRevenue = 0;
      try {
        const { data: txRows, error: txError } = await supabase
          .from("business_transactions")
          .select("amount")
          .eq("status", "completed")
          .eq("type", "payment");
        if (!txError) totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);
      } catch (e) { console.error("Revenue fetch error:", e); }

      // ── PAYOUTS ───────
      let pendingPayouts = 0;
      try {
        const { data: ccRows, error: ccError } = await supabase
          .from("campaign_creators")
          .select("total_earnings, paid_out")
          .eq("status", "active");
        if (!ccError) {
          const totalEarnings = (ccRows || []).reduce((s, r) => s + (r.total_earnings || 0), 0);
          const totalPaid = (ccRows || []).reduce((s, r) => s + (r.paid_out || 0), 0);
          pendingPayouts = totalEarnings - totalPaid;
        }
      } catch (e) { console.error("Payout fetch error:", e); }

      // ── TOTAL USERS ──────────
      let totalUsers = 0;
      try {
        const { count: creatorCount } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
        totalUsers = (creatorCount || 0) + (bizCount || 0);
      } catch (e) { console.error("User count error:", e); }

      // ── REPORTED CONTENT ────────────────────────
      let reportedContent = 0;
      try {
        const { count, error: rcError } = await supabase
          .from("reported_content")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        
        if (rcError) {
          if (rcError.code === '42P01') {
            console.log("reported_content table doesn't exist yet");
          } else {
            console.error("Error fetching reported content:", rcError);
          }
        } else {
          reportedContent = count || 0;
        }
      } catch (e) { 
        console.log("reported_content table not available:", e); 
      }

      // ── SUPPORT TICKETS ─────────────────────────
      let openSupportTickets = 0;
      try {
        const { count, error: stError } = await supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]);
        
        if (stError) {
          if (stError.code === '42P01') {
            console.log("support_tickets table doesn't exist yet");
          } else {
            console.error("Error fetching support tickets:", stError);
          }
        } else {
          openSupportTickets = count || 0;
        }
      } catch (e) { 
        console.log("support_tickets table not available:", e); 
      }

      setStats({
        totalCreators, pendingCreators, activeCreators, suspendedCreators,
        totalBusinesses, pendingBusinesses, approvedBusinesses, rejectedBusinesses,
        totalCampaigns, activeCampaigns, completedCampaigns, pendingCampaigns,
        totalRevenue, pendingPayouts, totalUsers, reportedContent, openSupportTickets,
        platformFee: 10,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ─── BULK APPROVAL FUNCTIONS ────────────────────────────────────────

  const getUserMetadata = async (userId: string) => {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user.user_metadata || {};
    } catch (error) {
      console.error("Error fetching user metadata:", error);
      return {};
    }
  };

  const logAdminAction = async (actionType: string, resourceType: string, details: any) => {
    try {
      await supabase.from("admin_actions").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: actionType,
        resource_type: resourceType,
        details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  };

  const sendApprovalNotification = async (userId: string, type: 'business' | 'creator' | 'campaign', name: string) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: `${type}_approved`,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Approved`,
        message: `Your ${type} "${name}" has been approved and is now active on the platform.`,
        data: { [type + "_id"]: userId },
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Approve all pending businesses
  const approveAllBusinesses = async () => {
    if (!confirm(`Approve ${stats.pendingBusinesses} pending business applications?`)) return;
    
    setActionLoading(true);
    try {
      // Get all pending businesses with user_ids
      const { data: pendingBusinesses, error: fetchError } = await supabase
        .from("businesses")
        .select("id, user_id, email, business_name")
        .or(`application_status.eq.pending,status.eq.pending_review`);

      if (fetchError) throw fetchError;

      if (!pendingBusinesses || pendingBusinesses.length === 0) {
        toast.info("No pending businesses to approve");
        return;
      }

      // Update all businesses to approved
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          application_status: "approved", 
          status: "active",
          verification_status: "verified",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .or(`application_status.eq.pending,status.eq.pending_review`);

      if (updateError) throw updateError;

      // Update user metadata and send notifications for each business owner
      for (const business of pendingBusinesses) {
        if (business.user_id) {
          try {
            // Update user metadata
            const metadata = await getUserMetadata(business.user_id);
            await supabase.auth.admin.updateUserById(
              business.user_id,
              {
                user_metadata: {
                  ...metadata,
                  business_approved: true,
                  approved_at: new Date().toISOString()
                }
              }
            );

            // Send notification
            await sendApprovalNotification(
              business.user_id, 
              'business', 
              business.business_name || 'Your business'
            );
          } catch (error) {
            console.error(`Error updating user ${business.user_id}:`, error);
          }
        }
      }

      // Log admin action
      await logAdminAction("BULK_APPROVE", "businesses", { 
        count: pendingBusinesses.length,
        business_ids: pendingBusinesses.map(b => b.id)
      });

      toast.success(`✅ Approved ${pendingBusinesses.length} businesses`);
      await fetchDashboardData();
      setActiveTab("businesses");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving businesses:", error);
      toast.error("Failed to approve all businesses");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve all pending creators
  const approveAllCreators = async () => {
    if (!confirm(`Approve ${stats.pendingCreators} pending creator applications?`)) return;
    
    setActionLoading(true);
    try {
      // Get all pending creators with user_ids
      const { data: pendingCreators, error: fetchError } = await supabase
        .from("creator_profiles")
        .select("id, user_id, full_name, email")
        .eq("status", "pending_review");

      if (fetchError) throw fetchError;

      if (!pendingCreators || pendingCreators.length === 0) {
        toast.info("No pending creators to approve");
        return;
      }

      // Update all creators to active
      const { error: updateError } = await supabase
        .from("creator_profiles")
        .update({ 
          status: "active",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("status", "pending_review");

      if (updateError) throw updateError;

      // Update user metadata and send notifications for each creator
      for (const creator of pendingCreators) {
        if (creator.user_id) {
          try {
            // Update user metadata
            const metadata = await getUserMetadata(creator.user_id);
            await supabase.auth.admin.updateUserById(
              creator.user_id,
              {
                user_metadata: {
                  ...metadata,
                  creator_approved: true,
                  approved_at: new Date().toISOString()
                }
              }
            );

            // Send notification
            await sendApprovalNotification(
              creator.user_id, 
              'creator', 
              creator.full_name || 'Your creator profile'
            );
          } catch (error) {
            console.error(`Error updating user ${creator.user_id}:`, error);
          }
        }
      }

      // Log admin action
      await logAdminAction("BULK_APPROVE", "creators", { 
        count: pendingCreators.length,
        creator_ids: pendingCreators.map(c => c.id)
      });

      toast.success(`✅ Approved ${pendingCreators.length} creators`);
      await fetchDashboardData();
      setActiveTab("creators");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving creators:", error);
      toast.error("Failed to approve all creators");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve all pending campaigns
  const approveAllCampaigns = async () => {
    if (!confirm(`Approve ${stats.pendingCampaigns} pending campaigns?`)) return;
    
    setActionLoading(true);
    try {
      // Get all pending campaigns with business info
      const { data: pendingCampaigns, error: fetchError } = await supabase
        .from("campaigns")
        .select("id, business_id, name, title")
        .eq("status", "pending_review");

      if (fetchError) throw fetchError;

      if (!pendingCampaigns || pendingCampaigns.length === 0) {
        toast.info("No pending campaigns to approve");
        return;
      }

      // Update all campaigns to active
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ 
          status: "active",
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        })
        .eq("status", "pending_review");

      if (updateError) throw updateError;

      // Create notifications for businesses
      for (const campaign of pendingCampaigns) {
        if (campaign.business_id) {
          try {
            // Get business user_id
            const { data: business } = await supabase
              .from("businesses")
              .select("user_id")
              .eq("id", campaign.business_id)
              .single();

            if (business?.user_id) {
              await supabase.from("notifications").insert({
                user_id: business.user_id,
                type: "campaign_approved",
                title: "Campaign Approved",
                message: `Your campaign "${campaign.name || campaign.title}" has been approved and is now live!`,
                data: { campaign_id: campaign.id },
                created_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error(`Error notifying business for campaign ${campaign.id}:`, error);
          }
        }
      }

      // Log admin action
      await logAdminAction("BULK_APPROVE", "campaigns", { 
        count: pendingCampaigns.length,
        campaign_ids: pendingCampaigns.map(c => c.id)
      });

      toast.success(`✅ Approved ${pendingCampaigns.length} campaigns`);
      await fetchDashboardData();
      setActiveTab("campaigns");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving campaigns:", error);
      toast.error("Failed to approve all campaigns");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve selected items
  const approveSelected = async (type: 'business' | 'creator' | 'campaign') => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Approve ${selectedItems.length} selected ${type}s?`)) return;
    
    setActionLoading(true);
    try {
      const table = type === 'business' ? 'businesses' : 
                    type === 'creator' ? 'creator_profiles' : 'campaigns';
      
      const updates: any = { 
        status: type === 'campaign' ? 'active' : 'active',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (type === 'business') {
        updates.application_status = 'approved';
        updates.verification_status = 'verified';
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .in('id', selectedItems);

      if (updateError) throw updateError;

      // Get details for notifications
      let items: any[] = [];
      if (type === 'business') {
        const { data } = await supabase.from("businesses").select("id, user_id, business_name").in('id', selectedItems);
        items = data || [];
      } else if (type === 'creator') {
        const { data } = await supabase.from("creator_profiles").select("id, user_id, full_name").in('id', selectedItems);
        items = data || [];
      } else {
        const { data } = await supabase.from("campaigns").select("id, business_id, name").in('id', selectedItems);
        items = data || [];
      }

      // Send notifications
      for (const item of items) {
        if (type === 'campaign' && item.business_id) {
          const { data: business } = await supabase
            .from("businesses")
            .select("user_id")
            .eq("id", item.business_id)
            .single();
          
          if (business?.user_id) {
            await sendApprovalNotification(
              business.user_id,
              type,
              item.name || item.business_name || item.full_name || 'Item'
            );
          }
        } else if (item.user_id) {
          await sendApprovalNotification(
            item.user_id,
            type,
            item.business_name || item.full_name || item.name || 'Item'
          );
        }
      }

      await logAdminAction("BULK_APPROVE_SELECTED", `${type}s`, { 
        count: selectedItems.length,
        ids: selectedItems
      });

      toast.success(`✅ Approved ${selectedItems.length} ${type}s`);
      setSelectedItems([]);
      await fetchDashboardData();
    } catch (error) {
      console.error(`Error approving selected ${type}s:`, error);
      toast.error(`Failed to approve selected ${type}s`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject selected items
  const rejectSelected = async (type: 'business' | 'creator' | 'campaign') => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Reject ${selectedItems.length} selected ${type}s?`)) return;
    
    setActionLoading(true);
    try {
      const table = type === 'business' ? 'businesses' : 
                    type === 'creator' ? 'creator_profiles' : 'campaigns';
      
      const updates: any = { 
        status: type === 'campaign' ? 'rejected' : 'rejected',
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (type === 'business') {
        updates.application_status = 'rejected';
        updates.verification_status = 'rejected';
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .in('id', selectedItems);

      if (updateError) throw updateError;

      await logAdminAction("BULK_REJECT_SELECTED", `${type}s`, { 
        count: selectedItems.length,
        ids: selectedItems
      });

      toast.success(`Rejected ${selectedItems.length} ${type}s`);
      setSelectedItems([]);
      await fetchDashboardData();
    } catch (error) {
      console.error(`Error rejecting selected ${type}s:`, error);
      toast.error(`Failed to reject selected ${type}s`);
    } finally {
      setActionLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login/portal");
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", tab: "overview", badge: 0 },
    { icon: Users, label: "Creators", tab: "creators", badge: stats.pendingCreators },
    { icon: Building2, label: "Businesses", tab: "businesses", badge: stats.pendingBusinesses },
    { icon: Megaphone, label: "Campaigns", tab: "campaigns", badge: stats.pendingCampaigns },
    { icon: MessageCircle, label: "Support", tab: "support", badge: stats.openSupportTickets },
    { icon: Flag, label: "Reports", tab: "reports", badge: stats.reportedContent },
    { icon: CreditCard, label: "Transactions", tab: "transactions", badge: 0 },
    { icon: Settings, label: "Settings", tab: "settings", badge: 0 },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <Toaster position="top-center" richColors />

      {/* Mobile Header - Always visible */}
      <div className="bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <span className="font-black uppercase tracking-tight text-lg block">Admin</span>
            <span className="text-[8px] opacity-40 uppercase tracking-widest">LiveLink Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-9 h-9 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm rounded-lg">
            {adminUser?.email?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[280px] bg-white border-r border-[#1D1D1D]/10 z-50
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User chip */}
        <div className="px-4 py-4 border-b border-[#1D1D1D]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-base rounded-lg shrink-0">
              {adminUser?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="font-black uppercase tracking-tight text-sm truncate">Admin User</p>
              <p className="text-[8px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  text-xs font-black uppercase tracking-widest transition-all rounded-lg
                  ${activeTab === item.tab
                    ? "bg-[#1D1D1D] text-white"
                    : "hover:bg-[#F4F4F4] text-[#1D1D1D]/60 hover:text-[#1D1D1D]"}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-2 py-0.5 text-[9px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#1D1D1D]/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all rounded-lg"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 min-h-screen">
        {/* Tab Header */}
        <div className="mb-4">
          <h2 className="font-black uppercase tracking-tight text-xl">
            {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
          </h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-0.5">
            {activeTab === "overview" && "Dashboard overview and statistics"}
            {activeTab === "creators" && "Manage creator applications and profiles"}
            {activeTab === "businesses" && "Review and manage business accounts"}
            {activeTab === "campaigns" && "Oversee all platform campaigns"}
            {activeTab === "support" && "Handle support tickets and inquiries"}
            {activeTab === "reports" && "Review reported content"}
            {activeTab === "transactions" && "Monitor financial transactions"}
            {activeTab === "settings" && "Configure platform settings"}
          </p>
        </div>

        {/* Page content */}
        <div className="w-full">
          {activeTab === "overview" && (
            <AdminOverview 
              stats={stats} 
              onTabChange={setActiveTab}
              onApproveAllBusinesses={approveAllBusinesses}
              onApproveAllCreators={approveAllCreators}
              onApproveAllCampaigns={approveAllCampaigns}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "creators" && (
            <AdminCreators 
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('creator')}
              onRejectSelected={() => rejectSelected('creator')}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "businesses" && (
            <AdminBusinesses 
              onStatsChange={fetchDashboardData}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('business')}
              onRejectSelected={() => rejectSelected('business')}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "campaigns" && (
            <AdminCampaigns 
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('campaign')}
              onRejectSelected={() => rejectSelected('campaign')}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === "support" && <AdminSupport />}
          {activeTab === "reports" && <AdminReports />}
          {activeTab === "transactions" && <AdminTransactions />}
          {activeTab === "settings" && <AdminSettings stats={stats} setStats={setStats} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW TAB - With Bulk Approve Buttons
// ─────────────────────────────────────────────

function AdminOverview({ 
  stats, 
  onTabChange,
  onApproveAllBusinesses,
  onApproveAllCreators,
  onApproveAllCampaigns,
  actionLoading
}: { 
  stats: DashboardStats; 
  onTabChange: (tab: any) => void;
  onApproveAllBusinesses: () => Promise<void>;
  onApproveAllCreators: () => Promise<void>;
  onApproveAllCampaigns: () => Promise<void>;
  actionLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Hero banner with bulk actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1D1D1D] text-white p-5 flex flex-col gap-4 rounded-xl"
      >
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic mb-1">
            Admin Dashboard
          </h2>
          <p className="text-white/50 text-xs">Manage creators, businesses, and platform settings</p>
        </div>
        
        {/* Bulk Action Buttons */}
        <div className="flex flex-col gap-2">
          {stats.pendingCreators > 0 && (
            <button
              onClick={onApproveAllCreators}
              disabled={actionLoading}
              className="w-full px-4 py-3 bg-[#389C9A] text-white text-xs font-black uppercase tracking-widest hover:bg-[#2d7f7d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Creators (${stats.pendingCreators})`}
            </button>
          )}
          
          {stats.pendingBusinesses > 0 && (
            <button
              onClick={onApproveAllBusinesses}
              disabled={actionLoading}
              className="w-full px-4 py-3 bg-[#FEDB71] text-[#1D1D1D] text-xs font-black uppercase tracking-widest hover:bg-[#ffd14d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Businesses (${stats.pendingBusinesses})`}
            </button>
          )}
          
          {stats.pendingCampaigns > 0 && (
            <button
              onClick={onApproveAllCampaigns}
              disabled={actionLoading}
              className="w-full px-4 py-3 bg-violet-500 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-600 transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Campaigns (${stats.pendingCampaigns})`}
            </button>
          )}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500", bg: "bg-blue-50", sub: `${stats.pendingCreators} pending` },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-500", bg: "bg-emerald-50", sub: `${stats.approvedBusinesses} approved` },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-violet-500", bg: "bg-violet-50", sub: `${stats.pendingCampaigns} pending` },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500", bg: "bg-orange-50", sub: "registered" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black tracking-tight mb-0.5">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
            <p className="text-[8px] text-gray-400">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#389C9A]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#389C9A]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Total Revenue</h3>
              <p className="text-[8px] opacity-40">Completed payments</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FEDB71]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Pending Payouts</h3>
              <p className="text-[8px] opacity-40">Not yet paid out</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#389C9A]/10 rounded-xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-[#389C9A]" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-sm">Platform Fee</h3>
              <p className="text-[8px] opacity-40">Standard rate</p>
            </div>
          </div>
          <p className="text-3xl font-black italic">{stats.platformFee}%</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Action Required</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Creators", value: stats.pendingCreators, action: () => onTabChange("creators"), accent: "border-[#FEDB71]", icon: Users, bg: "bg-[#FEDB71]/10" },
            { label: "Pending Businesses", value: stats.pendingBusinesses, action: () => onTabChange("businesses"), accent: "border-[#389C9A]", icon: Building2, bg: "bg-[#389C9A]/10" },
            { label: "Pending Campaigns", value: stats.pendingCampaigns, action: () => onTabChange("campaigns"), accent: "border-violet-400", icon: Megaphone, bg: "bg-violet-50" },
            { label: "Reported Content", value: stats.reportedContent, action: () => onTabChange("reports"), accent: "border-red-400", icon: Flag, bg: "bg-red-50" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`bg-white border-2 ${item.accent} p-4 text-left hover:shadow-md transition-all rounded-xl`}
            >
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-black italic mb-1">{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-tight">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Review Creators", icon: Users, action: () => onTabChange("creators"), color: "bg-blue-500" },
            { label: "Review Businesses", icon: Building2, action: () => onTabChange("businesses"), color: "bg-emerald-500" },
            { label: "Check Reports", icon: Flag, action: () => onTabChange("reports"), color: "bg-red-500" },
            { label: "View Transactions", icon: CreditCard, action: () => onTabChange("transactions"), color: "bg-violet-500" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 text-left hover:shadow-md transition-all rounded-xl flex items-center gap-3"
            >
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATORS TAB - With Selection
// ─────────────────────────────────────────────

function AdminCreators({ 
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading
}: { 
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
}) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase.from("creator_profiles").select("*");
      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) { toast.error("Failed to load creators"); setCreators([]); return; }

      if (data && data.length > 0) {
        try {
          const creatorIds = data.map((c: any) => c.id || c.user_id).filter(Boolean);
          if (creatorIds.length > 0) {
            const { data: platforms } = await supabase.from("creator_platforms").select("*").in("creator_id", creatorIds);
            setCreators(data.map((creator: any) => ({
              ...creator,
              platforms: platforms?.filter((p: any) => p.creator_id === creator.id || p.creator_id === creator.user_id) || [],
            })));
            return;
          }
        } catch { /* table may not exist */ }
      }
      setCreators(data || []);
    } catch (error) {
      toast.error("Failed to load creators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreators(); }, [filter, searchTerm]);

  const updateCreatorStatus = async (id: string, newStatus: "active" | "suspended") => {
    const { error } = await supabase.from("creator_profiles").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update creator status"); return; }
    toast.success(`Creator ${newStatus === "active" ? "approved" : "suspended"}`);
    fetchCreators();
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("Delete this creator? This cannot be undone.")) return;
    const { error } = await supabase.from("creator_profiles").delete().eq("id", id);
    if (error) { toast.error("Failed to delete creator"); return; }
    toast.success("Creator deleted");
    fetchCreators();
  };

  const getCreatorName = (c: any) => c.full_name || c.username || c.email || "Unnamed Creator";
  const getCreatorEmail = (c: any) => c.email || `${c.username || "creator"}@example.com`;
  const getCreatorCategory = (c: any) => c.niche || c.category || c.industry || "General";
  const getCreatorFollowers = (c: any) => {
    if (c.platforms?.length) return c.platforms.reduce((s: number, p: any) => s + (p.followers_count || p.followers || 0), 0);
    return c.avg_viewers || c.followers || 0;
  };
  const getCreatorLocation = (c: any) => c.location || c.city || c.country || "";
  const getCreatorJoinDate = (c: any) => c.created_at ? new Date(c.created_at).toLocaleDateString() : "Unknown";

  const filteredCreators = creators.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      {/* Header with search and bulk actions */}
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Creator Applications</h3>
        
        {/* Bulk action bar when items are selected */}
        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">
              {selectedItems.length} creator{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onApproveSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={onRejectSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </button>
              <button
                onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {/* Filter indicator */}
        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">
              Filter: {filter === "all" ? "All Creators" : filter.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-400">({filteredCreators.length})</span>
            {filter === "pending_review" && (
              <button
                onClick={() => {
                  if (filteredCreators.length > 0) {
                    onToggleSelectAll(filteredCreators);
                  }
                }}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline"
              >
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((creator) => (
            <motion.div
              key={creator.id || creator.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-4 transition-all rounded-xl ${
                selectedItems.includes(creator.id) 
                  ? 'border-[#389C9A] bg-[#389C9A]/5' 
                  : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
              }`}
            >
              {/* Selection checkbox */}
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => onToggleSelect(creator.id)}
                  className="mt-1"
                >
                  {selectedItems.includes(creator.id) ? (
                    <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <div className="flex items-center gap-3 flex-1">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={getCreatorName(creator)}
                      onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0 rounded-xl"
                    />
                  ) : (
                    <div
                      onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl"
                    >
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="font-black text-base uppercase tracking-tight truncate">{getCreatorName(creator)}</h4>
                      {creator.verified && <Shield className="w-4 h-4 text-[#389C9A] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{getCreatorEmail(creator)}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {creator.status?.replace("_", " ") || "pending"}
                </span>
              </div>

              {/* Creator details */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] ml-8">
                <div className="flex items-center gap-1 text-gray-600">
                  <Video className="w-3 h-3 shrink-0" />
                  <span className="truncate">{getCreatorCategory(creator)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>{getCreatorFollowers(creator).toLocaleString()} followers</span>
                </div>
                {getCreatorLocation(creator) && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{getCreatorLocation(creator)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>Joined {getCreatorJoinDate(creator)}</span>
                </div>
              </div>

              {/* Platforms */}
              {creator.platforms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 ml-8">
                  {creator.platforms.slice(0, 2).map((p: any, idx: number) => (
                    <span key={idx} className="text-[8px] bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-2 h-2" />
                      {p.platform_type || p.platform}: {(p.followers_count || p.followers)?.toLocaleString()}
                    </span>
                  ))}
                  {creator.platforms.length > 2 && (
                    <span className="text-[8px] bg-gray-100 px-2 py-1 rounded-full">
                      +{creator.platforms.length - 2} more
                    </span>
                  )}
                </div>
              )}

              {/* Bio preview */}
              {creator.bio && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 ml-8">{creator.bio}</p>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                <button
                  onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                  className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
                
                {creator.status === "pending_review" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "active")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "suspended")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                
                {creator.status === "active" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "suspended")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg col-span-2"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => deleteCreator(creator.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
                
                {creator.status === "suspended" && (
                  <>
                    <button
                      onClick={() => updateCreatorStatus(creator.id, "active")}
                      className="border-2 border-green-500 text-green-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-colors rounded-lg col-span-2"
                    >
                      Reinstate
                    </button>
                    <button
                      onClick={() => deleteCreator(creator.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showDetailModal && selectedCreator && (
        <CreatorDetailModal creator={selectedCreator} onClose={() => setShowDetailModal(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESSES TAB - With Selection
// ─────────────────────────────────────────────

function AdminBusinesses({ 
  onStatsChange,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading
}: { 
  onStatsChange?: () => void;
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
}) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase.from("businesses").select("*").order("created_at", { ascending: false }).neq("status", "deleted");
      if (filter === "pending") query = query.or(`application_status.eq.pending,status.eq.pending_review`);
      else if (filter === "approved") query = query.or(`application_status.eq.approved,status.eq.active`);
      else if (filter === "rejected") query = query.or(`application_status.eq.rejected,status.eq.rejected`);
      if (searchTerm) query = query.or(`business_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load businesses"); } else { setBusinesses(data || []); }
    } catch { toast.error("Failed to load businesses"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBusinesses(); }, [filter, searchTerm]);

  const updateBusinessStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const updates: any = newStatus === "approved"
      ? { application_status: "approved", status: "active", verification_status: "verified", approved_at: new Date().toISOString() }
      : { application_status: "rejected", status: "rejected", verification_status: "rejected", rejected_at: new Date().toISOString() };
    const { error } = await supabase.from("businesses").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update business status"); return; }
    toast.success(`Business ${newStatus}`);
    fetchBusinesses(); onStatsChange?.();
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm("Delete this business?")) return;
    const { error } = await supabase.from("businesses").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Failed to delete business"); return; }
    toast.success("Business deleted"); fetchBusinesses(); onStatsChange?.();
  };

  const getBusinessName = (b: any) => b.business_name || b.name || "Unnamed Business";
  const getContactName = (b: any) => b.full_name || "Unknown";
  const getContactEmail = (b: any) => b.email || "No email";
  const getStatusDisplay = (b: any) => b.application_status || b.status || "pending";

  const filteredBusinesses = businesses.filter(b => {
    const status = getStatusDisplay(b);
    if (filter === "pending") return status === "pending" || status === "pending_review";
    if (filter === "approved") return status === "approved" || status === "active";
    if (filter === "rejected") return status === "rejected";
    return true;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Business Applications</h3>
        
        {/* Bulk action bar when items are selected */}
        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">
              {selectedItems.length} business{selectedItems.length !== 1 ? 'es' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onApproveSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={onRejectSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </button>
              <button
                onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending", "approved", "rejected", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab === "all" ? "All" : tab}
              </button>
            ))}
          </div>
        )}

        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">
              Filter: {filter === "all" ? "All Businesses" : filter}
            </span>
            <span className="text-xs text-gray-400">({filteredBusinesses.length})</span>
            {filter === "pending" && (
              <button
                onClick={() => {
                  if (filteredBusinesses.length > 0) {
                    onToggleSelectAll(filteredBusinesses);
                  }
                }}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline"
              >
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((biz) => {
            const status = getStatusDisplay(biz);
            const verificationStatus = biz.verification_status || "pending";
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(biz.id) 
                    ? 'border-[#389C9A] bg-[#389C9A]/5' 
                    : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}
              >
                {/* Selection checkbox */}
                <div className="flex items-start gap-3 mb-3">
                  <button
                    onClick={() => onToggleSelect(biz.id)}
                    className="mt-1"
                  >
                    {selectedItems.includes(biz.id) ? (
                      <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-3 flex-1">
                    {biz.logo_url ? (
                      <img
                        src={biz.logo_url}
                        alt={getBusinessName(biz)}
                        onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] object-cover cursor-pointer hover:opacity-80 shrink-0 rounded-xl"
                      />
                    ) : (
                      <div
                        onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                        className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl"
                      >
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight truncate mb-1">{getBusinessName(biz)}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{getContactName(biz)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{getContactEmail(biz)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 ml-8">
                  {biz.phone_number && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="truncate">{biz.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <Briefcase className="w-3 h-3 shrink-0" />
                    <span className="truncate">{biz.industry || biz.sector || "—"}</span>
                  </div>
                  {(biz.city || biz.location) && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{biz.city || biz.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-3 ml-8">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                    status === "approved" || status === "active" ? "bg-green-100 text-green-700" :
                    status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {status}
                  </span>
                  <span className={`text-[9px] px-2 py-1 rounded-full ${
                    verificationStatus === "verified" ? "bg-blue-100 text-blue-700" :
                    verificationStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {verificationStatus}
                  </span>
                </div>

                {biz.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 ml-8">{biz.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                  <button
                    onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                    className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                  
                  {filter === "pending" && (
                    <>
                      <button
                        onClick={() => updateBusinessStatus(biz.id, "approved")}
                        className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => updateBusinessStatus(biz.id, "rejected")}
                        className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  
                  {filter !== "pending" && (
                    <button
                      onClick={() => deleteBusiness(biz.id)}
                      className="col-span-2 border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showDetailModal && selectedBusiness && (
        <BusinessDetailModal business={selectedBusiness} onClose={() => setShowDetailModal(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPAIGNS TAB - With Selection
// ─────────────────────────────────────────────

function AdminCampaigns({ 
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading
}: { 
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
}) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_review" | "active" | "completed" | "rejected" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      let query = supabase.from("campaigns").select(`*, businesses (id, business_name, logo_url)`).order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      const { data, error } = await query;
      if (error) { toast.error("Failed to load campaigns"); } else { setCampaigns(data || []); }
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, [filter, searchTerm]);

  const updateCampaignStatus = async (id: string, newStatus: "active" | "rejected" | "completed", notes?: string) => {
    const updates: any = { 
      status: newStatus, 
      admin_notes: notes || null,
      ...(newStatus === 'active' ? { approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}),
      ...(newStatus === 'rejected' ? { rejected_at: new Date().toISOString() } : {}),
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
    };
    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update campaign"); return; }
    toast.success(`Campaign ${newStatus}`); fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) { toast.error("Failed to delete campaign"); return; }
    toast.success("Campaign deleted"); fetchCampaigns();
  };

  const getCampaignName = (c: any) => c.name || c.title || "Unnamed Campaign";
  const getBusinessName = (b: any) => b?.business_name || b?.name || "Unknown Business";
  const getPrice = (c: any) => c.pay_rate ?? c.bid_amount ?? c.budget ?? 0;

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Campaigns</h3>
        
        {/* Bulk action bar when items are selected */}
        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">
              {selectedItems.length} campaign{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onApproveSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={onRejectSelected}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </button>
              <button
                onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "completed", "rejected", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">
              Filter: {filter === "all" ? "All Campaigns" : filter.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-400">({filteredCampaigns.length})</span>
            {filter === "pending_review" && (
              <button
                onClick={() => {
                  if (filteredCampaigns.length > 0) {
                    onToggleSelectAll(filteredCampaigns);
                  }
                }}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline"
              >
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((camp) => {
            const biz = camp.businesses;
            const price = getPrice(camp);
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(camp.id) 
                    ? 'border-[#389C9A] bg-[#389C9A]/5' 
                    : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}
              >
                {/* Selection checkbox */}
                <div className="flex items-start gap-3 mb-3">
                  <button
                    onClick={() => onToggleSelect(camp.id)}
                    className="mt-1"
                  >
                    {selectedItems.includes(camp.id) ? (
                      <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-3 flex-1">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-12 h-12 border-2 border-[#1D1D1D] object-cover shrink-0 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center shrink-0 rounded-xl">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight truncate">{getCampaignName(camp)}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{getBusinessName(biz)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 ml-8">
                  <span className="text-[9px] capitalize bg-gray-100 px-3 py-1 rounded-full">
                    {camp.type?.replace("_", " ") || "Standard"}
                  </span>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                    camp.status === "active" ? "bg-green-100 text-green-700" :
                    camp.status === "completed" ? "bg-blue-100 text-blue-700" :
                    camp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {camp.status?.replace("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-3 ml-8">
                  <p className="font-black text-lg text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                  <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                </div>

                {camp.admin_notes && (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl ml-8">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1">Admin Notes:</p>
                    <p className="text-xs text-gray-700">{camp.admin_notes}</p>
                  </div>
                )}

                {filter === "pending_review" && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button
                      onClick={() => deleteCampaign(camp.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {filter === "active" && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "completed")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg col-span-1"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg col-span-1"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATOR DETAIL MODAL
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose }: { creator: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Creator Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.full_name} className="w-20 h-20 border-2 border-[#1D1D1D] object-cover rounded-xl" />
            ) : (
              <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center rounded-xl">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-black uppercase tracking-tight">{creator.full_name || creator.username}</h2>
              <p className="text-sm text-gray-500 mb-2">{creator.email}</p>
              <div className="flex flex-wrap gap-2">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full ${
                  creator.status === "active" ? "bg-green-100 text-green-700" :
                  creator.status === "suspended" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {creator.status}
                </span>
                {creator.verified && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Verified</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Followers", value: creator.followers?.toLocaleString() || "0" },
              { label: "Avg Viewers", value: creator.avg_viewers?.toLocaleString() || "0" },
              { label: "Rate", value: creator.rate ? `₦${creator.rate}` : "—" },
            ].map((s, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 text-center rounded-xl">
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[8px] uppercase tracking-widest opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          {creator.platforms?.length > 0 && (
            <div>
              <h4 className="font-black text-xs mb-3 uppercase tracking-widest">Connected Platforms</h4>
              <div className="space-y-2">
                {creator.platforms.map((p: any, idx: number) => (
                  <div key={idx} className="border-2 border-[#1D1D1D] px-4 py-3 flex justify-between items-center rounded-xl">
                    <div>
                      <p className="font-black text-sm">{p.platform_type || p.platform}</p>
                      <p className="text-[9px] text-gray-500">@{p.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{(p.followers_count || p.followers)?.toLocaleString()}</p>
                      <p className="text-[8px] opacity-60">followers</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {creator.bio && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">Bio</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{creator.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Location", value: creator.location || creator.city || "Not specified" },
              { label: "Joined", value: new Date(creator.created_at).toLocaleDateString() },
              { label: "Category", value: creator.niche || creator.category || "General" },
              { label: "User ID", value: (creator.user_id || creator.id)?.slice(0, 12), mono: true },
            ].map((item, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">{item.label}</p>
                <p className={`text-xs ${item.mono ? "font-mono" : "font-medium"}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl"
            >
              Close
            </button>
            <button
              onClick={() => toast.info("Messaging feature coming soon")}
              className="flex-1 bg-[#1D1D1D] text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-xl"
            >
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS DETAIL MODAL
// ─────────────────────────────────────────────

function BusinessDetailModal({ business, onClose }: { business: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Business Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.business_name} className="w-20 h-20 border-2 border-[#1D1D1D] object-cover rounded-xl" />
            ) : (
              <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center rounded-xl">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-black uppercase tracking-tight">{business.business_name || business.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{business.email}</p>
              <div className="flex flex-wrap gap-2">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full ${
                  (business.application_status === "approved" || business.status === "active") ? "bg-green-100 text-green-700" :
                  (business.application_status === "rejected" || business.status === "rejected") ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {business.application_status || business.status}
                </span>
                <span className={`text-[9px] px-3 py-1 rounded-full ${
                  business.verification_status === "verified" ? "bg-blue-100 text-blue-700" :
                  business.verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                }`}>
                  {business.verification_status || "pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Contact Person", value: business.full_name || "—" },
              { label: "Phone", value: business.phone_number || "—" },
              { label: "Industry", value: business.industry || business.sector || "—" },
              { label: "Location", value: `${business.city || business.location || "—"}${business.country ? `, ${business.country}` : ""}` },
              { label: "Joined", value: new Date(business.created_at).toLocaleDateString() },
            ].map((item, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">{item.label}</p>
                <p className="font-black text-sm">{item.value}</p>
              </div>
            ))}
            {business.website && (
              <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Website</p>
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-black truncate block">
                  {business.website}
                </a>
              </div>
            )}
          </div>

          {business.description && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">About</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{business.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Campaigns", value: "0" }, { label: "Spent", value: "₦0" }, { label: "Reviews", value: "0" }].map((s, i) => (
              <div key={i} className="border-2 border-[#1D1D1D] p-3 text-center rounded-xl">
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[8px] uppercase tracking-widest opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl"
            >
              Close
            </button>
            <button
              onClick={() => toast.info("Messaging feature coming soon")}
              className="flex-1 bg-[#1D1D1D] text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-xl"
            >
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPORT TAB
// ─────────────────────────────────────────────

function AdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "all">("open");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Check if table exists before querying
      try {
        let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
        if (filter !== "all") query = query.eq("status", filter);
        const { data, error } = await query;
        if (error) {
          if (error.code === '42P01') {
            console.log("support_tickets table doesn't exist yet");
            setTickets([]);
          } else {
            toast.error("Failed to load tickets");
          }
        } else {
          setTickets(data || []);
        }
      } catch (e) {
        console.log("support_tickets table not available:", e);
        setTickets([]);
      }
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const updateTicketStatus = async (id: string, status: "resolved" | "in_progress", reply?: string) => {
    try {
      const updates: any = { status };
      if (reply) updates.admin_reply = reply;
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
      if (error) { toast.error("Failed to update ticket"); return; }
      toast.success(`Ticket ${status}`); fetchTickets();
      setReplyText(prev => ({ ...prev, [id]: "" }));
    } catch (e) {
      console.error("Error updating ticket:", e);
      toast.error("Failed to update ticket");
    }
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Support Tickets</h3>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
        >
          <Filter className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">
            Filter: {filter === "all" ? "All Tickets" : filter.replace("_", " ")}
          </span>
        </button>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["open", "in_progress", "resolved", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-4 transition-all rounded-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-[#F4F4F4] px-2 py-1 rounded-full">
                      {ticket.category || "General"}
                    </span>
                    <span className="text-[8px] text-gray-400">#{ticket.id.slice(0, 8)}</span>
                  </div>
                  {ticket.subject && (
                    <h4 className="font-black text-sm mb-2">{ticket.subject}</h4>
                  )}
                  <p className="text-sm text-[#1D1D1D] mb-3">{ticket.message}</p>
                  <p className="text-[8px] text-gray-400">
                    From: {ticket.user_email || ticket.user_id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
                  ticket.status === "open" ? "bg-yellow-100 text-yellow-700" :
                  ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                }`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              {ticket.admin_reply && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1">Admin Reply:</p>
                  <p className="text-xs text-gray-700">{ticket.admin_reply}</p>
                </div>
              )}

              {filter !== "resolved" && (
                <div className="mt-3">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText[ticket.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm mb-2 rounded-xl"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    {filter === "open" && (
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                        className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg"
                      >
                        In Progress
                      </button>
                    )}
                    <button
                      onClick={() => updateTicketStatus(ticket.id, "resolved", replyText[ticket.id])}
                      disabled={!replyText[ticket.id]?.trim()}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reply & Resolve
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS TAB - Mobile First
// ─────────────────────────────────────────────

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");
  const [showFilters, setShowFilters] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Check if table exists before querying
      try {
        let query = supabase.from("reported_content").select("*").order("created_at", { ascending: false });
        if (filter !== "all") query = query.eq("status", filter);
        const { data, error } = await query;
        if (error) {
          if (error.code === '42P01') {
            console.log("reported_content table doesn't exist yet");
            setReports([]);
          } else {
            toast.error("Failed to load reports");
          }
        } else {
          setReports(data || []);
        }
      } catch (e) {
        console.log("reported_content table not available:", e);
        setReports([]);
      }
    } catch { toast.error("Failed to load reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const updateReportStatus = async (id: string, status: "resolved" | "dismissed") => {
    try {
      const { error } = await supabase.from("reported_content").update({ status }).eq("id", id);
      if (error) { toast.error("Failed to update report"); return; }
      toast.success(`Report ${status}`); fetchReports();
    } catch (e) {
      console.error("Error updating report:", e);
      toast.error("Failed to update report");
    }
  };

  const deleteReportedContent = async (contentType: string, contentId: string, reportId: string) => {
    if (!confirm(`Delete this ${contentType}?`)) return;
    let error;
    if (contentType === "campaign") ({ error } = await supabase.from("campaigns").delete().eq("id", contentId));
    else if (contentType === "message") ({ error } = await supabase.from("messages").delete().eq("id", contentId));
    else if (contentType === "profile") ({ error } = await supabase.from("creator_profiles").delete().eq("id", contentId));
    if (error) { toast.error("Failed to delete content"); return; }
    await updateReportStatus(reportId, "resolved");
    toast.success("Content deleted and report resolved");
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Reported Content</h3>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
        >
          <Filter className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">
            Filter: {filter === "all" ? "All Reports" : filter}
          </span>
        </button>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending", "resolved", "dismissed", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab 
                    ? "bg-[#1D1D1D] text-white" 
                    : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] p-4 transition-all rounded-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {report.content_type}
                    </span>
                    <span className="text-[8px] text-gray-400">#{report.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm font-medium mb-2">Reason: {report.reason}</p>
                  <p className="text-xs text-gray-500 mb-2">Content ID: {report.content_id}</p>
                  {report.details && (
                    <pre className="text-[8px] bg-gray-50 p-2 rounded-xl mb-2 overflow-x-auto max-h-24">
                      {JSON.stringify(report.details, null, 2)}
                    </pre>
                  )}
                  <p className="text-[8px] text-gray-400">
                    Reported by: {report.reported_by} · {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
                  report.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  report.status === "resolved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                }`}>
                  {report.status}
                </span>
              </div>

              {filter === "pending" && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5">
                  <button
                    onClick={() => deleteReportedContent(report.content_type, report.content_id, report.id)}
                    className="bg-red-500 text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors rounded-lg flex items-center justify-center gap-1 col-span-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, "resolved")}
                    className="bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1 col-span-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Keep
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, "dismissed")}
                    className="border-2 border-gray-500 text-gray-500 py-2 text-[8px] font-black uppercase tracking-widest hover:bg-gray-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1 col-span-1"
                  >
                    <XCircle className="w-3 h-3" /> Dismiss
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

// ─────────────────────────────────────────────
// TRANSACTIONS TAB - Mobile First
// ─────────────────────────────────────────────

function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "payment" | "withdrawal" | "refund">("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase.from("business_transactions").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("type", filter);
      const now = new Date();
      if (dateRange === "today") query = query.gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString());
      else if (dateRange === "week") query = query.gte("created_at", new Date(now.setDate(now.getDate() - 7)).toISOString());
      else if (dateRange === "month") query = query.gte("created_at", new Date(now.setMonth(now.getMonth() - 1)).toISOString());
      const { data, error } = await query;
      if (error) { toast.error("Failed to load transactions"); } else { setTransactions(data || []); }
    } catch { toast.error("Failed to load transactions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, [filter, dateRange]);

  const getTotalAmount = () => transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const getCompletedCount = () => transactions.filter(t => t.status === "completed").length;

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Transactions</h3>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl"
        >
          <Filter className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Filter Transactions</span>
        </button>

        {showFilters && (
          <div className="space-y-3 p-3 bg-[#F8F8F8] rounded-xl">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2">Type</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-xs rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="payment">Payments</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="refund">Refunds</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-xs rounded-lg"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="bg-[#1D1D1D] text-white p-4 rounded-xl">
          <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">Total Volume</p>
          <p className="text-2xl font-black">₦{getTotalAmount().toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-[#1D1D1D] p-4 rounded-xl">
            <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">Transactions</p>
            <p className="text-2xl font-black">{transactions.length}</p>
          </div>
          <div className="border-2 border-[#1D1D1D] p-4 rounded-xl">
            <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">Completed</p>
            <p className="text-2xl font-black">{getCompletedCount()}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-[#1D1D1D]/10 p-3 rounded-xl"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                    tx.type === "payment" ? "bg-green-100 text-green-700" :
                    tx.type === "withdrawal" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {tx.type}
                  </span>
                  <p className="text-[9px] font-mono text-gray-500 mt-1">#{tx.id.slice(0, 8)}</p>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                  tx.status === "completed" ? "bg-green-100 text-green-700" :
                  tx.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {tx.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <p className="font-black text-lg text-[#389C9A]">₦{tx.amount?.toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS TAB - Mobile First
// ─────────────────────────────────────────────

function AdminSettings({ stats, setStats }: { stats: DashboardStats; setStats: any }) {
  const [platformSettings, setPlatformSettings] = useState({
    platformFee: stats.platformFee,
    minPayout: 1000,
    maxCampaignDuration: 30,
    autoApproveCreators: false,
    requireBusinessVerification: true,
    allowGuestBrowsing: true,
    maintenanceMode: false,
    requireEmailVerification: true,
  });

  const handleSaveSettings = () => {
    setStats((prev: DashboardStats) => ({ ...prev, platformFee: platformSettings.platformFee }));
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-4">
      {/* Fee Settings */}
      <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-4">Fee Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Platform Fee (%)</label>
            <input
              type="number"
              value={platformSettings.platformFee}
              onChange={(e) => setPlatformSettings(prev => ({ ...prev, platformFee: parseInt(e.target.value) }))}
              className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors rounded-xl"
              min="0"
              max="100"
            />
            <p className="text-[9px] text-gray-500 mt-1">% taken from each transaction</p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Minimum Payout (₦)</label>
            <input
              type="number"
              value={platformSettings.minPayout}
              onChange={(e) => setPlatformSettings(prev => ({ ...prev, minPayout: parseInt(e.target.value) }))}
              className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors rounded-xl"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Campaign Settings */}
      <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-4">Campaign Settings</h4>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Max Campaign Duration (days)</label>
          <input
            type="number"
            value={platformSettings.maxCampaignDuration}
            onChange={(e) => setPlatformSettings(prev => ({ ...prev, maxCampaignDuration: parseInt(e.target.value) }))}
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors rounded-xl"
            min="1"
          />
        </div>
      </div>

      {/* Approval & System Settings */}
      <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-4">Approval & System</h4>
        <div className="space-y-2">
          {[
            { key: "autoApproveCreators", label: "Auto-approve creators" },
            { key: "requireBusinessVerification", label: "Require business verification" },
            { key: "requireEmailVerification", label: "Require email verification" },
            { key: "allowGuestBrowsing", label: "Allow guest browsing" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer p-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
              <input
                type="checkbox"
                checked={(platformSettings as any)[key]}
                onChange={(e) => setPlatformSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                className="w-5 h-5"
              />
              <span className="text-xs font-black uppercase tracking-widest">{label}</span>
            </label>
          ))}
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-red-200 hover:border-red-500 transition-colors bg-red-50 rounded-xl">
            <input
              type="checkbox"
              checked={platformSettings.maintenanceMode}
              onChange={(e) => setPlatformSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
              className="w-5 h-5"
            />
            <span className="text-xs font-black uppercase tracking-widest text-red-600">Maintenance Mode</span>
          </label>
        </div>
      </div>

      {/* Current Config Summary */}
      <div className="bg-[#1D1D1D] text-white p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-3 opacity-60">Current Config</h4>
        <div className="space-y-2">
          {[
            { label: "Platform Fee", value: `${platformSettings.platformFee}%` },
            { label: "Min Payout", value: `₦${platformSettings.minPayout.toLocaleString()}` },
            { label: "Max Campaign", value: `${platformSettings.maxCampaignDuration} days` },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
              <span className="text-[9px] uppercase tracking-widest opacity-50">{item.label}</span>
              <span className="font-black text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        className="w-full bg-[#1D1D1D] text-white px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-xl"
      >
        Save Settings
      </button>
    </div>
  );
}

export { AdminDashboard as AdminDashboardScreen };
export default AdminDashboard;
