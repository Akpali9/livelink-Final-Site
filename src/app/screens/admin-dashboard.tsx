import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Building2, Megaphone, DollarSign, Clock,
  X, Search, LogOut, Bell, Menu, BarChart3,
  TrendingUp, Activity, Shield, Send, MessageSquare,
  ChevronRight, CheckCircle2, Filter, Download,
  ArrowUpRight, Zap, RefreshCw, Paperclip, Image,
  MoreVertical, Edit, Trash2, Star, Phone, Mail,
  Globe, Instagram, Twitter, Youtube, Linkedin,
  AlertCircle, Loader2, Eye, EyeOff, Lock, Unlock,
  UserCheck, UserX, Ban, Crown, Award, Gift,
  CreditCard, Wallet, Calendar, Clock3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { supabase } from '../lib/supabase';
import { AdminApplicationQueue } from './become-creator';

// Types
interface DashboardStats {
  totalCreators: number;
  pendingCreators: number;
  approvedCreators: number;
  rejectedCreators: number;
  suspendedCreators: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  rejectedBusinesses: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalRevenue: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalMessages: number;
  unreadMessages: number;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_id: string;
  details: any;
  created_at: string;
}

interface Creator {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
  bio?: string;
  category?: string;
  followers?: number;
  engagement_rate?: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  updated_at: string;
  verified: boolean;
  phone?: string;
  location?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

interface Business {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  size?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  inserted_at: string;
  is_read: boolean;
  seen: boolean;
  read_at?: string;
  sender_name?: string;
  sender_type: 'admin' | 'creator' | 'business';
  topic?: string;
  extension?: string;
  private: boolean;
  attachment_url?: string;
  attachment_type?: 'image' | 'file' | 'video' | 'audio';
  attachment_name?: string;
  attachment_size?: number;
}

interface MessageThread {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  participant_avatar?: string;
  participant_type: 'creator' | 'business';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  last_message_sender: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  business_id: string;
  business_name: string;
  budget: number;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  applications_count?: number;
  approved_creators?: number;
}

interface Payout {
  id: string;
  campaign_id: string;
  creator_id: string;
  creator_name: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
  processed_at?: string;
  notes?: string;
}

// Custom Hooks
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ── Business Queue Component ───────────────────────────────
function AdminBusinessQueue() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch businesses');
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('businesses')
      .update({ 
        status: 'approved', 
        reviewed_at: new Date().toISOString(),
        verified: true
      })
      .eq('id', id);

    if (!error) {
      toast.success('Business approved successfully');
      
      // Log activity
      await supabase.from('admin_activity_log').insert({
        action: 'Approved business application',
        entity_type: 'business',
        entity_id: id,
        details: { business_id: id }
      });

      fetchBusinesses();
    } else {
      toast.error('Failed to approve business');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const { error } = await supabase
      .from('businesses')
      .update({ 
        status: 'rejected', 
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq('id', id);

    if (!error) {
      toast.success('Business rejected');
      
      // Send rejection notification
      await supabase.from('notifications').insert({
        user_id: businesses.find(b => b.id === id)?.user_id,
        type: 'application_rejected',
        title: 'Application Rejected',
        content: rejectionReason,
        data: { business_id: id }
      });

      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedBusiness(null);
      fetchBusinesses();
    } else {
      toast.error('Failed to reject business');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#00FF94] animate-spin" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white/20" />
        </div>
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          No pending applications
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-white text-sm">
                  {business.company_name || 'Unnamed Business'}
                </p>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">
                  {business.contact_name} · {business.email}
                </p>
                {business.industry && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-white/5 rounded text-[8px] text-white/40">
                    {business.industry}
                  </span>
                )}
              </div>
              <span className="px-2 py-1 bg-amber-400/20 text-amber-300 text-[9px] font-bold rounded-full border border-amber-400/30">
                PENDING
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(business.id)}
                className="flex-1 bg-[#00FF94]/15 text-[#00FF94] border border-[#00FF94]/30 py-2 text-[10px] font-bold rounded-lg hover:bg-[#00FF94]/25 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setSelectedBusiness(business);
                  setShowRejectModal(true);
                }}
                className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Reject Application</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <p className="text-[11px] text-white/60 mb-3">
                Rejecting <span className="text-white font-medium">{selectedBusiness.company_name}</span>
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#00FF94]/40 resize-none"
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleReject(selectedBusiness.id)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 bg-red-500 text-white py-2.5 text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 bg-white/5 text-white/70 py-2.5 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Enhanced Messages Component ─────────────────────────────
function AdminMessages({ adminId }: { adminId: string }) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'creators' | 'businesses'>('all');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingChannel = useRef<any>(null);

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  // Fetch threads
  useEffect(() => {
    fetchThreads();
  }, [debouncedSearch, filter]);

