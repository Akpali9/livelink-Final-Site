import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import {
  MessageSquare,
  Send,
  Search,
  User,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Filter,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  AtSign,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Reply,
  MoreVertical,
  CheckCheck,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithFallback } from "../components/ImageWithFallback";

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

export function AdminMessages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Get admin user
  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    };
    getAdmin();
  }, []);

  // Fetch all conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Get all messages where admin is involved
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          is_read
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const conversationMap = new Map();
      
      for (const msg of messages || []) {
        if (!conversationMap.has(msg.conversation_id)) {
          const { data: participants } = await supabase
            .from("conversations")
            .select("participant1_id, participant2_id, participant1_type, participant2_type")
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
            const { data: profile } = await supabase
              .from(table)
              .select(otherParticipantType === "creator" 
                ? "id, full_name, avatar_url, email" 
                : "id, business_name as full_name, logo_url as avatar_url, email"
              )
              .eq("user_id", otherParticipantId)
              .single();

            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", msg.conversation_id)
              .eq("sender_id", otherParticipantId)
              .eq("is_read", false);

            conversationMap.set(msg.conversation_id, {
              id: msg.conversation_id,
              participant_id: otherParticipantId,
              participant_name: profile?.full_name || "Unknown",
              participant_avatar: profile?.avatar_url || "",
              participant_type: otherParticipantType,
              last_message: msg.content,
              last_message_time: msg.created_at,
              last_message_sender: msg.sender_id === adminUser?.id ? "You" : "Them",
              unread_count: count || 0
            });
          }
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
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
      toast.error("Failed to load messages");
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
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    setSending(true);
    try {
      const attachmentUrls = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileName = `${selectedConversation.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(fileName);
          attachmentUrls.push({
            url: publicUrl,
            type: file.type,
            name: file.name,
            size: file.size
          });
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: adminUser?.id,
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
            ? {
                ...conv,
                last_message: messageInput.trim(),
                last_message_time: new Date().toISOString(),
                last_message_sender: "You"
              }
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
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const [creators, businesses] = await Promise.all([
        supabase.from("creator_profiles")
          .select("id, user_id, full_name, email, avatar_url, status, created_at")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(10),
        supabase.from("businesses")
          .select("id, user_id, business_name, email, logo_url, status, created_at")
          .or(`business_name.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10)
      ]);

      const results: UserProfile[] = [
        ...(creators.data || []).map(c => ({
          id: c.id,
          user_id: c.user_id,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
          email: c.email,
          type: "creator" as const,
          status: c.status,
          created_at: c.created_at
        })),
        ...(businesses.data || []).map(b => ({
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
        const conv = conversations.find(c => c.id === existing.id);
        if (conv) {
          setSelectedConversation(conv);
        } else {
          await fetchConversations();
          setSelectedConversation(conversations.find(c => c.id === existing.id) || null);
        }
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
      setSearchQuery("");
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === "unread") return matchesSearch && conv.unread_count > 0;
    if (filter === "creators") return matchesSearch && conv.participant_type === "creator";
    if (filter === "businesses") return matchesSearch && conv.participant_type === "business";
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Messages" userType="admin" />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D]">
      <Toaster position="top-center" richColors />
      <AppHeader showBack title="Messages" userType="admin" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Conversations Sidebar */}
        <div className="w-96 border-r border-[#1D1D1D]/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#1D1D1D]/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black uppercase tracking-tight italic">Messages</h2>
              <button
                onClick={() => setShowUserSearch(true)}
                className="p-2 bg-[#1D1D1D] text-white rounded-lg hover:bg-[#389C9A] transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-2 mt-4">
              {[
                { value: "all", label: "All", icon: MessageSquare },
                { value: "unread", label: "Unread", icon: CheckCheck },
                { value: "creators", label: "Creators", icon: Users },
                { value: "businesses", label: "Businesses", icon: Building2 }
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value as any)}
                    className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 transition-colors ${
                      filter === f.value
                        ? "bg-[#1D1D1D] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">No conversations found</p>
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="mt-4 text-[#389C9A] text-sm font-black hover:underline"
                >
                  Start a new conversation
                </button>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 border-b border-[#1D1D1D]/10 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-[#389C9A]/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    {conv.participant_avatar ? (
                      <ImageWithFallback
                        src={conv.participant_avatar}
                        className="w-12 h-12 rounded-full border-2 border-[#1D1D1D]/10 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
                        {getInitials(conv.participant_name)}
                      </div>
                    )}
                    {conv.participant_type === 'creator' ? (
                      <Users className="absolute -bottom-1 -right-1 w-4 h-4 p-0.5 bg-[#389C9A] text-white rounded-full" />
                    ) : (
                      <Building2 className="absolute -bottom-1 -right-1 w-4 h-4 p-0.5 bg-[#FEDB71] text-[#1D1D1D] rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-black text-sm truncate ${
                        conv.unread_count > 0 ? 'text-[#1D1D1D]' : 'text-gray-600'
                      }`}>
                        {conv.participant_name}
                      </h3>
                      <span className="text-[8px] text-gray-400 whitespace-nowrap ml-2">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-500 truncate">
                        {conv.last_message_sender}: {conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[#389C9A] text-white text-[8px] font-black rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-[#1D1D1D]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConversation.participant_avatar ? (
                    <ImageWithFallback
                      src={selectedConversation.participant_avatar}
                      className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
                      {getInitials(selectedConversation.participant_name)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-sm">{selectedConversation.participant_name}</h3>
                    <div className="flex items-center gap-2 text-[8px] text-gray-500">
                      <span className="flex items-center gap-1">
                        {selectedConversation.participant_type === 'creator' ? (
                          <Users className="w-3 h-3" />
                        ) : (
                          <Building2 className="w-3 h-3" />
                        )}
                        {selectedConversation.participant_type}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        View Profile
                      </span>
                    </div>
                  </div>
                </div>

                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, index) => {
                  const isAdmin = msg.sender_id === adminUser?.id;
                  const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
                        {!isAdmin && showAvatar && (
                          selectedConversation.participant_avatar ? (
                            <ImageWithFallback
                              src={selectedConversation.participant_avatar}
                              className="w-8 h-8 rounded-full border-2 border-[#1D1D1D]/10 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-black text-xs shrink-0">
                              {getInitials(selectedConversation.participant_name)}
                            </div>
                          )
                        )}

                        <div>
                          <div
                            className={`p-4 rounded-2xl text-sm ${
                              isAdmin
                                ? 'bg-[#1D1D1D] text-white rounded-tr-none'
                                : 'bg-gray-100 text-[#1D1D1D] rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                                      isAdmin ? 'bg-white/10' : 'bg-white'
                                    }`}
                                  >
                                    {att.type.startsWith('image/') ? (
                                      <ImageIcon className="w-4 h-4 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="truncate flex-1">{att.name}</span>
                                    <Download className="w-3 h-3 shrink-0 opacity-50" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className={`flex items-center gap-2 mt-1 text-[8px] text-gray-400 ${
                            isAdmin ? 'justify-end' : 'justify-start'
                          }`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isAdmin && (
                              <span className="flex items-center gap-1">
                                {msg.is_read ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-[#389C9A]" />
                                    <span className="text-[#389C9A]">Read</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCheck className="w-3 h-3" />
                                    <span>Sent</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[#1D1D1D]/10">
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2"
                    >
                      {attachments.map((file, index) => (
                        <div key={index} className="relative shrink-0">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded-lg border-2 border-[#1D1D1D]/10"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-[#1D1D1D]/10 flex flex-col items-center justify-center p-2">
                              <FileText className="w-6 h-6 text-gray-400 mb-1" />
                              <p className="text-[6px] font-medium truncate w-full text-center">{file.name}</p>
                            </div>
                          )}
                          <button
                            onClick={() => removeAttachment(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </label>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-lg"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() && attachments.length === 0 || sending}
                    className={`p-3 rounded-lg transition-colors ${
                      messageInput.trim() || attachments.length > 0
                        ? 'bg-[#1D1D1D] text-white hover:bg-[#389C9A]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tight italic mb-2">
                No Conversation Selected
              </h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Select a conversation from the list or start a new one to message creators and businesses.
              </p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="px-6 py-3 bg-[#1D1D1D] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
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
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => {
                setShowUserSearch(false);
                setSearchResults([]);
                setSearchQuery("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white p-6 z-50 rounded-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase tracking-tight italic">New Message</h3>
                <button
                  onClick={() => {
                    setShowUserSearch(false);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search creators or businesses..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-lg"
                  autoFocus
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => startNewConversation(user)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {user.avatar_url || user.logo_url ? (
                          <ImageWithFallback
                            src={user.avatar_url || user.logo_url || ""}
                            className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
                            {getInitials(user.full_name || user.business_name || "")}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm">{user.full_name || user.business_name}</p>
                          <div className="flex items-center gap-2 text-[8px] text-gray-500">
                            <span className="flex items-center gap-1">
                              {user.type === 'creator' ? (
                                <Users className="w-3 h-3" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                              {user.type}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <p className="text-center py-8 text-gray-500">No users found</p>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    Start typing to search for creators or businesses
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
