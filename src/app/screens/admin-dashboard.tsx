import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Users, 
  Building2, 
  Megaphone, 
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
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
  AlertCircle,
  Shield,
  Settings,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { AdminApplicationQueue } from './become-creator';

interface DashboardStats {
  totalCreators: number;
  pendingCreators: number;
  approvedCreators: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalRevenue: number;
  pendingPayouts: number;
}

interface ActivityLog {
  id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  created_at: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0,
    pendingCreators: 0,
    approvedCreators: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRevenue: 0,
    pendingPayouts: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'businesses' | 'campaigns' | 'reviews'>('overview');

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login/portal');
      return;
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      navigate('/');
      toast.error('Unauthorized access');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch creator stats
      const { count: totalCreators } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCreators } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedCreators } = await supabase
        .from('creator_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch business stats
      const { count: totalBusinesses } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: pendingBusinesses } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedBusinesses } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch campaign stats
      const { count: totalCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch recent activity
      const { data: activity } = await supabase
        .from('admin_activity_log')
        .select(`
          *,
          admin_profiles (email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(activity || []);
      
      setStats({
        totalCreators: totalCreators || 0,
        pendingCreators: pendingCreators || 0,
        approvedCreators: approvedCreators || 0,
        totalBusinesses: totalBusinesses || 0,
        pendingBusinesses: pendingBusinesses || 0,
        approvedBusinesses: approvedBusinesses || 0,
        totalCampaigns: totalCampaigns || 0,
        activeCampaigns: activeCampaigns || 0,
        totalRevenue: 125000, // This would come from a payments table
        pendingPayouts: 35000
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login/portal');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

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
          <button className="p-2 hover:bg-[#F8F8F8] rounded-full relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#389C9A] rounded-full" />
          </button>
          <div className="w-8 h-8 bg-[#1D1D1D] text-white flex items-center justify-center font-black">
            A
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-[#1D1D1D]/10 z-50 transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
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
            <div className="w-12 h-12 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-lg">
              A
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">Admin User</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest">
                Super Admin
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {[
              { icon: BarChart3, label: 'Overview', tab: 'overview' },
              { icon: Users, label: 'Creators', tab: 'creators', badge: stats.pendingCreators },
              { icon: Building2, label: 'Businesses', tab: 'businesses', badge: stats.pendingBusinesses },
              { icon: Megaphone, label: 'Campaigns', tab: 'campaigns' },
              { icon: Shield, label: 'Reviews', tab: 'reviews' },
              { icon: Activity, label: 'Activity Log', tab: 'activity' },
              { icon: Settings, label: 'Settings', tab: 'settings' }
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab(item.tab as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === item.tab 
                    ? 'bg-[#1D1D1D] text-white' 
                    : 'hover:bg-[#F8F8F8] text-[#1D1D1D]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-[#389C9A] text-white px-1.5 py-0.5 text-[8px] font-black">
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
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 p-4 lg:p-8">
        {/* Welcome Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-8 mb-8"
        >
          <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            Admin Dashboard
          </h2>
          <p className="text-white/60 text-sm">
            Manage creators, businesses, and platform settings
          </p>
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Creators', value: stats.totalCreators.toString(), icon: Users, color: 'text-blue-500' },
                { label: 'Total Businesses', value: stats.totalBusinesses.toString(), icon: Building2, color: 'text-green-500' },
                { label: 'Active Campaigns', value: stats.activeCampaigns.toString(), icon: Megaphone, color: 'text-purple-500' },
                { label: 'Pending Reviews', value: (stats.pendingCreators + stats.pendingBusinesses).toString(), icon: Clock, color: 'text-yellow-500' }
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

            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <DollarSign className="w-5 h-5 text-[#389C9A]" />
                  <h3 className="font-black uppercase tracking-tight">Total Revenue</h3>
                </div>
                <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2">All time earnings</p>
              </div>
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
                  <h3 className="font-black uppercase tracking-tight">Pending Payouts</h3>
                </div>
                <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2">Awaiting payment</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border-2 border-[#1D1D1D] p-6">
              <h3 className="font-black uppercase tracking-tight mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={activity.id} className="flex items-center gap-4 border-b border-[#1D1D1D]/10 pb-4 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-[#F8F8F8] flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#389C9A]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest">{activity.action}</p>
                      <p className="text-[9px] opacity-40">
                        {activity.entity_type} · {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Creators Tab */}
        {activeTab === 'creators' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight">Creator Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10">
                  <Search className="w-4 h-4" />
                </button>
                <button className="p-2 border border-[#1D1D1D]/10">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-2 border border-[#1D1D1D]/10">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <AdminApplicationQueue />
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight">Business Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10">
                  <Search className="w-4 h-4" />
                </button>
                <button className="p-2 border border-[#1D1D1D]/10">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            <AdminBusinessQueue />
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <h3 className="font-black uppercase tracking-tight mb-6">Pending Reviews</h3>
            <div className="space-y-4">
              <div className="border-b border-[#1D1D1D]/10 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-black">Gaming Creator</p>
                    <p className="text-[9px] opacity-40">Applied 2 days ago</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-[#389C9A] text-white px-4 py-2 text-[8px] font-black">Approve</button>
                    <button className="border border-red-500 text-red-500 px-4 py-2 text-[8px] font-black">Reject</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Business Queue Component
function AdminBusinessQueue() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    setBusinesses(data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('business_profiles')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast.success('Business approved');
      fetchBusinesses();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('business_profiles')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast.success('Business rejected');
      fetchBusinesses();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {businesses.map(business => (
        <div key={business.id} className="border border-[#1D1D1D]/10 p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-black">{business.business_name}</h4>
              <p className="text-[9px] opacity-40">{business.full_name} · {business.industry}</p>
            </div>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-[8px] font-black">Pending</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleApprove(business.id)}
              className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black"
            >
              Approve
            </button>
            <button 
              onClick={() => handleReject(business.id)}
              className="flex-1 border border-[#1D1D1D] py-2 text-[8px] font-black"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
      {businesses.length === 0 && (
        <p className="text-center py-8 text-[#1D1D1D]/40">No pending business applications</p>
      )}
    </div>
  );
}