  // Setup typing indicator channel
  useEffect(() => {
    typingChannel.current = supabase.channel('typing-indicators')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedThread?.participant_id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (payload.isTyping) {
              newSet.add(payload.userId);
            } else {
              newSet.delete(payload.userId);
            }
            return newSet;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel.current);
    };
  }, [selectedThread]);

  // Load messages when thread selected
  useEffect(() => {
    if (!selectedThread) return;
    
    setMessages([]);
    setPage(1);
    setHasMore(true);
    loadMessages(selectedThread.participant_id, 1);
    markThreadAsRead(selectedThread.participant_id);

    // Subscribe to new messages
    const messageChannel = supabase.channel(`admin-msg-${selectedThread.participant_id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${adminId}` 
        }, 
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === selectedThread.participant_id) {
            setMessages(prev => [...prev, msg]);
            markMessageAsRead(msg.id);
            
            // Update thread last message
            setThreads(prev => prev.map(t => 
              t.participant_id === selectedThread.participant_id
                ? { ...t, last_message: msg.content, last_message_time: msg.created_at, unread_count: 0 }
                : t
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedThread, adminId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      // Get all unique conversations
      const { data: messageData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by participant
      const threadMap = new Map<string, MessageThread>();
      
      for (const msg of messageData || []) {
        const participantId = msg.sender_id === adminId ? msg.receiver_id : msg.sender_id;
        
        if (!threadMap.has(participantId)) {
          // Get participant details
          const { data: creator } = await supabase
            .from('creators')
            .select('id, name, email, avatar, username')
            .eq('user_id', participantId)
            .single();

          const { data: business } = await supabase
            .from('businesses')
            .select('id, company_name, contact_name, email')
            .eq('user_id', participantId)
            .single();

          const participant = creator || business;
          const participantType = creator ? 'creator' : 'business';
          
          // Count unread
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', adminId)
            .eq('sender_id', participantId)
            .eq('is_read', false);

          threadMap.set(participantId, {
            id: `${participantId}-thread`,
            participant_id: participantId,
            participant_name: creator?.name || business?.company_name || 'Unknown',
            participant_email: creator?.email || business?.email || '',
            participant_avatar: creator?.avatar,
            participant_type: participantType,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: count || 0,
            last_message_sender: msg.sender_id === adminId ? 'You' : msg.sender_name || 'Them'
          });
        }
      }

      // Apply filters
      let filtered = Array.from(threadMap.values());
      
      if (filter === 'unread') {
        filtered = filtered.filter(t => t.unread_count > 0);
      } else if (filter === 'creators') {
        filtered = filtered.filter(t => t.participant_type === 'creator');
      } else if (filter === 'businesses') {
        filtered = filtered.filter(t => t.participant_type === 'business');
      }

      // Apply search
      if (debouncedSearch) {
        filtered = filtered.filter(t =>
          t.participant_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          t.participant_email.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      setThreads(filtered);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (participantId: string, pageNum: number) => {
    setLoadingMessages(true);
    try {
      const from = (pageNum - 1) * 50;
      const to = from + 49;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${adminId},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${adminId})`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        setMessages(prev => pageNum === 1 ? data.reverse() : [...data.reverse(), ...prev]);
        setHasMore(data.length === 50);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = () => {
    if (!hasMore || loadingMessages || !selectedThread) return;
    setPage(p => p + 1);
    loadMessages(selectedThread.participant_id, page + 1);
  };

  const markThreadAsRead = async (participantId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true, seen: true, read_at: new Date().toISOString() })
      .eq('sender_id', participantId)
      .eq('receiver_id', adminId)
      .eq('is_read', false);

    // Update thread unread count
    setThreads(prev => prev.map(t =>
      t.participant_id === participantId
        ? { ...t, unread_count: 0 }
        : t
    ));
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true, seen: true, read_at: new Date().toISOString() })
      .eq('id', messageId);
  };

  const handleTyping = (isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingChannel.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: adminId, isTyping }
    });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    }
  };

  const handleAttachment = async () => {
    if (!attachment || !selectedThread) return;

    setUploading(true);
    try {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `message-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, attachment);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      // Send message with attachment
      const now = new Date().toISOString();
      const messageData = {
        sender_id: adminId,
        receiver_id: selectedThread.participant_id,
        recipient_id: selectedThread.participant_id,
        content: attachment.type.startsWith('image/') ? '📸 Sent an image' : `📎 Sent a file: ${attachment.name}`,
        sender_name: 'Admin',
        sender_type: 'admin',
        topic: 'direct',
        extension: 'text',
        is_read: false,
        seen: false,
        private: true,
        created_at: now,
        updated_at: now,
        inserted_at: now,
        attachment_url: publicUrl,
        attachment_type: attachment.type.startsWith('image/') ? 'image' : 'file',
        attachment_name: attachment.name,
        attachment_size: attachment.size
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);

      if (messageError) throw messageError;

      toast.success('Attachment sent');
      setAttachment(null);
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedThread || sending || uploading) return;

    setSending(true);

    // Handle attachment first if exists
    if (attachment) {
      await handleAttachment();
    }

    // Send text message
    if (newMessage.trim()) {
      const optimisticMessage: Message = {
        id: `opt-${Date.now()}`,
        sender_id: adminId,
        receiver_id: selectedThread.participant_id,
        recipient_id: selectedThread.participant_id,
        content: newMessage.trim(),
        sender_name: 'Admin',
        sender_type: 'admin',
        topic: 'direct',
        extension: 'text',
        is_read: false,
        seen: false,
        private: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inserted_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      handleTyping(false);

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: adminId,
          receiver_id: selectedThread.participant_id,
          recipient_id: selectedThread.participant_id,
          content: optimisticMessage.content,
          sender_name: 'Admin',
          sender_type: 'admin',
          topic: 'direct',
          extension: 'text',
          is_read: false,
          seen: false,
          private: true,
          created_at: now,
          updated_at: now,
          inserted_at: now
        });

      if (error) {
        toast.error('Failed to send message');
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      } else {
        // Update thread
        setThreads(prev => prev.map(t =>
          t.participant_id === selectedThread.participant_id
            ? {
                ...t,
                last_message: optimisticMessage.content,
                last_message_time: now,
                last_message_sender: 'You'
              }
            : t
        ));
      }
    }

    setSending(false);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex h-[620px] bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
      {/* Sidebar */}
      <div className={`w-80 border-r border-white/10 flex flex-col flex-shrink-0 ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
              Conversations
            </p>
            <span className="text-[9px] bg-[#00FF94]/10 text-[#00FF94] px-2 py-0.5 rounded-full">
              {threads.length} threads
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#00FF94]/40 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {(['all', 'unread', 'creators', 'businesses'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1.5 text-[8px] font-bold rounded-lg capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#00FF94] text-black'
                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-[#00FF94] animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <MessageSquare className="w-6 h-6 text-white/10" />
              <p className="text-[9px] text-white/20 font-mono">No conversations found</p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 text-left transition-all hover:bg-white/5 ${
                  selectedThread?.participant_id === thread.participant_id
                    ? 'bg-[#00FF94]/5 border-l-2 border-l-[#00FF94]'
                    : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94]/30 to-[#00D4FF]/30 flex items-center justify-center overflow-hidden border border-white/10">
                    {thread.participant_avatar ? (
                      <img
                        src={thread.participant_avatar}
                        alt={thread.participant_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-[11px] font-bold">
                        {thread.participant_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  {thread.participant_type === 'business' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center">
                      <Building2 className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-semibold text-white truncate">
                      {thread.participant_name}
                    </p>
                    <p className="text-[8px] text-white/30 font-mono flex-shrink-0 ml-2">
                      {formatMessageTime(thread.last_message_time)}
                    </p>
                  </div>
                  
                  <p className="text-[9px] text-white/50 truncate mb-1">
                    <span className="text-white/30">{thread.last_message_sender}:</span>{' '}
                    {thread.last_message}
                  </p>

                  <div className="flex items-center justify-between">
                    <p className="text-[8px] text-white/30 font-mono">
                      {thread.participant_email}
                    </p>
                    {thread.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#00FF94] rounded-full text-[7px] text-black font-bold">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedThread ? 'hidden md:flex' : 'flex'}`}>
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[11px] text-white/30 font-mono">
              Select a conversation to start messaging
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/3">
              <button
                onClick={() => setSelectedThread(null)}
                className="md:hidden p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00D4FF]/20 border border-white/10 flex items-center justify-center overflow-hidden">
                  {selectedThread.participant_avatar ? (
                    <img
                      src={selectedThread.participant_avatar}
                      alt={selectedThread.participant_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-[12px] font-bold">
                      {selectedThread.participant_name?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00FF94] rounded-full border-2 border-[#0D0D0D]" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    {selectedThread.participant_name}
                  </p>
                  {selectedThread.participant_type === 'business' && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[7px] font-bold rounded-full border border-amber-500/30">
                      BUSINESS
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-white/30 font-mono">
                  {selectedThread.participant_email}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-white/40" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-white/40" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingMessages && page === 1 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#00FF94] animate-spin" />
                </div>
              ) : (
                <>
                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center">
                      <button
                        onClick={loadMoreMessages}
                        disabled={loadingMessages}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {loadingMessages ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg, index) => {
                    const isAdmin = msg.sender_id === adminId;
                    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isAdmin && showAvatar && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00D4FF]/20 flex-shrink-0 overflow-hidden mt-1">
                              {selectedThread.participant_avatar ? (
                                <img
                                  src={selectedThread.participant_avatar}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-[8px] font-bold">
                                    {selectedThread.participant_name?.[0]?.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            {/* Attachment */}
                            {msg.attachment_url && (
                              <div className="mb-2">
                                {msg.attachment_type === 'image' ? (
                                  <img
                                    src={msg.attachment_url}
                                    alt="Attachment"
                                    className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10"
                                  />
                                ) : (
                                  <a
                                    href={msg.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                                  >
                                    <Paperclip className="w-3 h-3 text-white/40" />
                                    <span className="text-[10px] text-white/80">
                                      {msg.attachment_name || 'Attachment'}
                                    </span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Message */}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed break-words ${
                                isAdmin
                                  ? 'bg-[#00FF94] text-[#0A0A0A] font-medium rounded-tr-sm'
                                  : 'bg-white/8 text-white border border-white/10 rounded-tl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[7px] text-white/20 font-mono">
                                {new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isAdmin && (
                                <>
                                  {msg.is_read ? (
                                    <>
                                      <CheckCircle2 className="w-2.5 h-2.5 text-[#00FF94]/60" />
                                      <span className="text-[7px] text-[#00FF94]/60">Read</span>
                                    </>
                                  ) : msg.seen ? (
                                    <>
                                      <CheckCircle2 className="w-2.5 h-2.5 text-blue-400/60" />
                                      <span className="text-[7px] text-blue-400/60">Delivered</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-2.5 h-2.5 text-white/20" />
                                      <span className="text-[7px] text-white/20">Sent</span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers.has(selectedThread.participant_id) && (
                    <div className="flex justify-start">
                      <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              {/* Attachment Preview */}
              {attachment && (
                <div className="mb-3 p-2 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {attachment.type.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-[#00FF94]" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-[#00FF94]" />
                    )}
                    <span className="text-[10px] text-white/80 truncate max-w-[200px]">
                      {attachment.name}
                    </span>
                    <span className="text-[8px] text-white/40">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <X className="w-3 h-3 text-white/40" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Paperclip className="w-3.5 h-3.5 text-white/40" />
                </button>

                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg flex items-center">
                  <input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Message ${selectedThread.participant_name}...`}
                    className="flex-1 bg-transparent px-3 py-2 text-[12px] text-white placeholder-white/20 focus:outline-none"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !attachment) || sending || uploading}
                  className="w-9 h-9 bg-[#00FF94] rounded-lg flex items-center justify-center hover:bg-[#00FF94]/80 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  {sending || uploading ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#0A0A0A] animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#0A0A0A]" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Creator Management Component ────────────────────────────
function AdminCreatorManagement() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'followers'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchCreators();
  }, [debouncedSearch, filter, sortBy, sortOrder]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('creators')
        .select('*');

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      // Apply search
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (creatorId: string, newStatus: Creator['status']) => {
    const { error } = await supabase
      .from('creators')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', creatorId);

    if (!error) {
      toast.success(`Creator ${newStatus}`);
      fetchCreators();
    } else {
      toast.error('Failed to update status');
    }
  };

  const handleVerify = async (creatorId: string, verified: boolean) => {
    const { error } = await supabase
      .from('creators')
      .update({ verified, updated_at: new Date().toISOString() })
      .eq('id', creatorId);

    if (!error) {
      toast.success(verified ? 'Creator verified' : 'Verification removed');
      fetchCreators();
    } else {
      toast.error('Failed to update verification');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/20';
      case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'suspended': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Creator Management</h3>
          <span className="text-[9px] bg-white/10 text-white/50 px-2 py-1 rounded-full">
            {creators.length} total
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#00FF94]/40"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#00FF94]/40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#00FF94]/40"
          >
            <option value="created_at">Join Date</option>
            <option value="name">Name</option>
            <option value="followers">Followers</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Creator</th>
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Followers</th>
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Engagement</th>
              <th className="px-6 py-3 text-left text-[9px] font-mono text-white/30 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-right text-[9px] font-mono text-white/30 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Loader2 className="w-5 h-5 text-[#00FF94] animate-spin mx-auto" />
                </td>
              </tr>
            ) : creators.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] text-white/20 font-mono">No creators found</p>
                  </div>
                </td>
              </tr>
            ) : (
              creators.map((creator) => (
                <tr key={creator.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00D4FF]/20 flex items-center justify-center overflow-hidden">
                        {creator.avatar ? (
                          <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-[10px] font-bold">{creator.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-medium text-white">{creator.name}</p>
                          {creator.verified && (
                            <CheckCircle2 className="w-3 h-3 text-[#00FF94]" />
                          )}
                        </div>
                        <p className="text-[8px] text-white/30 font-mono">{creator.email}</p>
                        {creator.username && (
                          <p className="text-[8px] text-[#00FF94]/50">@{creator.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[8px] font-bold rounded-full border ${getStatusColor(creator.status)}`}>
                      {creator.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-white/60">{creator.category || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-white/60">
                      {creator.followers ? creator.followers.toLocaleString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {creator.engagement_rate ? (
                      <span className="text-[10px] text-[#00FF94]">{creator.engagement_rate}%</span>
                    ) : (
                      <span className="text-[10px] text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] text-white/40 font-mono">
                      {new Date(creator.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleVerify(creator.id, !creator.verified)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title={creator.verified ? 'Remove verification' : 'Verify creator'}
                      >
                        {creator.verified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF94]" />
                        ) : (
                          <Award className="w-3.5 h-3.5 text-white/30" />
                        )}
                      </button>

                      <button
                        onClick={() => handleStatusChange(creator.id, creator.status === 'suspended' ? 'approved' : 'suspended')}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title={creator.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                      >
                        {creator.status === 'suspended' ? (
                          <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Ban className="w-3.5 h-3.5 text-orange-400/70" />
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedCreator(creator)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Creator Details Modal */}
      <AnimatePresence>
        {selectedCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCreator(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white">Creator Details</h3>
                <button
                  onClick={() => setSelectedCreator(null)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF94]/30 to-[#00D4FF]/30 flex items-center justify-center overflow-hidden">
                    {selectedCreator.avatar ? (
                      <img src={selectedCreator.avatar} alt={selectedCreator.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{selectedCreator.name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-bold text-white">{selectedCreator.name}</p>
                      {selectedCreator.verified && (
                        <CheckCircle2 className="w-4 h-4 text-[#00FF94]" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 font-mono">{selectedCreator.email}</p>
                    {selectedCreator.username && (
                      <p className="text-[10px] text-[#00FF94]">@{selectedCreator.username}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 text-[9px] font-bold rounded-full border ${getStatusColor(selectedCreator.status)}`}>
                      {selectedCreator.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[8px] text-white/30 font-mono mb-1">Followers</p>
                    <p className="text-lg font-bold text-white">
                      {selectedCreator.followers?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[8px] text-white/30 font-mono mb-1">Engagement</p>
                    <p className="text-lg font-bold text-[#00FF94]">
                      {selectedCreator.engagement_rate || '0'}%
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[8px] text-white/30 font-mono mb-1">Category</p>
                    <p className="text-sm font-bold text-white">
                      {selectedCreator.category || '—'}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                {selectedCreator.bio && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] text-white/40 font-mono mb-2">Bio</p>
                    <p className="text-[11px] text-white/80 leading-relaxed">{selectedCreator.bio}</p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedCreator.phone && (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                      <Phone className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[10px] text-white/80">{selectedCreator.phone}</span>
                    </div>
                  )}
                  {selectedCreator.location && (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                      <Globe className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[10px] text-white/80">{selectedCreator.location}</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {selectedCreator.social_links && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] text-white/40 font-mono mb-3">Social Links</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCreator.social_links.instagram && (
                        <a
                          href={selectedCreator.social_links.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
                        >
                          <Instagram className="w-3 h-3 text-pink-400" />
                          <span className="text-[8px] text-pink-400">Instagram</span>
                        </a>
                      )}
                      {selectedCreator.social_links.twitter && (
                        <a
                          href={selectedCreator.social_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          <Twitter className="w-3 h-3 text-blue-400" />
                          <span className="text-[8px] text-blue-400">Twitter</span>
                        </a>
                      )}
                      {selectedCreator.social_links.youtube && (
                        <a
                          href={selectedCreator.social_links.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Youtube className="w-3 h-3 text-red-400" />
                          <span className="text-[8px] text-red-400">YouTube</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleStatusChange(selectedCreator.id, 'approved')}
                    className="flex-1 bg-[#00FF94] text-black py-2.5 text-[10px] font-bold rounded-lg hover:bg-[#00FF94]/80 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedCreator.id, 'rejected')}
                    className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(selectedCreator.id, !selectedCreator.verified)}
                    className="px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    title={selectedCreator.verified ? 'Remove verification' : 'Verify creator'}
                  >
                    {selectedCreator.verified ? (
                      <Unlock className="w-3.5 h-3.5 text-white/40" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'creators' | 'businesses' | 'reviews' | 'messages' | 'activity' | 'campaigns' | 'payouts'>('overview');
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [adminId, setAdminId] = useState('');
  const [unread, setUnread] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalCreators: 0,
    pendingCreators: 0,
    approvedCreators: 0,
    rejectedCreators: 0,
    suspendedCreators: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    rejectedBusinesses: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalRevenue: 125000,
    pendingPayouts: 35000,
    completedPayouts: 90000,
    totalMessages: 0,
    unreadMessages: 0
  });

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!adminId) return;
    
    const channel = supabase.channel('admin-unread')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${adminId}` }, 
        (payload) => {
          const msg = payload.new as Message;
          if (!msg.is_read) {
            setUnread(prev => prev + 1);
            toast.info(`New message from ${msg.sender_name || 'Creator'}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminId]);

  useEffect(() => {
    // Realtime revenue updates
    const revenueChannel = supabase.channel('admin-revenue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'campaign_payout_cycles' }, 
        async () => {
          const [{ data: all }, { data: pending }, { data: completed }] = await Promise.all([
            supabase.from('campaign_payout_cycles').select('amount'),
            supabase.from('campaign_payout_cycles').select('amount').eq('status', 'pending'),
            supabase.from('campaign_payout_cycles').select('amount').eq('status', 'completed'),
          ]);

          const totalRevenue = all?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;
          const pendingPayouts = pending?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;
          const completedPayouts = completed?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;

          setStats(s => ({ ...s, totalRevenue, pendingPayouts, completedPayouts }));
        }
      )
      .subscribe();

    // Realtime application notifications
    const appsChannel = supabase.channel('admin-apps')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creators' }, () => {
        setStats(s => ({ ...s, totalCreators: s.totalCreators + 1, pendingCreators: s.pendingCreators + 1 }));
        toast.info('New creator application received');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'businesses' }, () => {
        setStats(s => ({ ...s, totalBusinesses: s.totalBusinesses + 1, pendingBusinesses: s.pendingBusinesses + 1 }));
        toast.info('New business application received');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(revenueChannel);
      supabase.removeChannel(appsChannel);
    };
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login/portal');
      return;
    }
    
    setAdminId(user.id);

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminProfile && user.app_metadata?.role !== 'admin') {
      navigate('/');
      return;
    }

    // Get unread messages count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .is('read_at', null);

    setUnread(count || 0);

    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: tc }, { count: pc }, { count: ac }, { count: rc }, { count: sc },
        { count: tb }, { count: pb }, { count: ab }, { count: rb },
        { count: tcamp }, { count: acamp }, { count: ccamp },
        { data: activity },
        { data: allPayouts },
        { data: pendingPayoutRows },
        { data: completedPayoutRows },
        { count: totalMessages },
        { count: unreadMessages }
      ] = await Promise.all([
        supabase.from('creators').select('*', { count: 'exact', head: true }),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('campaign_payout_cycles').select('amount'),
        supabase.from('campaign_payout_cycles').select('amount').eq('status', 'pending'),
        supabase.from('campaign_payout_cycles').select('amount').eq('status', 'completed'),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('receiver_id', adminId)
      ]);

      const totalRevenue = allPayouts?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;
      const pendingPayouts = pendingPayoutRows?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;
      const completedPayouts = completedPayoutRows?.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0) || 0;

      setStats({
        totalCreators: tc || 0,
        pendingCreators: pc || 0,
        approvedCreators: ac || 0,
        rejectedCreators: rc || 0,
        suspendedCreators: sc || 0,
        totalBusinesses: tb || 0,
        pendingBusinesses: pb || 0,
        approvedBusinesses: ab || 0,
        rejectedBusinesses: rb || 0,
        totalCampaigns: tcamp || 0,
        activeCampaigns: acamp || 0,
        completedCampaigns: ccamp || 0,
        totalRevenue,
        pendingPayouts,
        completedPayouts,
        totalMessages: totalMessages || 0,
        unreadMessages: unreadMessages || 0
      });

      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    { icon: BarChart3, label: 'Overview', tab: 'overview', badge: 0 },
    { icon: Users, label: 'Creators', tab: 'creators', badge: stats.pendingCreators },
    { icon: Building2, label: 'Businesses', tab: 'businesses', badge: stats.pendingBusinesses },
    { icon: Shield, label: 'Reviews', tab: 'reviews', badge: stats.pendingCreators + stats.pendingBusinesses },
    { icon: MessageSquare, label: 'Messages', tab: 'messages', badge: unread },
    { icon: Megaphone, label: 'Campaigns', tab: 'campaigns', badge: stats.activeCampaigns },
    { icon: Wallet, label: 'Payouts', tab: 'payouts', badge: stats.pendingPayouts > 0 ? 1 : 0 },
    { icon: Activity, label: 'Activity', tab: 'activity', badge: 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00FF94]/30 border-t-[#00FF94] rounded-full animate-spin" />
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Toaster position="top-right" theme="dark" />

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0D0D0D] sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/5"
        >
          <Menu className="w-5 h-5 text-white/70" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#00FF94] rounded flex items-center justify-center">
            <Zap className="w-3 h-3 text-black" />
          </div>
          <span className="font-bold text-[#00FF94] tracking-widest text-sm">ADMIN</span>
        </div>

        <button
          onClick={() => { setActiveTab('messages'); setUnread(0); }}
          className="relative p-2 rounded-lg hover:bg-white/5"
        >
          <Bell className="w-5 h-5 text-white/70" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00FF94] rounded-full text-[8px] text-black font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          />
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
            <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono">
              ADMIN
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-white/10"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Admin Profile */}
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

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map(item => (
            <button
              key={item.tab}
              onClick={() => {
                setActiveTab(item.tab as any);
                setSidebarOpen(false);
                if (item.tab === 'messages') setUnread(0);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-[#00FF94]/12 text-[#00FF94] border border-[#00FF94]/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === item.tab
                    ? 'bg-[#00FF94] text-black'
                    : 'bg-white/10 text-white/60'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login/portal');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        <div className="p-5 lg:p-8 max-w-7xl mx-auto">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white capitalize">
                {activeTab === 'overview' ? 'Dashboard' : activeTab}
              </h1>
              <p className="text-[11px] text-white/30 font-mono mt-0.5">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Creators',
                    value: stats.totalCreators,
                    sub: `${stats.pendingCreators} pending, ${stats.approvedCreators} approved`,
                    icon: Users,
                    accent: '#00FF94'
                  },
                  {
                    label: 'Total Businesses',
                    value: stats.totalBusinesses,
                    sub: `${stats.pendingBusinesses} pending, ${stats.approvedBusinesses} approved`,
                    icon: Building2,
                    accent: '#00D4FF'
                  },
                  {
                    label: 'Active Campaigns',
                    value: stats.activeCampaigns,
                    sub: `${stats.completedCampaigns} completed`,
                    icon: Megaphone,
                    accent: '#FF6B35'
                  },
                  {
                    label: 'Pending Reviews',
                    value: stats.pendingCreators + stats.pendingBusinesses,
                    sub: 'need attention',
                    icon: Clock,
                    accent: '#FFD700'
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07 }}
                    className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${stat.accent}18` }}
                      >
                        <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
                    </div>
                    <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
                    <p className="text-[10px] text-white/40 font-medium">{stat.label}</p>
                    <p className="text-[9px] font-mono mt-1" style={{ color: stat.accent }}>{stat.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Revenue Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="bg-gradient-to-br from-[#00FF94]/10 to-transparent border border-[#00FF94]/20 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-[#00FF94]" />
                    <span className="text-[10px] font-bold text-[#00FF94] uppercase tracking-widest">
                      Total Revenue
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ₦{stats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/30 font-mono mt-2">
                    All time earnings
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      Pending Payouts
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ₦{stats.pendingPayouts.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/30 font-mono mt-2">
                    Awaiting payment
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 }}
                  className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                      Completed Payouts
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ₦{stats.completedPayouts.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/30 font-mono mt-2">
                    Successfully paid
                  </p>
                </motion.div>
              </div>

              {/* Activity Feed */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.49 }}
                className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
                  <span className="text-[9px] font-mono text-white/20 bg-white/5 px-2 py-1 rounded-full">
                    LIVE
                  </span>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Activity className="w-6 h-6 text-white/10" />
                    <p className="text-[10px] text-white/20 font-mono">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-3 h-3 text-[#00FF94]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white font-medium truncate">
                            {activity.action}
                          </p>
                          <p className="text-[9px] text-white/30 font-mono">
                            {activity.entity_type} · {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Creators Tab */}
          {activeTab === 'creators' && (
            <AdminCreatorManagement />
          )}

          {/* Businesses Tab */}
          {activeTab === 'businesses' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Business Applications</h3>
                <div className="flex gap-2">
                  <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <Search className="w-3.5 h-3.5 text-white/50" />
                  </button>
                  <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <Filter className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </div>
              </div>
              <AdminBusinessQueue />
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-6">Pending Reviews</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-[#00FF94] uppercase tracking-widest mb-2">
                    Creator Applications
                  </p>
                  <p className="text-4xl font-bold text-white mb-4">{stats.pendingCreators}</p>
                  <button
                    onClick={() => setActiveTab('creators')}
                    className="w-full bg-[#00FF94] text-black py-2.5 text-[10px] font-bold rounded-xl hover:bg-[#00FF94]/80 transition-colors"
                  >
                    Review Now
                  </button>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
                    Business Applications
                  </p>
                  <p className="text-4xl font-bold text-white mb-4">{stats.pendingBusinesses}</p>
                  <button
                    onClick={() => setActiveTab('businesses')}
                    className="w-full bg-amber-400 text-black py-2.5 text-[10px] font-bold rounded-xl hover:bg-amber-400/80 transition-colors"
                  >
                    Review Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && adminId && (
            <div>
              <h3 className="font-semibold text-white mb-5">Messages</h3>
              <AdminMessages adminId={adminId} />
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-6">Campaign Management</h3>
              <p className="text-white/40 text-[11px]">Campaign management interface coming soon...</p>
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-6">Payout Management</h3>
              <p className="text-white/40 text-[11px]">Payout management interface coming soon...</p>
            </div>
          )}

          {/* Activity Tab */}
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
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-start gap-4 p-4 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-[#00FF94]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-white">{activity.action}</p>
                        <p className="text-[9px] text-white/30 font-mono mt-1">
                          {activity.entity_type} · {new Date(activity.created_at).toLocaleString()}
                        </p>
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
