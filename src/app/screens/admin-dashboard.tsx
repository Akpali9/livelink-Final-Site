import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Building2, Megaphone, DollarSign, Clock,
  X, Search, Filter, Download, LogOut, Bell, Menu, BarChart3,
  TrendingUp, Activity, Shield, Send, MessageSquare, ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { supabase } from '../lib/supabase';
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
  action: string;
  entity_type: string;
  created_at: string;
}

interface Creator {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

// ── Admin Business Queue ────────────────────────────────────
function AdminBusinessQueue() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase
      .from('businesses').select('*').eq('status', 'pending')
      .order('created_at', { ascending: false });
    setBusinesses(data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('businesses')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success('Business approved'); fetchBusinesses(); }
    else toast.error('Failed to approve');
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('businesses')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.error('Business rejected'); fetchBusinesses(); }
    else toast.error('Failed to reject');
  };

  if (loading) return <div className="text-center py-8 text-[10px] font-black uppercase italic">Loading...</div>;

  return (
    <div className="space-y-4">
      {businesses.map(b => (
        <div key={b.id} className="border border-[#1D1D1D]/10 p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-black uppercase italic">{b.company_name || 'Unnamed'}</h4>
              <p className="text-[9px] opacity-40 uppercase">{b.contact_name} · {b.email}</p>
            </div>
            <span className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase border border-[#1D1D1D]/10">Pending</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleApprove(b.id)} className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase italic hover:bg-[#389C9A] transition-colors">Approve</button>
            <button onClick={() => handleReject(b.id)} className="flex-1 border border-[#1D1D1D] py-2 text-[8px] font-black uppercase italic hover:bg-red-50 hover:border-red-400 hover:text-red-500 transition-colors">Reject</button>
          </div>
        </div>
      ))}
      {businesses.length === 0 && (
        <p className="text-center py-8 text-[10px] text-[#1D1D1D]/40 uppercase italic font-black">No pending business applications</p>
      )}
    </div>
  );
}

