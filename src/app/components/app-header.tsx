import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  MessageSquare, Bell, User, ArrowLeft, Settings, LogOut,
  Home, CheckCircle, AlertCircle, Calendar, DollarSign,
  Briefcase, Mail, Send, Shield, Search, X, Paperclip,
  Image as ImageIcon, Phone, Video, MoreVertical, Smile,
  ChevronRight, Clock, CheckCircle2, Users, Building2,
  Star, Zap, Filter, Plus, Camera, Mic, MicOff, VideoOff,
  PhoneOff, Volume2, VolumeX, Maximize2, Minimize2,
  Copy, Trash2, Edit, Flag, Archive, Pin, Reply,
  ThumbsUp, Heart, Laugh, Frown, Angry
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { ImageWithFallback } from "./ImageWithFallback";
import { useProfileType } from "../hooks/useProfileType";

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  seen: boolean;
  read_at?: string;
  sender_name?: string;
  sender_type: 'creator' | 'business' | 'admin';
  attachment_url?: string;
  attachment_type?: 'image' | 'file' | 'video' | 'audio';
  attachment_name?: string;
  attachment_size?: number;
  reply_to_id?: string;
  reactions?: MessageReaction[];
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
  messages?: Message[];
  participant1?: UserProfile;
  participant2?: UserProfile;
  other_participant?: UserProfile;
  unread_count?: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  type: 'creator' | 'business' | 'admin';
  username?: string;
  company_name?: string;
  online?: boolean;
  last_seen?: string;
  typing?: boolean;
}

interface UserDirectoryItem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  type: 'creator' | 'business' | 'admin';
  username?: string;
  company_name?: string;
  category?: string;
  followers?: number;
  verified?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "offer" | "campaign" | "payment" | "system" | "message";
  is_read: boolean;
  created_at: string;
  data?: any;
}

interface CallSession {
  id: string;
  room_id: string;
  participants: {
    user_id: string;
    name: string;
    avatar?: string;
    joined_at: string;
    audio_enabled: boolean;
    video_enabled: boolean;
  }[];
  started_at: string;
  status: 'ringing' | 'active' | 'ended' | 'missed';
  type: 'audio' | 'video';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatTimestamp = (ts: string) => {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const formatMessageTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return 'Invalid date';
  }
};

