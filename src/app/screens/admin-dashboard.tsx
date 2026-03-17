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
} from "lucide-react";
import { motion } from "motion/react";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";
import { AdminApplicationQueue } from "./become-creator";
import { AdminDashboard } from "../components/AdminDashboard";
export function AdminDashboardScreen() {
  return <AdminDashboard />;
}
// ─────────────────────────────────────────────
// TYPES  (aligned with schema)
// ─────────────────────────────────────────────

interface DashboardStats {
  totalCreators:      number;
  pendingCreators:    number;   // status = 'pending_review' ✅ schema value
  activeCreators:     number;   // status = 'active'
  totalBusinesses:    number;
  pendingBusinesses:  number;   // application_status = 'pending' ✅
  approvedBusinesses: number;   // application_status = 'approved'
  totalCampaigns:     number;
  activeCampaigns:    number;
  totalRevenue:       number;   // sum of business_transactions.amount
  pendingPayouts:     number;   // sum of campaign_creators.total_earnings - paid_out
}

// ─────────────────────────────────────────────
// ADMIN GUARD WITH AUTO-ASSIGNMENT
// ─────────────────────────────────────────────

async function verifyAndAssignAdmin(): Promise<boolean> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("No user found:", userError);
      return false;
    }

    console.log("Current user:", user.email);

    // Check if this is the admin email
    const isAdminEmail = user.email === "admin@livelink.com";

    // Check if user already has admin in metadata
    const hasAdminMetadata = user.user_metadata?.role === "admin" || 
                            user.user_metadata?.user_type === "admin";

    // If this is admin@livelink.com but doesn't have admin privileges, auto-assign them
    if (isAdminEmail && !hasAdminMetadata) {
      console.log("Auto-assigning admin privileges to admin@livelink.com");
      
      // Update user metadata with admin role
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          role: "admin",
          user_type: "admin",
          is_admin: true 
        }
      });

      if (updateError) {
        console.error("Failed to update user metadata:", updateError);
        
        // Try alternative method - update via admin API (if using service role)
        // This is a fallback
        await assignAdminViaDatabase(user.id);
      } else {
        toast.success("Admin privileges granted!");
        return true;
      }
    }

    // Also check profiles table for admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profile?.role === "admin") {
      return true;
    }

    // If this is admin email but profile doesn't have admin role, create/update it
    if (isAdminEmail) {
      await upsertAdminProfile(user.id, user.email);
      return true;
    }

    // Final check: any admin indicator in metadata
    return user.user_metadata?.role === "admin" || 
           user.user_metadata?.user_type === "admin" ||
           user.user_metadata?.is_admin === true;
           
  } catch (error) {
    console.error("Error in verifyAndAssignAdmin:", error);
    return false;
  }
}

// Helper function to assign admin via database
async function assignAdminViaDatabase(userId: string) {
  try {
    // Try to update profiles table directly
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        role: "admin",
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error("Failed to upsert profile:", upsertError);
    }

    // Also try to update creator_profiles if it exists
    await supabase
      .from("creator_profiles")
      .update({ status: "active" })
      .eq("id", userId);
      
  } catch (error) {
    console.error("Error in assignAdminViaDatabase:", error);
  }
}

// Helper to upsert admin profile
async function upsertAdminProfile(userId: string, email: string) {
  try {
    // Check if profiles table exists and upsert
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        role: "admin",
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("Failed to upsert profile:", profileError);
      
      // If profiles table doesn't exist, try to create it via RPC
      await createProfilesTable();
    }

    // Also update user metadata again to be safe
    await supabase.auth.updateUser({
      data: { 
        role: "admin", 
        user_type: "admin",
        is_admin: true 
      }
    });

  } catch (error) {
    console.error("Error in upsertAdminProfile:", error);
  }
}

