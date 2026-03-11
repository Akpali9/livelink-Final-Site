import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Building2, Megaphone, DollarSign, Clock,
  X, Search, LogOut, Bell, Menu, BarChart3,
  TrendingUp, Activity, Shield, Send, MessageSquare,
  ChevronRight, CheckCircle2, Filter, Download,
  ArrowUpRight, Zap, RefreshCw,
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

// ── Business Queue ──────────────────────────────────────────
function AdminBusinessQueue() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase.from('businesses').select('*')
      .eq('status', 'pending').order('created_at', { ascending: false });
    setBusinesses(data || []);
    setLoading(false);
  };

  const handle = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('businesses')
      .update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success(status === 'approved' ? 'Business approved' : 'Business rejected'); fetchBusinesses(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (businesses.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-white/20" />
      </div>
      <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">No pending applications</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {businesses.map((b, i) => (
        <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-white text-sm">{b.company_name || 'Unnamed Business'}</p>
              <p className="text-[10px] text-white/40 font-mono mt-0.5">{b.contact_name} · {b.email}</p>
            </div>
            <span className="px-2 py-1 bg-amber-400/20 text-amber-300 text-[9px] font-bold rounded-full border border-amber-400/30">
              PENDING
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handle(b.id, 'approved')}
              className="flex-1 bg-[#00FF94]/15 text-[#00FF94] border border-[#00FF94]/30 py-2 text-[10px] font-bold rounded-lg hover:bg-[#00FF94]/25 transition-colors">
              Approve
            </button>
            <button onClick={() => handle(b.id, 'rejected')}
              className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-colors">
              Reject
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Messages ────────────────────────────────────────────────
function AdminMessages({ adminId }: { adminId: string }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selected, setSelected] = useState<Creator | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('creators').select('id, user_id, name, email, avatar, username')
      .order('name').then(({ data }) => setCreators(data || []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${adminId},receiver_id.eq.${selected.user_id}),and(sender_id.eq.${selected.user_id},receiver_id.eq.${adminId})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      await supabase.from('messages').update({ is_read: true })
        .eq('sender_id', selected.user_id).eq('receiver_id', adminId).eq('is_read', false);
    };
    load();

    const ch = supabase.channel(`admin-msg-${selected.user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${adminId}` }, (p) => {
        const msg = p.new as Message;
        if (msg.sender_id === selected.user_id) {
          setMessages(prev => [...prev, msg]);
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
        }
      }).subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [selected, adminId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!newMessage.trim() || !selected) return;
    setSending(true);
    const optimistic: Message = {
      id: `opt-${Date.now()}`, sender_id: adminId, receiver_id: selected.user_id,
      content: newMessage.trim(), sender_name: 'Admin', is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    const { error } = await supabase.from('messages').insert({
      sender_id: adminId, receiver_id: selected.user_id,
      content: optimistic.content, sender_name: 'Admin',
      is_read: false, created_at: optimistic.created_at,
    });
    if (error) { toast.error('Failed to send'); setMessages(prev => prev.filter(m => m.id !== optimistic.id)); }
    setSending(false);
  };

  const filtered = creators.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[620px] bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
      {/* Sidebar */}
      <div className={`w-72 border-r border-white/10 flex flex-col flex-shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10">
          <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Creators</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#00FF94]/40 transition-colors" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 text-left transition-all hover:bg-white/5 ${
                selected?.id === c.id ? 'bg-[#00FF94]/5 border-l-2 border-l-[#00FF94]' : ''
              }`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FF94]/30 to-[#00D4FF]/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                {c.avatar
                  ? <img src={c.avatar} alt={c.name} className="w-full h-full object-cover rounded-full" />
                  : <span className="text-white text-[10px] font-bold">{c.name?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{c.name || 'Unnamed'}</p>
                <p className="text-[9px] text-white/30 truncate font-mono">{c.email}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="w-6 h-6 text-white/10" />
              <p className="text-[9px] text-white/20 font-mono">No creators found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col ${!selected ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[11px] text-white/30 font-mono">Select a creator to start messaging</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/3">
              <button onClick={() => setSelected(null)} className="md:hidden p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/50" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00D4FF]/20 border border-white/10 flex items-center justify-center overflow-hidden">
                {selected.avatar
                  ? <img src={selected.avatar} alt={selected.name} className="w-full h-full object-cover rounded-full" />
                  : <span className="text-white text-[11px] font-bold">{selected.name?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{selected.name}</p>
                <p className="text-[9px] text-white/30 font-mono">{selected.email}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00FF94]/10 rounded-full border border-[#00FF94]/20">
                <span className="w-1.5 h-1.5 bg-[#00FF94] rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-[#00FF94]">LIVE</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <MessageSquare className="w-8 h-8 text-white/10" />
                  <p className="text-[10px] text-white/20 font-mono">No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isAdmin = msg.sender_id === adminId;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                        isAdmin
                          ? 'bg-[#00FF94] text-[#0A0A0A] font-medium rounded-tr-sm'
                          : 'bg-white/8 text-white border border-white/10 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-white/20 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAdmin && msg.is_read && <CheckCircle2 className="w-2.5 h-2.5 text-[#00FF94]/60" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5">
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${selected.name}...`}
                  className="flex-1 bg-transparent px-3 py-1.5 text-[12px] text-white placeholder-white/20 focus:outline-none" />
                <button onClick={send} disabled={sending || !newMessage.trim()}
                  className="w-9 h-9 bg-[#00FF94] rounded-lg flex items-center justify-center hover:bg-[#00FF94]/80 transition-colors disabled:opacity-30 flex-shrink-0">
                  <Send className="w-3.5 h-3.5 text-[#0A0A0A]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'businesses' | 'reviews' | 'messages' | 'activity'>('overview');
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [adminId, setAdminId] = useState('');
  const [unread, setUnread] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0, pendingCreators: 0, approvedCreators: 0,
    totalBusinesses: 0, pendingBusinesses: 0, approvedBusinesses: 0,
    totalCampaigns: 0, activeCampaigns: 0, totalRevenue: 125000, pendingPayouts: 35000,
  });

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!adminId) return;
    const ch = supabase.channel('admin-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${adminId}` }, (p) => {
        const msg = p.new as Message;
        if (!msg.is_read) { setUnread(prev => prev + 1); toast.info(`New message from ${msg.sender_name || 'Creator'}`); }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminId]);

  useEffect(() => {
    const ch = supabase.channel('admin-apps')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creators' }, () => {
        setStats(s => ({ ...s, totalCreators: s.totalCreators + 1, pendingCreators: s.pendingCreators + 1 }));
        toast.info('New creator application');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'businesses' }, () => {
        setStats(s => ({ ...s, totalBusinesses: s.totalBusinesses + 1, pendingBusinesses: s.pendingBusinesses + 1 }));
        toast.info('New business application');
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login/portal'); return; }
    setAdminId(user.id);
    const { data: ap } = await supabase.from('admin_profiles').select('id').eq('id', user.id).maybeSingle();
    if (!ap && user.app_metadata?.role !== 'admin') { navigate('/'); return; }
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id).eq('is_read', false);
    setUnread(count || 0);
    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: tc }, { count: pc }, { count: ac },
        { count: tb }, { count: pb }, { count: ab },
        { count: tcamp }, { count: acamp },
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
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setStats(s => ({
        ...s, totalCreators: tc || 0, pendingCreators: pc || 0, approvedCreators: ac || 0,
        totalBusinesses: tb || 0, pendingBusinesses: pb || 0, approvedBusinesses: ab || 0,
        totalCampaigns: tcamp || 0, activeCampaigns: acamp || 0,
      }));
      setRecentActivity(activity || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const nav = [
    { icon: BarChart3, label: 'Overview', tab: 'overview', badge: 0 },
    { icon: Users, label: 'Creators', tab: 'creators', badge: stats.pendingCreators },
    { icon: Building2, label: 'Businesses', tab: 'businesses', badge: stats.pendingBusinesses },
    { icon: Shield, label: 'Reviews', tab: 'reviews', badge: stats.pendingCreators + stats.pendingBusinesses },
    { icon: MessageSquare, label: 'Messages', tab: 'messages', badge: unread },
    { icon: Activity, label: 'Activity', tab: 'activity', badge: 0 },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00FF94]/30 border-t-[#00FF94] rounded-full animate-spin" />
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Toaster position="top-right" theme="dark" />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0D0D0D] sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5">
          <Menu className="w-5 h-5 text-white/70" />
        </button>
        <span className="font-bold text-[#00FF94] tracking-widest text-sm">ADMIN</span>
        <button onClick={() => { setActiveTab('messages'); setUnread(0); }} className="relative p-2 rounded-lg hover:bg-white/5">
          <Bell className="w-5 h-5 text-white/70" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00FF94] rounded-full text-[8px] text-black font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed top-0 left-0 h-full w-64 bg-[#0D0D0D] border-r border-white/10 z-50 flex flex-col lg:translate-x-0`}
        initial={false}
        animate={{ x: sidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -256 : 0) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#00FF94] rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">LiveLink</span>
            <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-white/10">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Admin info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[#00FF94]/8 rounded-xl border border-[#00FF94]/15">
            <div className="w-8 h-8 bg-[#00FF94] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-black text-[11px] font-black">A</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white">Admin User</p>
              <p className="text-[9px] text-[#00FF94]/70 font-mono">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(item => (
            <button key={item.tab}
              onClick={() => { setActiveTab(item.tab as any); setSidebarOpen(false); if (item.tab === 'messages') setUnread(0); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-[#00FF94]/12 text-[#00FF94] border border-[#00FF94]/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === item.tab ? 'bg-[#00FF94] text-black' : 'bg-white/10 text-white/60'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login/portal'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Main */}
      <div className="lg:ml-64 min-h-screen">
        <div className="p-5 lg:p-8 max-w-6xl">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white capitalize">
                {activeTab === 'overview' ? 'Dashboard' : activeTab}
              </h1>
              <p className="text-[11px] text-white/30 font-mono mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Creators', value: stats.totalCreators, sub: `${stats.pendingCreators} pending`, icon: Users, accent: '#00FF94' },
                  { label: 'Total Businesses', value: stats.totalBusinesses, sub: `${stats.pendingBusinesses} pending`, icon: Building2, accent: '#00D4FF' },
                  { label: 'Active Campaigns', value: stats.activeCampaigns, sub: `${stats.totalCampaigns} total`, icon: Megaphone, accent: '#FF6B35' },
                  { label: 'Pending Reviews', value: stats.pendingCreators + stats.pendingBusinesses, sub: 'need attention', icon: Clock, accent: '#FFD700' },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}18` }}>
                        <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-white mb-0.5">{s.value}</p>
                    <p className="text-[10px] text-white/40 font-medium">{s.label}</p>
                    <p className="text-[9px] font-mono mt-1" style={{ color: s.accent }}>{s.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Revenue cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#00FF94]/10 to-transparent border border-[#00FF94]/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-[#00FF94]" />
                    <span className="text-[10px] font-bold text-[#00FF94] uppercase tracking-widest">Total Revenue</span>
                  </div>
                  <p className="text-3xl font-bold text-white">₦{stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30 font-mono mt-2">All time earnings</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Payouts</span>
                  </div>
                  <p className="text-3xl font-bold text-white">₦{stats.pendingPayouts.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30 font-mono mt-2">Awaiting payment</p>
                </div>
              </div>

              {/* Activity feed */}
              <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
                  <span className="text-[9px] font-mono text-white/20 bg-white/5 px-2 py-1 rounded-full">LIVE</span>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Activity className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] text-white/20 font-mono">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                        <div className="w-7 h-7 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-3 h-3 text-[#00FF94]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white font-medium truncate">{a.action}</p>
                          <p className="text-[9px] text-white/30 font-mono">{a.entity_type} · {new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Creators ── */}
          {activeTab === 'creators' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Creator Applications</h3>
                <div className="flex gap-2">
                  {[Search, Filter, Download].map((Icon, i) => (
                    <button key={i} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  ))}
                </div>
              </div>
              <AdminApplicationQueue />
            </div>
          )}

          {/* ── Businesses ── */}
          {activeTab === 'businesses' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Business Applications</h3>
                <div className="flex gap-2">
                  {[Search, Filter].map((Icon, i) => (
                    <button key={i} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  ))}
                </div>
              </div>
              <AdminBusinessQueue />
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === 'reviews' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-6">Pending Reviews</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-[#00FF94] uppercase tracking-widest mb-2">Creator Applications</p>
                  <p className="text-4xl font-bold text-white mb-4">{stats.pendingCreators}</p>
                  <button onClick={() => setActiveTab('creators')}
                    className="w-full bg-[#00FF94] text-black py-2.5 text-[10px] font-bold rounded-xl hover:bg-[#00FF94]/80 transition-colors">
                    Review Now
                  </button>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Business Applications</p>
                  <p className="text-4xl font-bold text-white mb-4">{stats.pendingBusinesses}</p>
                  <button onClick={() => setActiveTab('businesses')}
                    className="w-full bg-amber-400 text-black py-2.5 text-[10px] font-bold rounded-xl hover:bg-amber-400/80 transition-colors">
                    Review Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {activeTab === 'messages' && adminId && (
            <div>
              <h3 className="font-semibold text-white mb-5">Messages</h3>
              <AdminMessages adminId={adminId} />
            </div>
          )}

          {/* ── Activity ── */}
          {activeTab === 'activity' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-6">Activity Log</h3>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Activity className="w-8 h-8 text-white/10" />
                  <p className="text-[10px] text-white/20 font-mono">No activity recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-4 p-4 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-[#00FF94]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-white">{a.action}</p>
                        <p className="text-[9px] text-white/30 font-mono mt-1">{a.entity_type} · {new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