const getInitials = (name: string = '') => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Resolve any user's display info regardless of their role
async function resolveParticipant(userId: string): Promise<UserProfile> {
  // Check admin
  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (admin) {
    return { 
      id: admin.id,
      user_id: admin.id,
      name: admin.full_name || "Admin", 
      avatar: admin.avatar_url || "", 
      type: "admin",
      email: ''
    };
  }

  // Check creator
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id, full_name, avatar_url, username")
    .eq("user_id", userId)
    .maybeSingle();
  if (creator) {
    return { 
      id: creator.id,
      user_id: userId,
      name: creator.full_name || "Creator", 
      avatar: creator.avatar_url || "", 
      type: "creator",
      email: '',
      username: creator.username
    };
  }

  // Check business
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, logo_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (business) {
    return { 
      id: business.id,
      user_id: userId,
      name: business.business_name || "Business", 
      avatar: business.logo_url || "", 
      type: "business",
      email: '',
      company_name: business.business_name
    };
  }

  // Fallback
  return { 
    id: userId,
    user_id: userId,
    name: "Unknown", 
    avatar: "", 
    type: "creator",
    email: ''
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// ── Emoji Picker Component ─────────────────────────────────────────────────
const EmojiPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => {
  const emojis = [
    '😊', '👍', '❤️', '😂', '🎉', '👏', '🙏', '🔥', '✨', '⭐',
    '😍', '🥰', '😘', '🤗', '😎', '🤔', '😅', '😇', '🥳', '🤩',
    '💯', '💪', '🤝', '👌', '✌️', '🤞', '👊', '💥', '💫', '🌟'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full mb-2 left-0 bg-white border-2 border-[#1D1D1D] p-2 grid grid-cols-8 gap-1 z-50"
    >
      {emojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-8 h-8 hover:bg-[#1D1D1D]/5 text-lg flex items-center justify-center transition-colors"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
};

// ── Reaction Picker Component ────────────────────────────────────────────
const ReactionPicker = ({ onSelect, onClose }: { onSelect: (reaction: string) => void; onClose: () => void }) => {
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full mb-2 left-0 bg-white border-2 border-[#1D1D1D] rounded-full p-1 flex gap-1 z-50"
    >
      {reactions.map(reaction => (
        <button
          key={reaction}
          onClick={() => {
            onSelect(reaction);
            onClose();
          }}
          className="w-8 h-8 hover:bg-[#1D1D1D]/5 rounded-full text-lg flex items-center justify-center transition-colors"
        >
          {reaction}
        </button>
      ))}
    </motion.div>
  );
};

// ── Message Reactions Component ──────────────────────────────────────────
const MessageReactions = ({ 
  reactions, 
  onAddReaction,
  currentUserId 
}: { 
  reactions: MessageReaction[]; 
  onAddReaction: (reaction: string) => void;
  currentUserId: string;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userReaction = reactions.find(r => r.user_id === currentUserId)?.reaction;

  return (
    <div className="flex items-center gap-1 mt-1">
      {Object.entries(groupedReactions).map(([reaction, count]) => (
        <button
          key={reaction}
          onClick={() => onAddReaction(reaction)}
          className={`px-1.5 py-0.5 rounded-full text-[9px] flex items-center gap-0.5 transition-colors border ${
            userReaction === reaction
              ? 'bg-[#389C9A]/10 text-[#389C9A] border-[#389C9A]/30'
              : 'bg-[#1D1D1D]/5 text-[#1D1D1D]/60 hover:bg-[#1D1D1D]/10 border-[#1D1D1D]/10'
          }`}
        >
          <span>{reaction}</span>
          <span>{count}</span>
        </button>
      ))}
      
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-[#1D1D1D]/10 transition-colors"
      >
        <Smile className="w-3 h-3 text-[#1D1D1D]/40" />
      </button>

      <AnimatePresence>
        {showPicker && (
          <ReactionPicker
            onSelect={(reaction) => {
              onAddReaction(reaction);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Message Status Component ───────────────────────────────────────────────
const MessageStatus = ({ message, isMe }: { message: Message; isMe: boolean }) => {
  if (!isMe) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      {message.is_read ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
          <span className="text-[8px] text-[#389C9A]">Read</span>
        </>
      ) : message.seen ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          <span className="text-[8px] text-blue-400">Delivered</span>
        </>
      ) : (
        <>
          <Clock className="w-3 h-3 text-[#1D1D1D]/30" />
          <span className="text-[8px] text-[#1D1D1D]/30">Sent</span>
        </>
      )}
      <span className="text-[8px] text-[#1D1D1D]/20 ml-1">
        {new Date(message.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    </div>
  );
};

// ── User Directory Modal ──────────────────────────────────────────────────
const UserDirectoryModal = ({ 
  isOpen, 
  onClose, 
  currentUserId,
  userType,
  onStartChat 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentUserId: string;
  userType: string;
  onStartChat: (user: UserDirectoryItem) => void;
}) => {
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'creators' | 'businesses' | 'admin'>('all');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setupPresence();
    }
  }, [isOpen, search, filter]);

  const setupPresence = () => {
    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presence: any) => {
          presence.forEach((p: any) => online.add(p.user_id));
        });
        setOnlineUsers(online);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersList: UserDirectoryItem[] = [];

      // Fetch creators
      if (filter === 'all' || filter === 'creators') {
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('user_id, full_name, avatar_url, username, category, followers, verified')
          .neq('user_id', currentUserId)
          .ilike('full_name', `%${search}%`)
          .limit(20);

        if (creators) {
          creators.forEach(c => {
            usersList.push({
              id: c.user_id,
              user_id: c.user_id,
              name: c.full_name || 'Creator',
              email: '',
              avatar: c.avatar_url,
              type: 'creator',
              username: c.username,
              category: c.category,
              followers: c.followers,
              verified: c.verified
            });
          });
        }
      }

      // Fetch businesses
      if (filter === 'all' || filter === 'businesses') {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('user_id, business_name, logo_url, industry, verified')
          .neq('user_id', currentUserId)
          .ilike('business_name', `%${search}%`)
          .limit(20);

        if (businesses) {
          businesses.forEach(b => {
            usersList.push({
              id: b.user_id,
              user_id: b.user_id,
              name: b.business_name || 'Business',
              email: '',
              avatar: b.logo_url,
              type: 'business',
              company_name: b.business_name,
              category: b.industry,
              verified: b.verified
            });
          });
        }
      }

      // Fetch admins (for business users)
      if (userType === 'business' && (filter === 'all' || filter === 'admin')) {
        const { data: admins } = await supabase
          .from('admin_profiles')
          .select('id, full_name, avatar_url')
          .neq('id', currentUserId)
          .ilike('full_name', `%${search}%`)
          .limit(10);

        if (admins) {
          admins.forEach(a => {
            usersList.push({
              id: a.id,
              user_id: a.id,
              name: a.full_name || 'Admin',
              email: '',
              avatar: a.avatar_url,
              type: 'admin'
            });
          });
        }
      }

      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white border-2 border-[#1D1D1D] max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest italic">Start New Chat</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1D1D1D]/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-white border-2 border-[#1D1D1D] pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-[#389C9A] transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'creators', 'businesses', userType === 'business' ? 'admin' : ''].filter(Boolean).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border-2 border-[#1D1D1D] transition-colors ${
                  filter === f
                    ? 'bg-[#1D1D1D] text-white'
                    : 'bg-white hover:bg-[#1D1D1D]/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-2 border-[#1D1D1D] border-t-[#389C9A] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#F8F8F8] mx-auto mb-4 flex items-center justify-center border-2 border-[#1D1D1D]/10">
                <Users className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No users found</p>
              <p className="text-[8px] opacity-30 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  onStartChat(user);
                  onClose();
                }}
                className="flex items-center gap-4 p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 border-2 border-[#1D1D1D]/10 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#F8F8F8] flex items-center justify-center">
                        {user.type === 'admin' ? (
                          <Shield className="w-5 h-5 text-purple-600" />
                        ) : user.type === 'business' ? (
                          <Building2 className="w-5 h-5 text-[#389C9A]" />
                        ) : (
                          <User className="w-5 h-5 text-[#FEDB71]" />
                        )}
                      </div>
                    )}
                  </div>
                  {onlineUsers.has(user.user_id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black uppercase tracking-widest truncate">
                      {user.name}
                    </p>
                    {user.verified && (
                      <CheckCircle2 className="w-3 h-3 text-[#389C9A] flex-shrink-0" />
                    )}
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 flex-shrink-0 ${
                      user.type === 'admin' ? 'bg-purple-100 text-purple-600' :
                      user.type === 'business' ? 'bg-[#389C9A]/10 text-[#389C9A]' :
                      'bg-[#FEDB71]/10 text-[#D4A800]'
                    }`}>
                      {user.type}
                    </span>
                  </div>
                  {user.username && (
                    <p className="text-[9px] opacity-40 mb-1">@{user.username}</p>
                  )}
                  {user.category && (
                    <p className="text-[8px] opacity-30">{user.category}</p>
                  )}
                  {user.followers !== undefined && (
                    <p className="text-[8px] opacity-30">{user.followers.toLocaleString()} followers</p>
                  )}
                </div>

                {/* Action */}
                <button className="p-2 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Full Chat Modal ────────────────────────────────────────────────────────
const ChatModal = ({ 
  isOpen, 
  onClose, 
  participant,
  currentUserId,
  userType
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  participant: UserProfile;
  currentUserId: string;
  userType: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!isOpen || !participant) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            reactions:message_reactions(*)
          `)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${participant.user_id}),and(sender_id.eq.${participant.user_id},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true, seen: true, read_at: new Date().toISOString() })
          .eq('sender_id', participant.user_id)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);

      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Setup presence
    const presenceChannel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presence: any) => {
          presence.forEach((p: any) => online.add(p.user_id));
        });
        setOnline(online.has(participant.user_id));
      })
      .subscribe();

    // Setup typing indicators
    const typingChannel = supabase.channel('typing-indicators')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === participant.user_id) {
          setTyping(payload.isTyping);
          if (payload.isTyping) {
            setTimeout(() => setTyping(false), 3000);
          }
        }
      })
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages-${participant.user_id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === participant.user_id || newMsg.receiver_id === participant.user_id) {
            setMessages(prev => [...prev, newMsg]);
            
            // Mark as read if received
            if (newMsg.sender_id === participant.user_id) {
              supabase
                .from('messages')
                .update({ is_read: true, seen: true })
                .eq('id', newMsg.id);
            }
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [isOpen, participant, currentUserId]);

  const handleTyping = (isTyping: boolean) => {
    if (!participant) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    supabase.channel('typing-indicators').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping }
    });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setAttachment(file);
  };

  const uploadAttachment = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `message-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !participant || sending) return;

    setSending(true);

    try {
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentName = null;
      let attachmentSize = null;

      if (attachment) {
        attachmentUrl = await uploadAttachment(attachment);
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 
                        attachment.type.startsWith('video/') ? 'video' :
                        attachment.type.startsWith('audio/') ? 'audio' : 'file';
        attachmentName = attachment.name;
        attachmentSize = attachment.size;
      }

      const now = new Date().toISOString();

      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId,
        receiver_id: participant.user_id,
        content: newMessage,
        sender_name: 'You',
        sender_type: userType as any,
        created_at: now,
        is_read: false,
        seen: false,
        reactions: [],
        reply_to_id: replyingTo?.id
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setAttachment(null);
      setReplyingTo(null);
      handleTyping(false);

      // Insert into database
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: participant.user_id,
          content: newMessage,
          sender_name: 'You',
          sender_type: userType,
          is_read: false,
          seen: false,
          created_at: now,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
          attachment_size: attachmentSize,
          reply_to_id: replyingTo?.id
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const addReaction = async (messageId: string, reaction: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const removeReaction = async (messageId: string, reaction: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('reaction', reaction);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    try {
      // Create call session
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          room_id: `call-${Date.now()}`,
          participants: [{
            user_id: currentUserId,
            name: 'You',
            joined_at: new Date().toISOString(),
            audio_enabled: true,
            video_enabled: type === 'video'
          }],
          started_at: new Date().toISOString(),
          status: 'ringing',
          type
        })
        .select()
        .single();

      if (error) throw error;

      // Notify other participant
      await supabase
        .from('notifications')
        .insert({
          user_id: participant.user_id,
          type: 'call',
          title: `Incoming ${type} call`,
          message: `${userType === 'business' ? 'Business' : 'Creator'} is calling you`,
          data: { call_id: session.id, type }
        });

      setActiveCall(session);
      toast.success(`Calling ${participant.name}...`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Message Bubble Component
  const MessageBubble = ({ message }: { message: Message }) => {
    const isMe = message.sender_id === currentUserId;
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Reply indicator */}
          {message.reply_to_id && (
            <div className="mb-1 px-3 py-1.5 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[9px] text-[#1D1D1D]/40">
              Replying to a message
            </div>
          )}

          {/* Attachment */}
          {message.attachment_url && (
            <div className="mb-2">
              {message.attachment_type === 'image' ? (
                <img
                  src={message.attachment_url}
                  alt="Attachment"
                  className="max-w-[300px] max-h-[300px] border-2 border-[#1D1D1D]/10 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.attachment_url, '_blank')}
                />
              ) : message.attachment_type === 'video' ? (
                <video
                  src={message.attachment_url}
                  controls
                  className="max-w-[300px] max-h-[300px] border-2 border-[#1D1D1D]/10"
                />
              ) : (
                <a
                  href={message.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 hover:bg-[#1D1D1D]/5 transition-colors group"
                >
                  <div className="p-2 bg-[#389C9A]/10">
                    <Paperclip className="w-4 h-4 text-[#389C9A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{message.attachment_name || 'Attachment'}</p>
                    {message.attachment_size && (
                      <p className="text-[8px] opacity-40 mt-0.5">{formatFileSize(message.attachment_size)}</p>
                    )}
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <div
              className={`px-4 py-2.5 text-sm break-words border-2 border-[#1D1D1D] ${
                isMe
                  ? 'bg-[#389C9A] text-white'
                  : 'bg-white'
              }`}
            >
              {message.content}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onAddReaction={(reaction) => {
                const userReaction = message.reactions?.find(
                  r => r.user_id === currentUserId && r.reaction === reaction
                );
                if (userReaction) {
                  removeReaction(message.id, reaction);
                } else {
                  addReaction(message.id, reaction);
                }
              }}
              currentUserId={currentUserId}
            />
          )}

          {/* Status */}
          <MessageStatus message={message} isMe={isMe} />
        </div>

        {/* Message Actions */}
        <AnimatePresence>
          {showActions && !isMe && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute left-0 -top-8 flex gap-1 bg-white border-2 border-[#1D1D1D] p-1 z-10"
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 hover:bg-[#1D1D1D]/5 transition-colors relative"
              >
                <Smile className="w-3.5 h-3.5" />
                <AnimatePresence>
                  {showReactions && (
                    <ReactionPicker
                      onSelect={(reaction) => {
                        addReaction(message.id, reaction);
                        setShowReactions(false);
                      }}
                      onClose={() => setShowReactions(false)}
                    />
                  )}
                </AnimatePresence>
              </button>
              <button
                onClick={() => setReplyingTo(message)}
                className="p-1.5 hover:bg-[#1D1D1D]/5 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white border-2 border-[#1D1D1D] w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1D1D1D]/10 transition-colors lg:hidden"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 border-2 border-[#1D1D1D]/10 overflow-hidden">
                {participant.avatar ? (
                  <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#F8F8F8] flex items-center justify-center">
                    {participant.type === 'admin' ? (
                      <Shield className="w-5 h-5 text-purple-600" />
                    ) : participant.type === 'business' ? (
                      <Building2 className="w-5 h-5 text-[#389C9A]" />
                    ) : (
                      <User className="w-5 h-5 text-[#FEDB71]" />
                    )}
                  </div>
                )}
              </div>
              {online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black uppercase tracking-widest">{participant.name}</h3>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 ${
                  participant.type === 'admin' ? 'bg-purple-100 text-purple-600' :
                  participant.type === 'business' ? 'bg-[#389C9A]/10 text-[#389C9A]' :
                  'bg-[#FEDB71]/10 text-[#D4A800]'
                }`}>
                  {participant.type}
                </span>
              </div>
              <p className="text-[9px] opacity-40">
                {online ? 'Online' : typing ? 'Typing...' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => startCall('audio')}
              className="p-2 hover:bg-[#1D1D1D]/10 transition-colors"
              title="Voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => startCall('video')}
              className="p-2 hover:bg-[#1D1D1D]/10 transition-colors"
              title="Video call"
            >
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-[#1D1D1D]/10 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-[#1D1D1D] border-t-[#389C9A] rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-[#F8F8F8] mb-4 flex items-center justify-center border-2 border-[#1D1D1D]/10">
                <MessageSquare className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
              <p className="text-[8px] opacity-30 mt-2">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          
          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#1D1D1D]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#1D1D1D]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#1D1D1D]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-2 bg-[#F8F8F8] border-t-2 border-[#1D1D1D] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Reply className="w-3 h-3 opacity-40" />
                <span className="text-[9px] opacity-40">
                  Replying to: {replyingTo.content.substring(0, 50)}
                  {replyingTo.content.length > 50 && '...'}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-[#1D1D1D]/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t-2 border-[#1D1D1D] bg-[#F8F8F8]">
          {/* Attachment preview */}
          {attachment && (
            <div className="mb-3 p-3 bg-white border-2 border-[#1D1D1D]/10 flex items-center gap-3">
              {attachment.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(attachment)}
                  alt="Preview"
                  className="w-12 h-12 object-cover border-2 border-[#1D1D1D]/10"
                />
              ) : (
                <div className="w-12 h-12 bg-[#389C9A]/10 flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-[#389C9A]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{attachment.name}</p>
                <p className="text-[9px] opacity-40 mt-1">{formatFileSize(attachment.size)}</p>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="p-1 hover:bg-[#1D1D1D]/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border-2 border-[#1D1D1D] bg-white hover:bg-[#1D1D1D]/5 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 border-2 border-[#1D1D1D] bg-white hover:bg-[#1D1D1D]/5 transition-colors"
              >
                <Smile className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(true);
                }}
                onKeyDown={handleKeyPress}
                placeholder={`Message ${participant.name}...`}
                className="w-full bg-white border-2 border-[#1D1D1D] px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#389C9A] transition-colors"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !attachment) || sending}
              className="px-4 py-2 bg-[#1D1D1D] text-white border-2 border-[#1D1D1D] hover:bg-[#389C9A] hover:border-[#389C9A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN APPHEADER COMPONENT
