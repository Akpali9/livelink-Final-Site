import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  X, 
  User, 
  Building2,
  MoreVertical,
  Search,
  ArrowLeft,
  CheckCheck,
  Loader2,
  Phone,
  Video,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/ImageWithFallback";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: "creator" | "business" | "admin";
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

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business";
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export function Messages() {
  const navigate = useNavigate();
  const { id: conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const role = searchParams.get("role") || "creator";
  const isCreator = role === "creator";
  const backPath = isCreator ? "/dashboard" : "/business/dashboard";

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const table = isCreator ? "creator_profiles" : "businesses";
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setUserProfile(data);
      }
    };
    
    fetchProfile();
  }, [user, isCreator]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
      
      // Subscribe to new messages
      const subscription = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if current user is viewing
          if (newMessage.sender_id !== user.id) {
            markAsRead(newMessage.id);
          }
        })
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data: conversationsData, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const formattedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const otherId = conv.participant1_id === user?.id 
            ? conv.participant2_id 
            : conv.participant1_id;
          const otherType = conv.participant1_id === user?.id 
            ? conv.participant2_type 
            : conv.participant1_type;

          // Get other participant's profile
          const table = otherType === "creator" ? "creator_profiles" : "businesses";
          const { data: profile } = await supabase
            .from(table)
            .select("*")
            .eq("user_id", otherId)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("sender_id", otherId)
            .eq("is_read", false);

          const name = otherType === "creator" 
            ? profile?.full_name || "Creator"
            : profile?.business_name || "Business";
          const avatar = otherType === "creator"
            ? profile?.avatar_url
            : profile?.logo_url;

          return {
            id: conv.id,
            participant_id: otherId,
            participant_name: name,
            participant_avatar: avatar,
            participant_type: otherType,
            last_message: conv.last_message || "No messages yet",
            last_message_time: conv.last_message_at || conv.created_at,
            unread_count: count || 0,
          };
        })
      );

      setConversations(formattedConversations);
      
      // If there's a conversation ID in URL, select it
      if (conversationId) {
        const conv = formattedConversations.find(c => c.id === conversationId);
        if (conv) setSelectedConversation(conv);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markConversationAsRead = async (convId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .neq("sender_id", user?.id)
        .eq("is_read", false);
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === convId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

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

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    setSending(true);
    try {
      const attachmentUrls: any[] = [];

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
          
          attachmentUrls.push({ url: publicUrl, type: file.type, name: file.name, size: file.size });
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          sender_type: isCreator ? "creator" : "business",
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
        .update({ 
          last_message: messageInput.trim(),
          last_message_at: new Date().toISOString()
        })
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
                last_message_time: new Date().toISOString() 
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

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Messages" backPath={backPath} userType={isCreator ? "creator" : "business"} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Messages" backPath={backPath} userType={isCreator ? "creator" : "business"} />
      
      <div className="flex h-[calc(100vh-140px)] max-w-[480px] mx-auto w-full">
        {/* Conversations Sidebar */}
        <div className={`border-r border-[#1D1D1D]/10 flex flex-col ${selectedConversation ? 'hidden md:flex w-80' : 'flex w-full'}`}>
          <div className="p-4 border-b border-[#1D1D1D]/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">No conversations yet</p>
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
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
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
        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {selectedConversation.participant_avatar ? (
                    <img
                      src={selectedConversation.participant_avatar}
                      className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover"
                      alt={selectedConversation.participant_name}
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-400">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.sender_id === user?.id;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isCurrentUser
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
                                      isCurrentUser ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    {att.type.startsWith('image/')
                                      ? <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                      : <FileText className="w-3.5 h-3.5 shrink-0" />
                                    }
                                    <span className="truncate flex-1 text-[10px] font-medium">{att.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 text-[9px] text-gray-400 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isCurrentUser && (
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
                    id="file-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="file-upload"
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tighter italic mb-2">No Conversation Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Select a conversation from the sidebar to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default Messages;
