import React, { useState, useEffect, useRef } from "react";
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
  MessageSquare,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download as DownloadIcon,
  Reply,
  MoreVertical,
  CheckCheck,
  ChevronRight,
  AtSign,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business";
  last_message: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
  status?: "active" | "pending" | "blocked";
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: "admin" | "creator" | "business";
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  attachments?: {
    url: string;
    type: string;
    name: string;
    size?: number;
  }[];
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  business_name?: string;
  avatar_url?: string;
  logo_url?: string;
  email: string;
  type: "creator" | "business";
  status: string;
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
    "overview" | "creators" | "businesses" | "campaigns" | "messages" | "support" | "reports" | "transactions" | "settings"
  >("overview");
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // State for data fetching
  const [creators, setCreators] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

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

  // Helper function to check if table exists
  const checkTableExists = async (tableName: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // ─── FETCH FUNCTIONS ───────────────────────────────────────────────────

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error("Error fetching creators:", error);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`*, businesses (id, business_name, logo_url)`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  // ─── CHECK ADMIN ACCESS ──────────────────────────────────────────────

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          await supabase.auth.signOut();
          toast.error("Session expired. Please log in again.");
          navigate("/login/portal");
          return;
        }

        const user = session.user;
        setAdminUser(user);

        const isAdmin =
          user.user_metadata?.role === "admin" ||
          user.user_metadata?.user_type === "admin" ||
          user.user_metadata?.is_admin === true ||
          user.email === "admin@livelink.com";

        if (!isAdmin) {
          toast.error("Unauthorized access");
          await supabase.auth.signOut();
          navigate("/login/portal");
          return;
        }

        await Promise.all([
          fetchDashboardData(),
          fetchCreators(),
          fetchBusinesses(),
          fetchCampaigns()
        ]);
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

      let totalBusinesses = 0, pendingBusinesses = 0, approvedBusinesses = 0, rejectedBusinesses = 0;
      try {
        const { count: total } = await supabase.from("businesses").select("*", { count: "exact", head: true }).neq("status", "deleted");
        totalBusinesses = total || 0;
        const { count: pending } = await supabase.from("businesses").select("*", { count: "exact", head: true }).or(`application_status.eq.pending,status.eq.pending_verification,status.eq.pending`);
        pendingBusinesses = pending || 0;
        const { count: approved } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved");
        approvedBusinesses = approved || 0;
        const { count: rejected } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "rejected");
        rejectedBusinesses = rejected || 0;
      } catch (e) { console.error("Business stats error:", e); }

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

      let totalRevenue = 0;
      try {
        const { data: txRows, error: txError } = await supabase
          .from("business_transactions")
          .select("amount")
          .eq("status", "completed")
          .eq("type", "payment");
        if (!txError) totalRevenue = (txRows || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      } catch (e) { console.error("Revenue fetch error:", e); }

      let pendingPayouts = 0;
      try {
        const { data: ccRows, error: ccError } = await supabase
          .from("campaign_creators")
          .select("total_earnings, paid_out")
          .eq("status", "active");
        if (!ccError) {
          const totalEarnings = (ccRows || []).reduce((s: number, r: any) => s + (r.total_earnings || 0), 0);
          const totalPaid = (ccRows || []).reduce((s: number, r: any) => s + (r.paid_out || 0), 0);
          pendingPayouts = totalEarnings - totalPaid;
        }
      } catch (e) { console.error("Payout fetch error:", e); }

      let totalUsers = 0;
      try {
        const { count: creatorCount } = await supabase.from("creator_profiles").select("*", { count: "exact", head: true });
        const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true });
        totalUsers = (creatorCount || 0) + (bizCount || 0);
      } catch (e) { console.error("User count error:", e); }

      let reportedContent = 0;
      try {
        const reportsExists = await checkTableExists('reported_content');
        if (reportsExists) {
          const { count, error: rcError } = await supabase
            .from("reported_content")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");
          if (!rcError) reportedContent = count || 0;
        }
      } catch (e) { console.log("reported_content table not available:", e); }

      let openSupportTickets = 0;
      try {
        const supportExists = await checkTableExists('support_tickets');
        if (supportExists) {
          const { count, error: stError } = await supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .in("status", ["open", "in_progress"]);
          if (!stError) openSupportTickets = count || 0;
        }
      } catch (e) { console.log("support_tickets table not available:", e); }

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

  // ─── HELPERS ─────────────────────────────────────────────────────────

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
      const { error } = await supabase.from("admin_actions").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: actionType,
        resource_type: resourceType,
        details,
        created_at: new Date().toISOString()
      });
      if (error) console.warn("Admin action log skipped:", error.message);
    } catch (error) {
      console.warn("Admin action log error:", error);
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

  // ─── BULK ACTIONS ────────────────────────────────────────────────────

  const approveAllBusinesses = async () => {
    if (!confirm(`Approve ${stats.pendingBusinesses} pending business applications?`)) return;
    setActionLoading(true);
    try {
      const { data: pendingBiz, error: fetchError } = await supabase
        .from("businesses").select("id, user_id, email, business_name")
        .or(`application_status.eq.pending,status.eq.pending_verification,status.eq.pending`);
      
      if (fetchError) throw fetchError;
      if (!pendingBiz || pendingBiz.length === 0) { 
        toast.info("No pending businesses to approve"); 
        return; 
      }

      const { error: updateError } = await supabase
        .from("businesses")
        .update({ 
          application_status: "approved", 
          status: "approved",
          verification_status: "verified", 
          approved_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .or(`application_status.eq.pending,status.eq.pending_verification,status.eq.pending`);
      
      if (updateError) throw updateError;

      for (const business of pendingBiz) {
        if (business.user_id) {
          try {
            const metadata = await getUserMetadata(business.user_id);
            await supabase.auth.admin.updateUserById(business.user_id, {
              user_metadata: { ...metadata, business_approved: true, approved_at: new Date().toISOString() }
            });
            await sendApprovalNotification(business.user_id, 'business', business.business_name || 'Your business');
          } catch (err) { 
            console.error(`Error updating user ${business.user_id}:`, err); 
          }
        }
      }

      await logAdminAction("BULK_APPROVE", "businesses", { count: pendingBiz.length, business_ids: pendingBiz.map((b: any) => b.id) });
      toast.success(`✅ Approved ${pendingBiz.length} businesses`);
      await fetchDashboardData();
      await fetchBusinesses();
      setActiveTab("businesses");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving businesses:", error);
      toast.error(`Failed to approve all businesses: ${error.message}`);
    } finally { 
      setActionLoading(false); 
    }
  };

  const approveAllCreators = async () => {
    if (!confirm(`Approve ${stats.pendingCreators} pending creator applications?`)) return;
    setActionLoading(true);
    try {
      const { data: pendingCreators, error: fetchError } = await supabase
        .from("creator_profiles").select("id, user_id, full_name, email").eq("status", "pending_review");
      if (fetchError) throw fetchError;
      if (!pendingCreators || pendingCreators.length === 0) { toast.info("No pending creators to approve"); return; }

      const { error: updateError } = await supabase.from("creator_profiles")
        .update({ status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("status", "pending_review");
      if (updateError) throw updateError;

      for (const creator of pendingCreators) {
        if (creator.user_id) {
          try {
            const metadata = await getUserMetadata(creator.user_id);
            await supabase.auth.admin.updateUserById(creator.user_id, {
              user_metadata: { ...metadata, creator_approved: true, approved_at: new Date().toISOString() }
            });
            await sendApprovalNotification(creator.user_id, 'creator', creator.full_name || 'Your creator profile');
          } catch (err) { console.error(`Error updating user ${creator.user_id}:`, err); }
        }
      }

      await logAdminAction("BULK_APPROVE", "creators", { count: pendingCreators.length, creator_ids: pendingCreators.map((c: any) => c.id) });
      toast.success(`✅ Approved ${pendingCreators.length} creators`);
      await fetchDashboardData();
      await fetchCreators();
      setActiveTab("creators");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving creators:", error);
      toast.error("Failed to approve all creators");
    } finally { setActionLoading(false); }
  };

  const approveAllCampaigns = async () => {
    if (!confirm(`Approve ${stats.pendingCampaigns} pending campaigns?`)) return;
    setActionLoading(true);
    try {
      const { data: pendingCampaigns, error: fetchError } = await supabase
        .from("campaigns").select("id, business_id, name, title").eq("status", "pending_review");
      if (fetchError) throw fetchError;
      if (!pendingCampaigns || pendingCampaigns.length === 0) { toast.info("No pending campaigns to approve"); return; }

      const { error: updateError } = await supabase.from("campaigns")
        .update({ status: "active", approved_at: new Date().toISOString(), published_at: new Date().toISOString() })
        .eq("status", "pending_review");
      if (updateError) throw updateError;

      for (const campaign of pendingCampaigns) {
        if (campaign.business_id) {
          try {
            const { data: business } = await supabase.from("businesses").select("user_id").eq("id", campaign.business_id).single();
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
          } catch (err) { console.error(`Error notifying business for campaign ${campaign.id}:`, err); }
        }
      }

      await logAdminAction("BULK_APPROVE", "campaigns", { count: pendingCampaigns.length, campaign_ids: pendingCampaigns.map((c: any) => c.id) });
      toast.success(`✅ Approved ${pendingCampaigns.length} campaigns`);
      await fetchDashboardData();
      await fetchCampaigns();
      setActiveTab("campaigns");
      setSelectedItems([]);
    } catch (error) {
      console.error("Error approving campaigns:", error);
      toast.error("Failed to approve all campaigns");
    } finally { setActionLoading(false); }
  };

  const approveSelected = async (type: 'business' | 'creator' | 'campaign') => {
    if (selectedItems.length === 0) { 
      toast.error("No items selected"); 
      return; 
    }
    
    if (!confirm(`Approve ${selectedItems.length} selected ${type}s?`)) return;
    
    setActionLoading(true);
    try {
      const table = type === 'business' ? 'businesses' : type === 'creator' ? 'creator_profiles' : 'campaigns';
      
      let updates: any = { 
        updated_at: new Date().toISOString() 
      };
      
      if (type === 'business') {
        updates = {
          ...updates,
          application_status: 'approved',
          status: 'approved',
          verification_status: 'verified',
          approved_at: new Date().toISOString()
        };
      } else if (type === 'creator') {
        updates = {
          ...updates,
          status: 'active',
          approved_at: new Date().toISOString()
        };
      } else if (type === 'campaign') {
        updates = {
          ...updates,
          status: 'active',
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        };
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .in('id', selectedItems);
      
      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      let items: any[] = [];
      if (type === 'business') {
        const { data } = await supabase
          .from("businesses")
          .select("id, user_id, business_name")
          .in('id', selectedItems);
        items = data || [];
      } else if (type === 'creator') {
        const { data } = await supabase
          .from("creator_profiles")
          .select("id, user_id, full_name")
          .in('id', selectedItems);
        items = data || [];
      } else {
        const { data } = await supabase
          .from("campaigns")
          .select("id, business_id, name")
          .in('id', selectedItems);
        items = data || [];
      }

      for (const item of items) {
        if (type === 'campaign' && item.business_id) {
          const { data: business } = await supabase
            .from("businesses")
            .select("user_id")
            .eq("id", item.business_id)
            .single();
          if (business?.user_id) {
            await sendApprovalNotification(business.user_id, type, item.name || 'Item');
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
      
      if (type === 'business') {
        await fetchBusinesses();
      } else if (type === 'creator') {
        await fetchCreators();
      } else if (type === 'campaign') {
        await fetchCampaigns();
      }
      
    } catch (error: any) {
      console.error("Error approving selected:", error);
      toast.error(`Failed to approve selected ${type}s: ${error.message || 'Unknown error'}`);
    } finally { 
      setActionLoading(false); 
    }
  };

  const rejectSelected = async (type: 'business' | 'creator' | 'campaign') => {
    if (selectedItems.length === 0) { 
      toast.error("No items selected"); 
      return; 
    }
    
    if (!confirm(`Reject ${selectedItems.length} selected ${type}s?`)) return;
    
    setActionLoading(true);
    try {
      const table = type === 'business' ? 'businesses' : type === 'creator' ? 'creator_profiles' : 'campaigns';
      
      let updates: any = { 
        updated_at: new Date().toISOString() 
      };
      
      if (type === 'business') {
        updates = {
          ...updates,
          application_status: 'rejected',
          status: 'rejected',
          verification_status: 'rejected',
          rejected_at: new Date().toISOString()
        };
      } else if (type === 'creator') {
        updates = {
          ...updates,
          status: 'rejected',
          rejected_at: new Date().toISOString()
        };
      } else if (type === 'campaign') {
        updates = {
          ...updates,
          status: 'rejected',
          rejected_at: new Date().toISOString()
        };
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
      
    } catch (error: any) {
      console.error("Error rejecting selected:", error);
      toast.error(`Failed to reject selected ${type}s: ${error.message || 'Unknown error'}`);
    } finally { 
      setActionLoading(false); 
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchCreators(),
      fetchBusinesses(),
      fetchCampaigns()
    ]);
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login/portal");
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.length === items.length) setSelectedItems([]);
    else setSelectedItems(items.map(item => item.id));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", tab: "overview", badge: 0 },
    { icon: Users, label: "Creators", tab: "creators", badge: stats.pendingCreators },
    { icon: Building2, label: "Businesses", tab: "businesses", badge: stats.pendingBusinesses },
    { icon: Megaphone, label: "Campaigns", tab: "campaigns", badge: stats.pendingCampaigns },
    { icon: MessageSquare, label: "Messages", tab: "messages", badge: 0 },
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

      {/* Mobile Header */}
      <div className="bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex justify-between items-center sticky top-0 z-30 lg:hidden">
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
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#1D1D1D]/10 z-50
        flex flex-col transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="px-5 py-4 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-[#F8F8F8] rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

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
      <div className="lg:ml-64 flex-1 p-4 min-h-screen">
        <div className="mb-4">
          <h2 className="font-black uppercase tracking-tight text-xl">
            {navItems.find(n => n.tab === activeTab)?.label || "Overview"}
          </h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-0.5">
            {activeTab === "overview" && "Dashboard overview and statistics"}
            {activeTab === "creators" && "Manage creator applications and profiles"}
            {activeTab === "businesses" && "Review and manage business accounts"}
            {activeTab === "campaigns" && "Oversee all platform campaigns"}
            {activeTab === "messages" && "Message creators and businesses"}
            {activeTab === "support" && "Handle support tickets and inquiries"}
            {activeTab === "reports" && "Review reported content"}
            {activeTab === "transactions" && "Monitor financial transactions"}
            {activeTab === "settings" && "Configure platform settings"}
          </p>
        </div>

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
              creators={creators}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('creator')}
              onRejectSelected={() => rejectSelected('creator')}
              actionLoading={actionLoading}
              onRefresh={fetchCreators}
            />
          )}
          {activeTab === "businesses" && (
            <AdminBusinesses
              businesses={businesses}
              onStatsChange={fetchDashboardData}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('business')}
              onRejectSelected={() => rejectSelected('business')}
              actionLoading={actionLoading}
              onRefresh={fetchBusinesses}
            />
          )}
          {activeTab === "campaigns" && (
            <AdminCampaigns
              campaigns={campaigns}
              selectedItems={selectedItems}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onApproveSelected={() => approveSelected('campaign')}
              onRejectSelected={() => rejectSelected('campaign')}
              actionLoading={actionLoading}
              onRefresh={fetchCampaigns}
            />
          )}
          {activeTab === "messages" && <AdminMessages adminUser={adminUser} />}
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
// OVERVIEW TAB
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1D1D1D] text-white p-5 flex flex-col gap-4 rounded-xl"
      >
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic mb-1">Admin Dashboard</h2>
          <p className="text-white/50 text-xs">Manage creators, businesses, and platform settings</p>
        </div>
        <div className="flex flex-col gap-2">
          {stats.pendingCreators > 0 && (
            <button onClick={onApproveAllCreators} disabled={actionLoading}
              className="w-full px-4 py-3 bg-[#389C9A] text-white text-xs font-black uppercase tracking-widest hover:bg-[#2d7f7d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Creators (${stats.pendingCreators})`}
            </button>
          )}
          {stats.pendingBusinesses > 0 && (
            <button onClick={onApproveAllBusinesses} disabled={actionLoading}
              className="w-full px-4 py-3 bg-[#FEDB71] text-[#1D1D1D] text-xs font-black uppercase tracking-widest hover:bg-[#ffd14d] transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Businesses (${stats.pendingBusinesses})`}
            </button>
          )}
          {stats.pendingCampaigns > 0 && (
            <button onClick={onApproveAllCampaigns} disabled={actionLoading}
              className="w-full px-4 py-3 bg-violet-500 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-600 transition-colors rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? 'Processing...' : `Approve All Campaigns (${stats.pendingCampaigns})`}
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Creators", value: stats.totalCreators, icon: Users, color: "text-blue-500", bg: "bg-blue-50", sub: `${stats.pendingCreators} pending` },
          { label: "Total Businesses", value: stats.totalBusinesses, icon: Building2, color: "text-emerald-500", bg: "bg-emerald-50", sub: `${stats.pendingBusinesses} pending` },
          { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-violet-500", bg: "bg-violet-50", sub: `${stats.pendingCampaigns} pending` },
          { label: "Total Users", value: stats.totalUsers, icon: User, color: "text-orange-500", bg: "bg-orange-50", sub: "registered" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black tracking-tight mb-0.5">{stat.value.toLocaleString()}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
            <p className="text-[8px] text-gray-400">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { label: "Total Revenue", value: `₦${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, sub: "Completed payments", iconBg: "bg-[#389C9A]/10", iconColor: "text-[#389C9A]" },
          { label: "Pending Payouts", value: `₦${stats.pendingPayouts.toLocaleString()}`, icon: TrendingUp, sub: "Not yet paid out", iconBg: "bg-[#FEDB71]/10", iconColor: "text-[#FEDB71]" },
          { label: "Platform Fee", value: `${stats.platformFee}%`, icon: PieChart, sub: "Standard rate", iconBg: "bg-[#389C9A]/10", iconColor: "text-[#389C9A]" },
        ].map((item, i) => (
          <div key={i} className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-sm">{item.label}</h3>
                <p className="text-[8px] opacity-40">{item.sub}</p>
              </div>
            </div>
            <p className="text-3xl font-black italic">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Action Required</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Pending Creators", value: stats.pendingCreators, action: () => onTabChange("creators"), accent: "border-[#FEDB71]", icon: Users, bg: "bg-[#FEDB71]/10" },
            { label: "Pending Businesses", value: stats.pendingBusinesses, action: () => onTabChange("businesses"), accent: "border-[#389C9A]", icon: Building2, bg: "bg-[#389C9A]/10" },
            { label: "Pending Campaigns", value: stats.pendingCampaigns, action: () => onTabChange("campaigns"), accent: "border-violet-400", icon: Megaphone, bg: "bg-violet-50" },
            { label: "Reported Content", value: stats.reportedContent, action: () => onTabChange("reports"), accent: "border-red-400", icon: Flag, bg: "bg-red-50" },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className={`bg-white border-2 ${item.accent} p-4 text-left hover:shadow-md transition-all rounded-xl`}>
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-black italic mb-1">{item.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-tight">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-black uppercase tracking-tight text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Review Creators", icon: Users, action: () => onTabChange("creators"), color: "bg-blue-500" },
            { label: "Review Businesses", icon: Building2, action: () => onTabChange("businesses"), color: "bg-emerald-500" },
            { label: "Messages", icon: MessageSquare, action: () => onTabChange("messages"), color: "bg-[#389C9A]" },
            { label: "View Transactions", icon: CreditCard, action: () => onTabChange("transactions"), color: "bg-violet-500" },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className="bg-white border-2 border-[#1D1D1D] p-4 text-left hover:shadow-md transition-all rounded-xl flex items-center gap-3">
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
// CREATORS TAB
// ─────────────────────────────────────────────

function AdminCreators({
  creators,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading,
  onRefresh
}: {
  creators: any[];
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending_review" | "active" | "suspended" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const updateCreatorStatus = async (id: string, newStatus: "active" | "suspended") => {
    const { error } = await supabase.from("creator_profiles").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update creator status"); return; }
    toast.success(`Creator ${newStatus === "active" ? "approved" : "suspended"}`);
    onRefresh();
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("Delete this creator? This cannot be undone.")) return;
    const { error } = await supabase.from("creator_profiles").delete().eq("id", id);
    if (error) { toast.error("Failed to delete creator"); return; }
    toast.success("Creator deleted");
    onRefresh();
  };

  const getCreatorName = (c: any) => c.full_name || c.username || c.email || "Unnamed Creator";
  const getCreatorEmail = (c: any) => c.email || `${c.username || "creator"}@example.com`;
  const getCreatorJoinDate = (c: any) => c.created_at ? new Date(c.created_at).toLocaleDateString() : "Unknown";

  const filteredCreators = creators.filter(c => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = getCreatorName(c).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getCreatorEmail(c).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Creator Applications</h3>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search creators..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab ? "bg-[#1D1D1D] text-white" : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}>
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">
              Filter: {filter === "all" ? "All" : filter.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-400">({filteredCreators.length})</span>
            {filter === "pending_review" && filteredCreators.length > 0 && (
              <button onClick={() => onToggleSelectAll(filteredCreators)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline">
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {filteredCreators.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No creators found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((creator) => (
            <motion.div key={creator.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-4 transition-all rounded-xl ${
                selectedItems.includes(creator.id) ? 'border-[#389C9A] bg-[#389C9A]/5' : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
              }`}>
              <div className="flex items-start gap-3 mb-3">
                <button onClick={() => onToggleSelect(creator.id)} className="mt-1">
                  {selectedItems.includes(creator.id) ? <CheckSquare className="w-5 h-5 text-[#389C9A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                </button>
                <div className="flex items-center gap-3 flex-1">
                  <div onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                    className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl overflow-hidden">
                    {creator.avatar_url
                      ? <img src={creator.avatar_url} alt={getCreatorName(creator)} className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="font-black text-base uppercase tracking-tight truncate">{getCreatorName(creator)}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{getCreatorEmail(creator)}</span>
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

              <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] ml-8">
                <div className="flex items-center gap-1 text-gray-600"><Calendar className="w-3 h-3 shrink-0" /><span>Joined {getCreatorJoinDate(creator)}</span></div>
              </div>

              {creator.bio && <p className="text-xs text-gray-500 mb-3 line-clamp-2 ml-8">{creator.bio}</p>}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                <button onClick={() => { setSelectedCreator(creator); setShowDetailModal(true); }}
                  className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </button>
                {creator.status === "pending_review" && (<>
                  <button onClick={() => updateCreatorStatus(creator.id, "active")}
                    className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </>)}
                {creator.status === "active" && (<>
                  <button onClick={() => updateCreatorStatus(creator.id, "suspended")}
                    className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg col-span-2">
                    Suspend
                  </button>
                  <button onClick={() => deleteCreator(creator.id)}
                    className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>)}
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
// BUSINESSES TAB
// ─────────────────────────────────────────────

function AdminBusinesses({
  businesses,
  onStatsChange,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading,
  onRefresh
}: {
  businesses: any[];
  onStatsChange?: () => void;
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const updateBusinessStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const updates: any = newStatus === "approved"
      ? { 
          application_status: "approved", 
          status: "approved",
          verification_status: "verified", 
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      : { 
          application_status: "rejected", 
          status: "rejected",
          verification_status: "rejected", 
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
    
    const { error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id);
    
    if (error) { 
      console.error("Update error:", error);
      toast.error(`Failed to update business status: ${error.message}`); 
      return; 
    }
    
    toast.success(`Business ${newStatus}`);
    onRefresh();
    onStatsChange?.();
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm("Delete this business?")) return;
    const { error } = await supabase.from("businesses").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Failed to delete business"); return; }
    toast.success("Business deleted");
    onRefresh();
    onStatsChange?.();
  };

  const getBusinessName = (b: any) => b.business_name || b.name || "Unnamed Business";
  const getContactName = (b: any) => b.full_name || "Unknown";
  const getContactEmail = (b: any) => b.email || "No email";
  const getStatusDisplay = (b: any) => {
    if (b.application_status === "approved" || b.status === "approved") return "approved";
    if (b.application_status === "rejected" || b.status === "rejected") return "rejected";
    if (b.application_status === "pending" || b.status === "pending" || b.status === "pending_verification") return "pending";
    return "pending";
  };

  const filteredBusinesses = businesses.filter(b => {
    const status = getStatusDisplay(b);
    const matchesFilter = filter === "all" || 
                          (filter === "pending" && status === "pending") ||
                          (filter === "approved" && status === "approved") ||
                          (filter === "rejected" && status === "rejected");
    const matchesSearch = getBusinessName(b).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getContactEmail(b).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Business Applications</h3>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search businesses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending", "approved", "rejected", "all"] as const).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab ? "bg-[#1D1D1D] text-white" : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}>
                {tab === "all" ? "All" : tab}
              </button>
            ))}
          </div>
        )}

        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">Filter: {filter}</span>
            <span className="text-xs text-gray-400">({filteredBusinesses.length})</span>
            {filter === "pending" && filteredBusinesses.length > 0 && (
              <button onClick={() => onToggleSelectAll(filteredBusinesses)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline">Select all</button>
            )}
          </div>
        )}
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((biz) => {
            const status = getStatusDisplay(biz);
            return (
              <motion.div key={biz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(biz.id) ? 'border-[#389C9A] bg-[#389C9A]/5' : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}>
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => onToggleSelect(biz.id)} className="mt-1">
                    {selectedItems.includes(biz.id) ? <CheckSquare className="w-5 h-5 text-[#389C9A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-3 flex-1">
                    <div onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                      className="w-14 h-14 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center cursor-pointer hover:bg-gray-200 shrink-0 rounded-xl overflow-hidden">
                      {biz.logo_url
                        ? <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-full h-full object-cover" />
                        : <Building2 className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base uppercase tracking-tight truncate mb-1">{getBusinessName(biz)}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500"><User className="w-3 h-3 shrink-0" /><span className="truncate">{getContactName(biz)}</span></div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{getContactEmail(biz)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-3 ml-8">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                    status === "approved" ? "bg-green-100 text-green-700" :
                    status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{status}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                  <button onClick={() => { setSelectedBusiness(biz); setShowDetailModal(true); }}
                    className="px-3 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  {status === "pending" && (<>
                    <button onClick={() => updateBusinessStatus(biz.id, "approved")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateBusinessStatus(biz.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>)}
                  {status !== "pending" && (
                    <button onClick={() => deleteBusiness(biz.id)}
                      className="col-span-2 border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
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
// CAMPAIGNS TAB
// ─────────────────────────────────────────────

function AdminCampaigns({
  campaigns,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  actionLoading,
  onRefresh
}: {
  campaigns: any[];
  selectedItems: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onApproveSelected: () => Promise<void>;
  onRejectSelected: () => Promise<void>;
  actionLoading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending_review" | "active" | "completed" | "rejected" | "all">("pending_review");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const updateCampaignStatus = async (id: string, newStatus: "active" | "rejected" | "completed") => {
    const updates: any = {
      status: newStatus,
      ...(newStatus === 'active' ? { approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}),
      ...(newStatus === 'rejected' ? { rejected_at: new Date().toISOString() } : {}),
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update campaign"); return; }
    toast.success(`Campaign ${newStatus}`);
    onRefresh();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) { toast.error("Failed to delete campaign"); return; }
    toast.success("Campaign deleted");
    onRefresh();
  };

  const getCampaignName = (c: any) => c.name || c.title || "Unnamed Campaign";
  const getBusinessName = (b: any) => b?.business_name || b?.name || "Unknown Business";
  const getPrice = (c: any) => c.pay_rate ?? c.bid_amount ?? c.budget ?? 0;

  const filteredCampaigns = campaigns.filter(c => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = getCampaignName(c).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getBusinessName(c.businesses).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-4 rounded-xl">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="font-black uppercase tracking-tight text-lg">Campaigns</h3>

        {selectedItems.length > 0 && (
          <div className="bg-[#1D1D1D] text-white p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-black">{selectedItems.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onApproveSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={onRejectSelected} disabled={actionLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
              <button onClick={() => onToggleSelectAll([])}
                className="px-3 py-1.5 border border-white/30 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10">Clear</button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search campaigns..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors text-sm rounded-xl" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#F8F8F8] rounded-xl">
            {(["pending_review", "active", "completed", "rejected", "all"] as const).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors rounded-lg flex-1 ${
                  filter === tab ? "bg-[#1D1D1D] text-white" : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D]/60 hover:text-[#1D1D1D]"
                }`}>
                {tab === "all" ? "All" : tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {!showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#389C9A]">Filter: {filter.replace("_", " ")}</span>
            <span className="text-xs text-gray-400">({filteredCampaigns.length})</span>
            {filter === "pending_review" && filteredCampaigns.length > 0 && (
              <button onClick={() => onToggleSelectAll(filteredCampaigns)}
                className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline">Select all</button>
            )}
          </div>
        )}
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((camp) => {
            const biz = camp.businesses;
            return (
              <motion.div key={camp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 transition-all rounded-xl ${
                  selectedItems.includes(camp.id) ? 'border-[#389C9A] bg-[#389C9A]/5' : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}>
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => onToggleSelect(camp.id)} className="mt-1">
                    {selectedItems.includes(camp.id) ? <CheckSquare className="w-5 h-5 text-[#389C9A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center shrink-0 rounded-xl overflow-hidden">
                      {biz?.logo_url ? <img src={biz.logo_url} alt={getBusinessName(biz)} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight truncate">{getCampaignName(camp)}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{getBusinessName(biz)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 ml-8">
                  <span className="text-[9px] capitalize bg-gray-100 px-3 py-1 rounded-full">{camp.type?.replace("_", " ") || "Standard"}</span>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                    camp.status === "active" ? "bg-green-100 text-green-700" :
                    camp.status === "completed" ? "bg-blue-100 text-blue-700" :
                    camp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{camp.status?.replace("_", " ")}</span>
                </div>

                <div className="flex justify-between items-center mb-3 ml-8">
                  <p className="font-black text-lg text-[#389C9A]">₦{Number(getPrice(camp)).toLocaleString()}</p>
                  <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                </div>

                {filter === "pending_review" && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                    <button onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button onClick={() => deleteCampaign(camp.id)}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {filter === "active" && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1D1D1D]/5 ml-8">
                    <button onClick={() => updateCampaignStatus(camp.id, "completed")}
                      className="bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-lg">Complete</button>
                    <button onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="border-2 border-red-500 text-red-500 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors rounded-lg">Reject</button>
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
// MESSAGES TAB - FULL FEATURED
// ─────────────────────────────────────────────

function AdminMessages({ adminUser }: { adminUser: any }) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "creators" | "businesses">("all");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (adminUser) fetchConversations();
  }, [adminUser]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
      
      const messageSubscription = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          if (newMessage.sender_id !== adminUser?.id) {
            markAsRead(newMessage.id);
          }
        })
        .subscribe();

      return () => {
        messageSubscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, is_read")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const conversationMap = new Map();

      for (const msg of msgs || []) {
        if (!conversationMap.has(msg.conversation_id)) {
          const { data: participants } = await supabase
            .from("conversations")
            .select("participant1_id, participant2_id, participant1_type, participant2_type, last_message_at")
            .eq("id", msg.conversation_id)
            .single();

          if (participants) {
            const otherParticipantId = participants.participant1_id === adminUser?.id
              ? participants.participant2_id
              : participants.participant1_id;
            const otherParticipantType = participants.participant1_id === adminUser?.id
              ? participants.participant2_type
              : participants.participant1_type;

            const table = otherParticipantType === "creator" ? "creator_profiles" : "businesses";
            const selectFields = otherParticipantType === "creator"
              ? "id, full_name, avatar_url, email"
              : "id, business_name, logo_url, email";

            const { data: profile } = await supabase.from(table).select(selectFields).eq("user_id", otherParticipantId).single();
            
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", msg.conversation_id)
              .eq("sender_id", otherParticipantId)
              .eq("is_read", false);

            const profileName = otherParticipantType === "creator"
              ? (profile as any)?.full_name
              : (profile as any)?.business_name;
            const profileAvatar = otherParticipantType === "creator"
              ? (profile as any)?.avatar_url
              : (profile as any)?.logo_url;

            conversationMap.set(msg.conversation_id, {
              id: msg.conversation_id,
              participant_id: otherParticipantId,
              participant_name: profileName || "Unknown User",
              participant_avatar: profileAvatar || "",
              participant_type: otherParticipantType,
              last_message: msg.content,
              last_message_time: participants.last_message_at || msg.created_at,
              last_message_sender: msg.sender_id === adminUser?.id ? "You" : profileName || "Them",
              unread_count: count || 0,
            });
          }
        }
      }

      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", adminUser?.id)
        .eq("is_read", false);
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    setSending(true);
    try {
      const attachmentUrls: any[] = [];

      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileName = `admin/${selectedConversation.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
          attachmentUrls.push({ url: publicUrl, type: file.type, name: file.name, size: file.size });
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: adminUser?.id,
          sender_type: "admin",
          content: messageInput.trim(),
          is_read: false,
          attachments: attachmentUrls,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      setMessages(prev => [...prev, data]);
      setMessageInput("");
      setAttachments([]);

      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message: messageInput.trim(), last_message_time: new Date().toISOString(), last_message_sender: "You" }
            : conv
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const [creators, businesses] = await Promise.all([
        supabase.from("creator_profiles").select("id, user_id, full_name, email, avatar_url, status, created_at")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`).limit(10),
        supabase.from("businesses").select("id, user_id, business_name, email, logo_url, status, created_at")
          .or(`business_name.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`).limit(10)
      ]);

      const results: UserProfile[] = [
        ...(creators.data || []).map((c: any) => ({ 
          id: c.id, 
          user_id: c.user_id, 
          full_name: c.full_name, 
          avatar_url: c.avatar_url, 
          email: c.email, 
          type: "creator" as const, 
          status: c.status, 
          created_at: c.created_at 
        })),
        ...(businesses.data || []).map((b: any) => ({ 
          id: b.id, 
          user_id: b.user_id, 
          business_name: b.business_name, 
          logo_url: b.logo_url, 
          email: b.email, 
          type: "business" as const, 
          status: b.status, 
          created_at: b.created_at 
        }))
      ];
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const startNewConversation = async (user: UserProfile) => {
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant1_id.eq.${adminUser?.id},participant2_id.eq.${user.user_id}),and(participant1_id.eq.${user.user_id},participant2_id.eq.${adminUser?.id})`)
        .maybeSingle();

      if (existing) {
        await fetchConversations();
        const conv = conversations.find(c => c.id === existing.id);
        setSelectedConversation(conv || null);
      } else {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({
            participant1_id: adminUser?.id,
            participant2_id: user.user_id,
            participant1_type: "admin",
            participant2_type: user.type,
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        const newConversation: Conversation = {
          id: newConv.id,
          participant_id: user.user_id,
          participant_name: user.full_name || user.business_name || "Unknown",
          participant_avatar: user.avatar_url || user.logo_url || "",
          participant_type: user.type,
          last_message: "No messages yet",
          last_message_time: newConv.created_at,
          last_message_sender: "",
          unread_count: 0
        };

        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
      }

      setShowUserSearch(false);
      setNewMsgSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "unread") return matchesSearch && conv.unread_count > 0;
    if (filter === "creators") return matchesSearch && conv.participant_type === "creator";
    if (filter === "businesses") return matchesSearch && conv.participant_type === "business";
    return matchesSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] rounded-xl overflow-hidden shadow-lg" style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
      <div className="flex h-full">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-[#1D1D1D]/10 flex flex-col shrink-0 bg-[#FDFDFD]">
          <div className="p-4 border-b border-[#1D1D1D]/10 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase tracking-tight text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#389C9A]" />
                Conversations
              </h3>
              <button 
                onClick={() => setShowUserSearch(true)}
                className="p-2 bg-[#1D1D1D] text-white rounded-lg hover:bg-[#389C9A] transition-all transform hover:scale-105 shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..." 
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm bg-white transition-colors"
              />
            </div>

            <div className="flex gap-1.5">
              {(["all", "unread", "creators", "businesses"] as const).map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    filter === f 
                      ? "bg-[#1D1D1D] text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "unread" ? "Unread" : f === "creators" ? "Creators" : "Business"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-xs text-gray-500 mb-3">No conversations yet</p>
                <button 
                  onClick={() => setShowUserSearch(true)}
                  className="text-[#389C9A] text-[10px] font-black hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Start a conversation
                </button>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button 
                  key={conv.id} 
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 border-b border-[#1D1D1D]/10 hover:bg-gray-50 transition-all text-left ${
                    selectedConversation?.id === conv.id ? 'bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    {conv.participant_avatar ? (
                      <img 
                        src={conv.participant_avatar} 
                        className="w-12 h-12 rounded-full border-2 border-[#1D1D1D]/10 object-cover" 
                        alt={conv.participant_name}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shadow-md">
                        {getInitials(conv.participant_name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                      conv.participant_type === 'creator' ? 'bg-[#389C9A]' : 'bg-[#FEDB71]'
                    }`}>
                      {conv.participant_type === 'creator'
                        ? <User className="w-2 h-2 text-white" />
                        : <Building2 className="w-2 h-2 text-[#1D1D1D]" />
                      }
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-black text-sm truncate ${conv.unread_count > 0 ? 'text-[#1D1D1D]' : 'text-gray-600'}`}>
                        {conv.participant_name}
                      </h4>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap ml-2">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      <span className="font-medium">{conv.last_message_sender}: </span>
                      {conv.last_message.length > 50 ? conv.last_message.substring(0, 50) + '...' : conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#389C9A] text-white text-[9px] font-black rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {selectedConversation.participant_avatar ? (
                    <img 
                      src={selectedConversation.participant_avatar} 
                      className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover" 
                      alt={selectedConversation.participant_name}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
                      {getInitials(selectedConversation.participant_name)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-base">{selectedConversation.participant_name}</h3>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {selectedConversation.participant_type}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9]"
                style={{ scrollBehavior: 'smooth' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-400">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_id === adminUser?.id;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isAdmin
                              ? 'bg-[#389C9A] text-white rounded-tr-none'
                              : 'bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D] rounded-tl-none'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                                      isAdmin ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    {att.type.startsWith('image/')
                                      ? <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                      : <FileText className="w-3.5 h-3.5 shrink-0" />
                                    }
                                    <span className="truncate flex-1 text-[10px] font-medium">{att.name}</span>
                                    <DownloadIcon className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 text-[9px] text-gray-400 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isAdmin && (
                              <span className="flex items-center gap-0.5">
                                {msg.is_read ? (
                                  <><CheckCheck className="w-3 h-3 text-[#389C9A]" /><span>Read</span></>
                                ) : (
                                  <><CheckCheck className="w-3 h-3" /><span>Sent</span></>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[#1D1D1D]/10 bg-white">
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2"
                    >
                      {attachments.map((file, index) => (
                        <div key={index} className="relative shrink-0 group">
                          {file.type.startsWith('image/') ? (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded-lg border-2 border-[#1D1D1D]/10"
                              />
                              <button
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative w-16 h-16 bg-gray-100 rounded-lg border-2 border-[#1D1D1D]/10 flex flex-col items-center justify-center p-2 group">
                              <FileText className="w-6 h-6 text-gray-400 mb-1" />
                              <p className="text-[7px] truncate w-full text-center">{file.name.substring(0, 10)}</p>
                              <button
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    id="admin-file-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="admin-file-upload"
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </label>

                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm resize-none max-h-32"
                    rows={Math.min(3, messageInput.split('\n').length)}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                    className={`p-2.5 rounded-xl transition-all ${
                      messageInput.trim() || attachments.length > 0
                        ? 'bg-[#1D1D1D] text-white hover:bg-[#389C9A]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                
                <p className="text-center text-[8px] text-gray-400 mt-2">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Shift + Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tighter italic mb-2">No Conversation Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Select a conversation from the sidebar or start a new one to message creators and businesses.
              </p>
              <button 
                onClick={() => setShowUserSearch(true)}
                className="mt-6 px-6 py-3 bg-[#1D1D1D] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showUserSearch && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
              onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white p-6 z-50 rounded-2xl shadow-2xl border-2 border-[#1D1D1D]"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#389C9A]" />
                  New Message
                </h3>
                <button 
                  onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={newMsgSearch}
                  onChange={(e) => { setNewMsgSearch(e.target.value); searchUsers(e.target.value); }}
                  placeholder="Search creators or businesses by name or email..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                  autoFocus
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <button 
                        key={user.id} 
                        onClick={() => startNewConversation(user)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-[#1D1D1D]/10"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                          {getInitials(user.full_name || user.business_name || "")}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm uppercase tracking-tight">
                            {user.full_name || user.business_name}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              {user.type === 'creator' 
                                ? <><User className="w-2.5 h-2.5" /> Creator</>
                                : <><Building2 className="w-2.5 h-2.5" /> Business</>
                              }
                            </span>
                            <span>•</span>
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#389C9A] transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : newMsgSearch ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Start typing to search</p>
                    <p className="text-xs text-gray-400 mt-1">Search creators or businesses by name or email</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#1D1D1D]/10">
                <button 
                  onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="w-full px-4 py-2.5 border-2 border-[#1D1D1D] text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPORT TAB
// ─────────────────────────────────────────────

function AdminSupport() {
  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-8 text-center rounded-xl">
      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-black uppercase tracking-tight mb-2">Support Tickets</h3>
      <p className="text-gray-500 mb-4">Support ticket system coming soon</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────

function AdminReports() {
  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-8 text-center rounded-xl">
      <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-black uppercase tracking-tight mb-2">Reported Content</h3>
      <p className="text-gray-500 mb-4">Content moderation system coming soon</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRANSACTIONS TAB
// ─────────────────────────────────────────────

function AdminTransactions() {
  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-8 text-center rounded-xl">
      <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-black uppercase tracking-tight mb-2">Transactions</h3>
      <p className="text-gray-500 mb-4">Transaction history coming soon</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────

function AdminSettings({ stats, setStats }: { stats: DashboardStats; setStats: any }) {
  const [platformFee, setPlatformFee] = useState(stats.platformFee);

  const handleSaveSettings = () => {
    setStats((prev: DashboardStats) => ({ ...prev, platformFee }));
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-[#1D1D1D] p-5 rounded-xl">
        <h4 className="font-black text-base uppercase tracking-tight mb-4">Fee Settings</h4>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Platform Fee (%)</label>
          <input type="number" value={platformFee}
            onChange={(e) => setPlatformFee(parseInt(e.target.value))}
            className="w-full p-3 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none transition-colors rounded-xl" min="0" max="100" />
        </div>
      </div>

      <button onClick={handleSaveSettings}
        className="w-full bg-[#1D1D1D] text-white px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors rounded-xl">
        Save Settings
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────

function CreatorDetailModal({ creator, onClose }: { creator: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Creator Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center rounded-xl overflow-hidden">
              {creator.avatar_url
                ? <img src={creator.avatar_url} alt={creator.full_name} className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-gray-400" />}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black uppercase tracking-tight">{creator.full_name || creator.username}</h2>
              <p className="text-sm text-gray-500 mb-2">{creator.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Joined</p>
              <p className="text-xs">{new Date(creator.created_at).toLocaleDateString()}</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Status</p>
              <p className="text-xs capitalize">{creator.status}</p>
            </div>
          </div>

          {creator.bio && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">Bio</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{creator.bio}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BusinessDetailModal({ business, onClose }: { business: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-[#1D1D1D]/10 px-5 py-4 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tight text-lg">Business Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F8F8] rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center rounded-xl overflow-hidden">
              {business.logo_url
                ? <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
                : <Building2 className="w-8 h-8 text-gray-400" />}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black uppercase tracking-tight">{business.business_name}</h2>
              <p className="text-sm text-gray-500 mb-2">{business.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Contact Person</p>
              <p className="text-xs">{business.full_name || "—"}</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Phone</p>
              <p className="text-xs">{business.phone_number || "—"}</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Industry</p>
              <p className="text-xs">{business.industry || "—"}</p>
            </div>
            <div className="border-2 border-[#1D1D1D] p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Location</p>
              <p className="text-xs">{business.city || "—"}{business.country ? `, ${business.country}` : ""}</p>
            </div>
          </div>

          {business.description && (
            <div>
              <h4 className="font-black text-xs mb-2 uppercase tracking-widest">About</h4>
              <p className="text-sm text-gray-700 bg-[#F8F8F8] p-4 rounded-xl">{business.description}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border-2 border-[#1D1D1D] py-3 text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AdminDashboard;