// ============================================================================

export function AppHeader({
  title, showBack = false, backPath, showLogo = false,
  userType: userTypeProp, subtitle, showHome = false
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { profileType: detectedType } = useProfileType();
  const userType = userTypeProp ?? detectedType ?? "creator";

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  const [selectedChatParticipant, setSelectedChatParticipant] = useState<UserProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const isBusiness = userType === "business";
  const isAdmin    = userType === "admin";

  const settingsPath      = isBusiness ? "/business/settings"           : "/settings";
  const profilePath       = isBusiness ? "/business/profile"            : isAdmin ? "/admin" : "/profile/me";
  const messagesPath      = isBusiness ? "/messages?role=business"      : isAdmin ? "/messages?role=admin" : "/messages?role=creator";
  const notificationsPath = isBusiness ? "/notifications?role=business" : isAdmin ? "/notifications?role=admin" : "/notifications?role=creator";
  const dashboardPath     = isBusiness ? "/business/dashboard"          : isAdmin ? "/admin" : "/dashboard";

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      setUserAvatar(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadNotifications(count || 0);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setNotifications(data);
  };

  // Fetch conversations
  const fetchRecentConversations = async () => {
    if (!user) return;

    const { data: convs } = await supabase
      .from("conversations")
      .select(`
        *,
        messages:messages(
          id, content, created_at, sender_id, receiver_id, is_read, seen,
          reactions:message_reactions(*)
        )
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(5);

    if (!convs) return;

    let totalUnread = 0;
    const formatted = await Promise.all(
      convs.map(async (conv: any) => {
        const otherId = conv.participant1_id === user.id
          ? conv.participant2_id
          : conv.participant1_id;

        const other = await resolveParticipant(otherId);

        const msgs = conv.messages || [];
        const lastMsg = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m: any) => m.sender_id !== user.id && !m.is_read
        ).length;
        totalUnread += unread;

        return {
          ...conv,
          other_participant: other,
          last_message: lastMsg,
          unread_count: unread
        };
      })
    );

    setRecentConversations(formatted);
    setUnreadMessages(totalUnread);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications();
    fetchRecentConversations();

    // Realtime subscriptions
    const notifSub = supabase
      .channel("header_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setUnreadNotifications((p) => p + 1);
          setNotifications((p) => [n, ...p].slice(0, 5));
          
          if (n.type === "message") {
            toast.info(n.title, { 
              description: n.message, 
              icon: <MessageSquare className="w-4 h-4" />,
              action: { label: "View", onClick: () => setShowMessages(true) }
            });
          } else if (n.type === "call") {
            toast.info(n.title, { 
              description: n.message, 
              icon: <Phone className="w-4 h-4" />,
              action: { label: "Answer", onClick: () => handleIncomingCall(n.data) }
            });
          } else if (n.type === "offer") {
            toast.success(n.title, { 
              description: n.message, 
              icon: "🎯",
              action: { label: "View", onClick: () => navigate("/offers") }
            });
          } else {
            toast.info(n.title, { description: n.message });
          }
        }
      )
      .subscribe();

    const msgSub = supabase
      .channel("header_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchRecentConversations()
      )
      .subscribe();

    return () => {
      notifSub.unsubscribe();
      msgSub.unsubscribe();
    };
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowMessages(false);
      navigate("/");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const handleIncomingCall = (callData: any) => {
    // Handle incoming call - would show call interface
    console.log('Incoming call:', callData);
  };

  const startChatWithUser = (user: UserDirectoryItem) => {
    const participant: UserProfile = {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      type: user.type,
      username: user.username,
      company_name: user.company_name
    };
    setSelectedChatParticipant(participant);
  };

  const markNotificationAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setUnreadNotifications((p) => Math.max(0, p - 1));
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setUnreadNotifications(0);
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offer":    return <Briefcase className="w-4 h-4 text-[#389C9A]" />;
      case "campaign": return <Calendar className="w-4 h-4 text-[#FEDB71]" />;
      case "payment":  return <DollarSign className="w-4 h-4 text-green-500" />;
      case "message":  return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "call":     return <Phone className="w-4 h-4 text-purple-500" />;
      default:         return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const participantAvatarEl = (conv: Conversation, size = "sm") => {
    const dim = size === "sm" ? "w-10 h-10" : "w-8 h-8";
    const other = conv.other_participant;
    
    if (!other) return null;

    if (other.type === "admin") {
      return (
        <div className={`${dim} bg-purple-600 flex items-center justify-center flex-shrink-0 border-2 border-[#1D1D1D]`}>
          <Shield className="w-4 h-4 text-white" />
        </div>
      );
    }
    
    return (
      <div className={`${dim} border-2 border-[#1D1D1D] overflow-hidden flex-shrink-0`}>
        {other.avatar ? (
          <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#F8F8F8] flex items-center justify-center">
            {other.type === "business" ? (
              <Building2 className="w-4 h-4 text-[#389C9A]" />
            ) : (
              <User className="w-4 h-4 text-[#FEDB71]" />
            )}
          </div>
        )}
      </div>
    );
  };

  const typeBadgeColor = (type: string) => {
    if (type === "admin")    return "text-purple-600";
    if (type === "business") return "text-[#389C9A]";
    return "text-[#FEDB71]";
  };

  const isHome      = location.pathname === "/";
  const isMessages  = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages && isAuthenticated;

  return (
    <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showHome && (
            <button
              onClick={() => navigate(dashboardPath)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          {showLogo && (
            <div
              className="flex flex-col cursor-pointer"
              onClick={() => navigate(isAuthenticated ? dashboardPath : "/")}
            >
              <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1D1D1D] flex items-center justify-center text-white text-[8px] italic">LL</div>
                LiveLink
              </h1>
              {subtitle && (
                <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-40 mt-0.5">{subtitle}</span>
              )}
            </div>
          )}
          {title && !showLogo && (
            <h1 className="text-xl font-black uppercase tracking-tighter italic">{title}</h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 relative">
          {showActions && (
            <>
              {/* ── New Chat Button ── */}
              <button
                onClick={() => setShowUserDirectory(true)}
                className="p-1.5 hover:bg-[#1D1D1D]/5 transition-colors border-2 border-[#1D1D1D] hidden sm:flex items-center gap-1"
                title="Start new chat"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">New Chat</span>
              </button>

              {/* ── Messages button ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors border border-transparent active:border-[#1D1D1D]/10"
                  aria-label="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#389C9A] border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-white px-1">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    </div>
                  )}
                </button>

                {/* ── Messages Dropdown ── */}
                <AnimatePresence>
                  {showMessages && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMessages(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
                      >
                        {/* Header */}
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#389C9A]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Messages</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setShowMessages(false);
                                setShowUserDirectory(true);
                              }}
                              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              New
                            </button>
                            {unreadMessages > 0 && (
                              <span className="bg-[#389C9A] text-white text-[8px] font-black px-2 py-1">
                                {unreadMessages} unread
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Conversation list */}
                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {recentConversations.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border-2 border-[#1D1D1D]/10">
                                <Send className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No messages yet</p>
                              <p className="text-[8px] opacity-30 mt-1">
                                <button
                                  onClick={() => {
                                    setShowMessages(false);
                                    setShowUserDirectory(true);
                                  }}
                                  className="text-[#389C9A] hover:underline"
                                >
                                  Start a conversation
                                </button>
                              </p>
                            </div>
                          ) : (
                            recentConversations.map((conv) => (
                              <div
                                key={conv.id}
                                onClick={() => {
                                  setShowMessages(false);
                                  setSelectedChatParticipant(conv.other_participant!);
                                }}
                                className={`flex items-start gap-3 p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer ${
                                  conv.unread_count ? "bg-[#389C9A]/5" : ""
                                }`}
                              >
                                {/* Avatar */}
                                {participantAvatarEl(conv)}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <p className={`text-[11px] font-black uppercase tracking-widest truncate ${
                                        conv.unread_count ? "text-[#1D1D1D]" : "text-[#1D1D1D]/70"
                                      }`}>
                                        {conv.other_participant?.name}
                                      </p>
                                      <span className={`text-[7px] font-black uppercase ${typeBadgeColor(conv.other_participant?.type || '')} flex-shrink-0`}>
                                        · {conv.other_participant?.type === "admin" ? "Admin" : 
                                           conv.other_participant?.type === "business" ? "Biz" : "Creator"}
                                      </span>
                                    </div>
                                    <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                      {formatTimestamp(conv.last_message?.created_at || conv.last_message_at)}
                                    </span>
                                  </div>
                                  <p className={`text-[9px] line-clamp-1 break-words ${
                                    conv.unread_count ? "text-[#1D1D1D] font-bold" : "opacity-50"
                                  }`}>
                                    {conv.last_message?.content || "No messages yet"}
                                  </p>
                                </div>

                                {/* Unread dot */}
                                {conv.unread_count ? (
                                  <div className="w-2 h-2 bg-[#389C9A] rounded-full flex-shrink-0 mt-1" />
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
                          <Link
                            to={messagesPath}
                            onClick={() => setShowMessages(false)}
                            className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                          >
                            View All Messages →
                          </Link>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Notifications button ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black flex items-center justify-center border border-[#1D1D1D]">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </div>
                  )}
                </button>

                {/* ── Notifications Dropdown ── */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-[#1D1D1D] shadow-xl z-50 max-w-[calc(100vw-2rem)]"
                        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
                      >
                        <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8] flex justify-between items-center sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#FEDB71]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Notifications</h3>
                          </div>
                          {unreadNotifications > 0 && (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                            >
                              Mark All Read
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="w-12 h-12 bg-[#F8F8F8] mx-auto mb-3 flex items-center justify-center border-2 border-[#1D1D1D]/10">
                                <Bell className="w-5 h-5 opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                              <p className="text-[8px] opacity-30 mt-1">We'll notify you when something happens</p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => markNotificationAsRead(notif.id)}
                                className={`p-4 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors cursor-pointer ${
                                  !notif.is_read ? "bg-[#FEDB71]/5" : ""
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="text-[11px] font-black uppercase tracking-widest truncate">{notif.title}</p>
                                      <span className="text-[8px] opacity-40 whitespace-nowrap ml-2 flex-shrink-0">
                                        {formatTimestamp(notif.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] opacity-60 line-clamp-2 break-words">{notif.message}</p>
                                  </div>
                                  {!notif.is_read && <div className="w-2 h-2 bg-[#FEDB71] flex-shrink-0 mt-2" />}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="p-3 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] sticky bottom-0">
                            <Link
                              to={notificationsPath}
                              onClick={() => setShowNotifications(false)}
                              className="block text-center text-[9px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                            >
                              View All Notifications →
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* ── Profile Menu ── */}
          <div className="relative ml-1">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                  setShowMessages(false);
                } else {
                  navigate("/login/portal");
                }
              }}
              className="w-9 h-9 border-2 border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform overflow-hidden"
              aria-label="Profile menu"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : isAdmin ? (
                <Shield className="w-4 h-4 text-purple-600" />
              ) : isBusiness ? (
                <Building2 className="w-4 h-4 text-[#389C9A]" />
              ) : (
                <User className="w-4 h-4 text-[#FEDB71]" />
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && isAuthenticated && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-64 bg-white border-2 border-[#1D1D1D] shadow-xl z-50"
                  >
                    <div className="p-4 border-b-2 border-[#1D1D1D] bg-[#F8F8F8]">
                      <div className="flex items-center gap-3 mb-3">
                        {userAvatar ? (
                          <img src={userAvatar} alt={userName} className="w-10 h-10 border-2 border-[#1D1D1D]/10 object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-[#1D1D1D]/5 border-2 border-[#1D1D1D]/10 flex items-center justify-center">
                            {isAdmin ? (
                              <Shield className="w-5 h-5 text-purple-600" />
                            ) : isBusiness ? (
                              <Building2 className="w-5 h-5 text-[#389C9A]" />
                            ) : (
                              <User className="w-5 h-5 text-[#FEDB71]" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest truncate">{userName}</p>
                          <p className="text-[8px] font-medium opacity-40 truncate">{user?.email}</p>
                        </div>
                      </div>
                      {/* Role badge */}
                      <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 w-fit border-2 border-current ${
                        isAdmin    ? "text-purple-600 bg-purple-50" :
                        isBusiness ? "text-[#389C9A] bg-[#389C9A]/10" :
                                     "text-[#FEDB71] bg-[#FEDB71]/10"
                      }`}>
                        {isAdmin    ? <Shield className="w-3 h-3" /> :
                         isBusiness ? <Building2 className="w-3 h-3" /> :
                                      <CheckCircle className="w-3 h-3" />}
                        <span>{isAdmin ? "Admin" : isBusiness ? "Business" : "Creator"}</span>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowUserDirectory(true);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#389C9A]" />
                        New Chat
                      </button>

                      {!isAdmin && (
                        <Link
                          to={profilePath}
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-[#389C9A]" /> Profile
                        </Link>
                      )}

                      <Link
                        to={dashboardPath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                      >
                        {isAdmin ? <Shield className="w-3.5 h-3.5 text-purple-600" /> :
                         isBusiness ? <Briefcase className="w-3.5 h-3.5 text-[#389C9A]" /> :
                                      <Home className="w-3.5 h-3.5 text-[#389C9A]" />}
                        Dashboard
                      </Link>

                      <Link
                        to={messagesPath}
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#389C9A]" />
                        Messages
                        {unreadMessages > 0 && (
                          <span className="ml-auto text-[7px] font-black bg-[#389C9A] text-white px-1.5 py-0.5 rounded-full">
                            {unreadMessages}
                          </span>
                        )}
                      </Link>

                      {!isAdmin && (
                        <Link
                          to={settingsPath}
                          onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#389C9A]" /> Settings
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white text-red-500 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showUserDirectory && (
          <UserDirectoryModal
            isOpen={showUserDirectory}
            onClose={() => setShowUserDirectory(false)}
            currentUserId={user?.id || ''}
            userType={userType}
            onStartChat={startChatWithUser}
          />
        )}

        {selectedChatParticipant && (
          <ChatModal
            isOpen={!!selectedChatParticipant}
            onClose={() => setSelectedChatParticipant(null)}
            participant={selectedChatParticipant}
            currentUserId={user?.id || ''}
            userType={userType}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