// Helper to create profiles table if it doesn't exist
async function createProfilesTable() {
  try {
    // This is a SQL query that would need to be run via RPC or migration
    // For now, we'll just log it
    console.log("Please ensure profiles table exists with role column");
  } catch (error) {
    console.error("Error creating profiles table:", error);
  }
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState<
    "overview" | "creators" | "businesses" | "campaigns" | "support"
  >("overview");
  const [isAdmin, setIsAdmin]             = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalCreators:      0,
    pendingCreators:    0,
    activeCreators:     0,
    totalBusinesses:    0,
    pendingBusinesses:  0,
    approvedBusinesses: 0,
    totalCampaigns:     0,
    activeCampaigns:    0,
    totalRevenue:       0,
    pendingPayouts:     0,
  });

  // ─── GUARD WITH AUTO-ASSIGNMENT ─────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // Check and auto-assign admin if needed
      const adminStatus = await verifyAndAssignAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        toast.error("Unauthorised access");
        navigate("/login/portal");
        return;
      }
      
      await fetchDashboardData();
      setLoading(false);
    };
    
    init();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const adminStatus = await verifyAndAssignAdmin();
        setIsAdmin(adminStatus);
        if (adminStatus) {
          await fetchDashboardData();
        } else {
          navigate("/login/portal");
        }
      } else if (event === 'SIGNED_OUT') {
        navigate("/login/portal");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ─── FETCH STATS ─────────────────────────────────────────────────────────

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ✅ creator_profiles — correct table name (not "creators")
      const [
        { count: totalCreators },
        { count: pendingCreators },
        { count: activeCreators },
      ] = await Promise.all([
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }),
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "pending_review"), // ✅ correct status value
        supabase.from("creator_profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // ✅ businesses — correct table name (not "business_profiles")
      // ✅ application_status column (not "status" for approval state)
      const [
        { count: totalBusinesses },
        { count: pendingBusinesses },
        { count: approvedBusinesses },
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }).neq("status", "deleted"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("application_status", "pending"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("application_status", "approved"),
      ]);

      // ✅ campaigns — exists in schema
      const [
        { count: totalCampaigns },
        { count: activeCampaigns },
      ] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // ✅ Revenue from business_transactions (correct table, has amount + currency)
      const { data: txRows } = await supabase
        .from("business_transactions")
        .select("amount")
        .eq("status", "completed")
        .eq("type", "payment");

      const totalRevenue = (txRows || []).reduce((s, r) => s + (r.amount || 0), 0);

      // ✅ Pending payouts = sum of (total_earnings - paid_out) from campaign_creators
      const { data: earningsRows } = await supabase
        .from("campaign_creators")
        .select("total_earnings, paid_out");

      const pendingPayouts = (earningsRows || []).reduce(
        (s, r) => s + Math.max(0, (r.total_earnings || 0) - (r.paid_out || 0)),
        0
      );

      setStats({
        totalCreators:      totalCreators      || 0,
        pendingCreators:    pendingCreators     || 0,
        activeCreators:     activeCreators      || 0,
        totalBusinesses:    totalBusinesses     || 0,
        pendingBusinesses:  pendingBusinesses   || 0,
        approvedBusinesses: approvedBusinesses  || 0,
        totalCampaigns:     totalCampaigns      || 0,
        activeCampaigns:    activeCampaigns     || 0,
        totalRevenue,
        pendingPayouts,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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

  // ─── NAV ITEMS ────────────────────────────────────────────────────────────

  const navItems = [
    { icon: BarChart3,  label: "Overview",   tab: "overview",    badge: 0 },
    { icon: Users,      label: "Creators",   tab: "creators",    badge: stats.pendingCreators },
    { icon: Building2,  label: "Businesses", tab: "businesses",  badge: stats.pendingBusinesses },
    { icon: Megaphone,  label: "Campaigns",  tab: "campaigns",   badge: 0 },
    { icon: Shield,     label: "Support",    tab: "support",     badge: 0 },
  ] as const;

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Toaster position="top-center" richColors />

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-[#1D1D1D]/10 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black uppercase tracking-tight text-lg">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2 hover:bg-[#F8F8F8] rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-8 h-8 bg-[#1D1D1D] text-white flex items-center justify-center font-black">A</div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-[#1D1D1D]/10 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Admin<span className="text-[#389C9A]">.</span>
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#1D1D1D]/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-lg">A</div>
            <div>
              <p className="font-black uppercase tracking-tight">Admin User</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === item.tab
                    ? "bg-[#1D1D1D] text-white"
                    : "hover:bg-[#F8F8F8] text-[#1D1D1D]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-1.5 py-0.5 text-[8px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1D1D1D]/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 p-4 lg:p-8">

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-8 mb-8 flex justify-between items-center"
        >
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Admin Dashboard</h2>
            <p className="text-white/60 text-sm">Manage creators, businesses, and platform settings</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-3 border border-white/20 hover:border-white text-white transition-colors disabled:opacity-50 hidden lg:block"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Creators",    value: stats.totalCreators,                             icon: Users,    color: "text-blue-500" },
                { label: "Total Businesses",  value: stats.totalBusinesses,                           icon: Building2,color: "text-green-500" },
                { label: "Active Campaigns",  value: stats.activeCampaigns,                           icon: Megaphone,color: "text-purple-500" },
                { label: "Pending Reviews",   value: stats.pendingCreators + stats.pendingBusinesses, icon: Clock,    color: "text-yellow-500" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white border-2 border-[#1D1D1D] p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tight mb-1">{stat.value}</p>
                  <p className="text-[9px] font-medium uppercase tracking-widest opacity-40">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <DollarSign className="w-5 h-5 text-[#389C9A]" />
                  <h3 className="font-black uppercase tracking-tight">Total Revenue</h3>
                </div>
                {/* ✅ NGN currency — business_transactions defaults to NGN */}
                <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2">Completed payments</p>
              </div>
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
                  <h3 className="font-black uppercase tracking-tight">Pending Payouts</h3>
                </div>
                <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2">Earnings not yet paid out to creators</p>
              </div>
            </div>

            {/* Quick breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Pending Creator Reviews", value: stats.pendingCreators,    action: () => setActiveTab("creators"),   color: "border-[#FEDB71]" },
                { label: "Pending Business Reviews", value: stats.pendingBusinesses, action: () => setActiveTab("businesses"), color: "border-[#389C9A]" },
                { label: "Total Campaigns",          value: stats.totalCampaigns,    action: () => setActiveTab("campaigns"),  color: "border-[#1D1D1D]" },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className={`bg-white border-2 ${item.color} p-6 text-left hover:shadow-lg transition-shadow`}
                >
                  <p className="text-3xl font-black italic mb-2">{item.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.label}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── CREATORS TAB ── */}
        {activeTab === "creators" && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight">Creator Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Search className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Filter className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Download className="w-4 h-4" /></button>
              </div>
            </div>
            {/* ✅ AdminApplicationQueue reads from creator_profiles correctly */}
            <AdminApplicationQueue />
          </div>
        )}

        {/* ── BUSINESSES TAB ── */}
        {activeTab === "businesses" && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight">Business Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Search className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors"><Filter className="w-4 h-4" /></button>
              </div>
            </div>
            <AdminBusinessQueue onStatsChange={fetchDashboardData} />
          </div>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <AdminCampaignsView />
        )}

        {/* ── SUPPORT TAB ── */}
        {activeTab === "support" && (
          <AdminSupportView />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN BUSINESS QUEUE
// ✅ Uses "businesses" table (not "business_profiles")
// ✅ Uses application_status column for approval state
// ✅ Uses verification_status for verification state
// ✅ Uses status column for active/paused/deleted
// ─────────────────────────────────────────────

function AdminBusinessQueue({ onStatsChange }: { onStatsChange?: () => void }) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"pending" | "approved" | "rejected">("pending");

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")               // ✅ correct table
      .select(`
        id,
        business_name,
        contact_name,
        contact_email,
        industry,
        city,
        country,
        logo_url,
        application_status,
        verification_status,
        status,
        created_at
      `)
      .eq("application_status", filter) // ✅ correct column
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (error) { console.error(error); toast.error("Failed to load businesses"); }
    setBusinesses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBusinesses(); }, [filter]);

  const updateApplicationStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const { error } = await supabase
      .from("businesses")
      .update({ application_status: newStatus }) // ✅ correct column
      .eq("id", id);

    if (error) { toast.error("Failed to update"); return; }

    toast.success(`Business ${newStatus}`);
    setBusinesses(prev => prev.filter(b => b.id !== id));
    onStatsChange?.();
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["pending", "approved", "rejected"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter} business applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map(biz => (
            <motion.div
              key={biz.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.business_name} className="w-12 h-12 rounded-xl border-2 border-[#1D1D1D] object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    {/* ✅ business_name not company_name */}
                    <h4 className="font-black text-sm uppercase tracking-tight mb-0.5">{biz.business_name || "Unnamed"}</h4>
                    {/* ✅ contact_name not full_name */}
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{biz.contact_name} · {biz.industry || "—"}</p>
                    {biz.city && <p className="text-[9px] text-gray-400 mt-0.5">{biz.city}{biz.country ? `, ${biz.country}` : ""}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    biz.application_status === "approved" ? "bg-green-100 text-green-700" :
                    biz.application_status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-[#FEDB71]/30 text-[#1D1D1D]"
                  }`}>
                    {biz.application_status}
                  </span>
                  <span className="text-[7px] text-gray-400">{new Date(biz.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* ✅ contact_email not email */}
              {biz.contact_email && (
                <p className="text-[9px] text-gray-400 mb-4">{biz.contact_email}</p>
              )}

              {biz.application_status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => updateApplicationStatus(biz.id, "approved")}
                    className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(biz.id, "rejected")}
                    className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
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
// ADMIN CAMPAIGNS VIEW
// ✅ Uses campaigns table with correct status values
// ─────────────────────────────────────────────

function AdminCampaignsView() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"pending_review" | "active" | "completed" | "rejected">("pending_review");

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        id,
        name,
        type,
        status,
        budget,
        pay_rate,
        bid_amount,
        created_at,
        admin_notes,
        businesses (
          id,
          business_name,
          logo_url
        )
      `)
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); toast.error("Failed to load campaigns"); }
    setCampaigns(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, [filter]);

  const updateCampaignStatus = async (
    id: string,
    newStatus: "active" | "rejected",
    notes?: string
  ) => {
    const { error } = await supabase
      .from("campaigns")
      .update({
        status:      newStatus,
        admin_notes: notes || null,
      })
      .eq("id", id);

    if (error) { toast.error("Failed to update campaign"); return; }
    toast.success(`Campaign ${newStatus}`);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const statusTabs = ["pending_review", "active", "completed", "rejected"] as const;

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Campaigns</h3>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter.replace("_", " ")} campaigns</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(camp => {
            const biz = camp.businesses as any;
            const price = camp.pay_rate ?? camp.bid_amount ?? camp.budget ?? 0;
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {biz?.logo_url ? (
                      <img src={biz.logo_url} alt={biz.business_name} className="w-10 h-10 rounded-lg border border-[#1D1D1D] object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">{camp.name}</h4>
                      <p className="text-[9px] text-gray-400">{biz?.business_name} · {camp.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-[#389C9A]">₦{Number(price).toLocaleString()}</p>
                    <p className="text-[8px] text-gray-400">{new Date(camp.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {filter === "pending_review" && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "active")}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => updateCampaignStatus(camp.id, "rejected")}
                      className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
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
// ADMIN SUPPORT VIEW
// ✅ Uses support_tickets table from schema
// ─────────────────────────────────────────────

function AdminSupportView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"open" | "in_progress" | "resolved">("open");

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets") // ✅ exists in schema
      .select("id, category, message, status, admin_reply, created_at, updated_at")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); }
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const resolveTicket = async (id: string, reply: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status:      "resolved",
        admin_reply: reply,
      })
      .eq("id", id);

    if (error) { toast.error("Failed to update ticket"); return; }
    toast.success("Ticket resolved");
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6">
      <h3 className="font-black uppercase tracking-tight mb-6">Support Tickets</h3>

      <div className="flex gap-2 mb-6 border-b border-[#1D1D1D]/10">
        {(["open", "in_progress", "resolved"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              filter === tab ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]" : "text-gray-400 hover:text-[#1D1D1D]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No {filter.replace("_", " ")} tickets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-[#1D1D1D] p-6 rounded-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5 rounded-full">
                    {ticket.category || "General"}
                  </span>
                  <p className="text-[8px] text-gray-400 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  ticket.status === "open"        ? "bg-yellow-100 text-yellow-700" :
                  ticket.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm text-[#1D1D1D]/80 mb-4">{ticket.message}</p>
              {ticket.status === "open" && (
                <button
                  onClick={() => resolveTicket(ticket.id, "Resolved by admin.")}
                  className="w-full bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