// ── Admin Messages Tab ──────────────────────────────────────
function AdminMessages({ adminId }: { adminId: string }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all creators
  useEffect(() => {
    const fetchCreators = async () => {
      const { data } = await supabase
        .from('creators').select('id, user_id, name, email, avatar, username')
        .order('name', { ascending: true });
      setCreators(data || []);
    };
    fetchCreators();
  }, []);

  // Load messages for selected creator + realtime subscription
  useEffect(() => {
    if (!selectedCreator) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${adminId},receiver_id.eq.${selectedCreator.user_id}),` +
          `and(sender_id.eq.${selectedCreator.user_id},receiver_id.eq.${adminId})`
        )
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Mark incoming as read
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('sender_id', selectedCreator.user_id)
        .eq('receiver_id', adminId)
        .eq('is_read', false);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`admin-chat-${selectedCreator.user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${adminId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === selectedCreator.user_id) {
          setMessages(prev => [...prev, msg]);
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCreator, adminId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCreator) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: adminId,
      receiver_id: selectedCreator.user_id,
      content: newMessage.trim(),
      sender_name: 'Admin',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (!error) {
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: adminId,
        receiver_id: selectedCreator.user_id,
        content: newMessage.trim(),
        sender_name: 'Admin',
        is_read: false,
        created_at: new Date().toISOString(),
      }]);
      setNewMessage('');
    } else {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const filteredCreators = creators.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border-2 border-[#1D1D1D] h-[600px] flex overflow-hidden">

      {/* Creator List */}
      <div className={`w-full md:w-72 border-r border-[#1D1D1D]/10 flex flex-col flex-shrink-0 ${selectedCreator ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#1D1D1D]/10">
          <h3 className="font-black uppercase tracking-tight italic mb-3">Creators</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1D1D1D]/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search creators..."
              className="w-full border border-[#1D1D1D]/20 pl-8 pr-3 py-2 text-[10px] font-bold italic focus:outline-none focus:border-[#1D1D1D]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCreators.length === 0 && (
            <p className="text-center py-8 text-[10px] text-[#1D1D1D]/40 uppercase italic font-black">No creators found</p>
          )}
          {filteredCreators.map(creator => (
            <button
              key={creator.id}
              onClick={() => setSelectedCreator(creator)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#1D1D1D]/5 text-left transition-colors hover:bg-[#F8F8F8] ${
                selectedCreator?.id === creator.id ? 'bg-[#389C9A]/5 border-l-2 border-l-[#389C9A]' : ''
              }`}
            >
              <div className="w-9 h-9 bg-[#1D1D1D] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {creator.avatar
                  ? <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                  : <span className="text-white text-[11px] font-black">{creator.name?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest italic truncate">{creator.name || 'Unnamed'}</p>
                <p className="text-[9px] text-[#1D1D1D]/40 truncate">{creator.email}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#1D1D1D]/20 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`flex-1 flex flex-col ${!selectedCreator ? 'hidden md:flex' : 'flex'}`}>
        {!selectedCreator ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#1D1D1D]/20">
            <MessageSquare className="w-10 h-10" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Select a creator to message</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1D1D1D]/10">
              <button onClick={() => setSelectedCreator(null)} className="md:hidden mr-1">
                <X className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 bg-[#1D1D1D] flex items-center justify-center overflow-hidden flex-shrink-0">
                {selectedCreator.avatar
                  ? <img src={selectedCreator.avatar} alt={selectedCreator.name} className="w-full h-full object-cover" />
                  : <span className="text-white text-[10px] font-black">{selectedCreator.name?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest italic">{selectedCreator.name}</p>
                <p className="text-[9px] text-[#1D1D1D]/40">{selectedCreator.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#389C9A] rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] italic">Live</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[#1D1D1D]/20">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-[9px] font-black uppercase tracking-widest italic">No messages yet</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isAdmin = msg.sender_id === adminId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-3 py-2 text-[11px] leading-relaxed ${
                        isAdmin
                          ? 'bg-[#1D1D1D] text-white'
                          : 'bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[#1D1D1D]'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-[#1D1D1D]/30 font-bold">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAdmin && msg.is_read && <CheckCircle2 className="w-2.5 h-2.5 text-[#389C9A]" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#1D1D1D]/10 flex gap-2">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message ${selectedCreator.name}...`}
                className="flex-1 border border-[#1D1D1D]/20 px-3 py-2.5 text-[11px] font-bold italic focus:outline-none focus:border-[#1D1D1D] transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2.5 bg-[#1D1D1D] text-white hover:bg-[#389C9A] transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'businesses' | 'reviews' | 'activity' | 'messages'>('overview');
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [adminId, setAdminId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0, pendingCreators: 0, approvedCreators: 0,
    totalBusinesses: 0, pendingBusinesses: 0, approvedBusinesses: 0,
    totalCampaigns: 0, activeCampaigns: 0,
    totalRevenue: 125000, pendingPayouts: 35000,
  });
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardData();
  }, []);

  // Realtime: listen for new messages to admin
  useEffect(() => {
    if (!adminId) return;
    const channel = supabase
      .channel('admin-unread')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${adminId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (!msg.is_read) {
          setUnreadMessages(prev => prev + 1);
          toast.info(`New message from ${msg.sender_name || 'Creator'}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminId]);

  // Realtime: listen for new pending creators/businesses
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creators' }, () => {
        setStats(s => ({ ...s, totalCreators: s.totalCreators + 1, pendingCreators: s.pendingCreators + 1 }));
        toast.info('New creator application received');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'businesses' }, () => {
        setStats(s => ({ ...s, totalBusinesses: s.totalBusinesses + 1, pendingBusinesses: s.pendingBusinesses + 1 }));
        toast.info('New business application received');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login/portal'); return; }
    setAdminId(user.id);
    const { data: adminProfile } = await supabase
      .from('admin_profiles').select('*').eq('id', user.id).maybeSingle();
    const isAdmin = !!adminProfile || user.app_metadata?.role === 'admin';
    if (!isAdmin) { navigate('/'); toast.error('Unauthorized access'); }

    // Count unread messages
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id).eq('is_read', false);
    setUnreadMessages(count || 0);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        { count: totalCreators },
        { count: pendingCreators },
        { count: approvedCreators },
        { count: totalBusinesses },
        { count: pendingBusinesses },
        { count: approvedBusinesses },
        { count: totalCampaigns },
        { count: activeCampaigns },
        { data: activity },
      ] = await Promise.all([
        supabase.from('creators').select('*', { count: 'exact', head: true }),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      setStats(s => ({
        ...s,
        totalCreators: totalCreators || 0, pendingCreators: pendingCreators || 0,
        approvedCreators: approvedCreators || 0, totalBusinesses: totalBusinesses || 0,
        pendingBusinesses: pendingBusinesses || 0, approvedBusinesses: approvedBusinesses || 0,
        totalCampaigns: totalCampaigns || 0, activeCampaigns: activeCampaigns || 0,
      }));
      setRecentActivity(activity || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login/portal');
  };

  const navItems = [
    { icon: BarChart3,      label: 'Overview',   tab: 'overview',   badge: 0 },
    { icon: Users,          label: 'Creators',   tab: 'creators',   badge: stats.pendingCreators },
    { icon: Building2,      label: 'Businesses', tab: 'businesses', badge: stats.pendingBusinesses },
    { icon: Shield,         label: 'Reviews',    tab: 'reviews',    badge: stats.pendingCreators + stats.pendingBusinesses },
    { icon: MessageSquare,  label: 'Messages',   tab: 'messages',   badge: unreadMessages },
    { icon: Activity,       label: 'Activity',   tab: 'activity',   badge: 0 },
  ];

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
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="w-6 h-6" /></button>
          <span className="font-black uppercase tracking-tight text-lg italic">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('messages')} className="p-2 relative">
            <Bell className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#389C9A] rounded-full text-[8px] text-white font-black flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
          <div className="w-8 h-8 bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">A</div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#1D1D1D]/10 z-50 flex flex-col transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#1D1D1D]/10 flex justify-between items-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Admin<span className="text-[#389C9A]">.</span></h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-b border-[#1D1D1D]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D1D1D] text-white flex items-center justify-center font-black">A</div>
            <div>
              <p className="font-black uppercase tracking-tight text-sm italic">Admin User</p>
              <p className="text-[9px] opacity-40 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => { setActiveTab(item.tab as any); setSidebarOpen(false); if (item.tab === 'messages') setUnreadMessages(0); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest italic transition-all mb-1 ${
                activeTab === item.tab ? 'bg-[#1D1D1D] text-white' : 'hover:bg-[#F8F8F8] text-[#1D1D1D]/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className="bg-[#389C9A] text-white px-1.5 py-0.5 text-[8px] font-black min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1D1D1D]/10">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest italic text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 lg:p-8">

        {/* Welcome Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#1D1D1D] text-white p-8 mb-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-1">Admin Dashboard</h2>
          <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Manage creators, businesses, and platform settings</p>
        </motion.div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Creators',   value: stats.totalCreators,   icon: Users,     color: 'text-blue-500' },
                { label: 'Total Businesses', value: stats.totalBusinesses, icon: Building2, color: 'text-green-500' },
                { label: 'Active Campaigns', value: stats.activeCampaigns, icon: Megaphone, color: 'text-purple-500' },
                { label: 'Pending Reviews',  value: stats.pendingCreators + stats.pendingBusinesses, icon: Clock, color: 'text-[#FEDB71]' },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }} className="bg-white border-2 border-[#1D1D1D] p-5">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-4`} />
                  <p className="text-2xl font-black uppercase tracking-tight italic mb-1">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-[#389C9A]" />
                  <h3 className="font-black uppercase tracking-tight italic">Total Revenue</h3>
                </div>
                <p className="text-3xl font-black italic">₦{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2 uppercase tracking-widest font-bold">All time earnings</p>
              </div>
              <div className="bg-white border-2 border-[#1D1D1D] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#FEDB71]" />
                  <h3 className="font-black uppercase tracking-tight italic">Pending Payouts</h3>
                </div>
                <p className="text-3xl font-black italic">₦{stats.pendingPayouts.toLocaleString()}</p>
                <p className="text-[9px] opacity-40 mt-2 uppercase tracking-widest font-bold">Awaiting payment</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1D1D1D] p-6">
              <h3 className="font-black uppercase tracking-tight italic mb-6">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="text-[10px] text-[#1D1D1D]/40 uppercase italic font-black text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 border-b border-[#1D1D1D]/10 pb-4 last:border-0 last:pb-0">
                      <div className="w-8 h-8 bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-[#389C9A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest italic truncate">{a.action}</p>
                        <p className="text-[9px] opacity-40 uppercase tracking-widest">{a.entity_type} · {new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'creators' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight italic">Creator Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10 hover:bg-[#F8F8F8]"><Search className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:bg-[#F8F8F8]"><Filter className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:bg-[#F8F8F8]"><Download className="w-4 h-4" /></button>
              </div>
            </div>
            <AdminApplicationQueue />
          </div>
        )}

        {activeTab === 'businesses' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-tight italic">Business Applications</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-[#1D1D1D]/10 hover:bg-[#F8F8F8]"><Search className="w-4 h-4" /></button>
                <button className="p-2 border border-[#1D1D1D]/10 hover:bg-[#F8F8F8]"><Filter className="w-4 h-4" /></button>
              </div>
            </div>
            <AdminBusinessQueue />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <h3 className="font-black uppercase tracking-tight italic mb-6">Pending Reviews</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-[#1D1D1D] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Creator Applications</p>
                <p className="text-3xl font-black italic text-[#389C9A]">{stats.pendingCreators}</p>
                <button onClick={() => setActiveTab('creators')} className="mt-4 w-full bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase italic hover:bg-[#389C9A] transition-colors">Review Now</button>
              </div>
              <div className="border-2 border-[#1D1D1D] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest italic mb-1">Business Applications</p>
                <p className="text-3xl font-black italic text-[#FEDB71]">{stats.pendingBusinesses}</p>
                <button onClick={() => setActiveTab('businesses')} className="mt-4 w-full bg-[#1D1D1D] text-white py-2 text-[9px] font-black uppercase italic hover:bg-[#389C9A] transition-colors">Review Now</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && adminId && (
          <div>
            <h3 className="font-black uppercase tracking-tight italic mb-6">Messages</h3>
            <AdminMessages adminId={adminId} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <h3 className="font-black uppercase tracking-tight italic mb-6">Activity Log</h3>
            {recentActivity.length === 0 ? (
              <p className="text-[10px] text-[#1D1D1D]/40 uppercase italic font-black text-center py-8">No activity recorded</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-4 border border-[#1D1D1D]/10 p-4">
                    <div className="w-8 h-8 bg-[#389C9A]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-[#389C9A]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest italic">{a.action}</p>
                      <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">{a.entity_type} · {new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
