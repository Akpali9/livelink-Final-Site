import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  MessageSquare, Send, Paperclip, Image as ImageIcon, FileText,
  X, User, Building2, MoreVertical, Search, ArrowLeft,
  CheckCheck, Loader2, ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  attachments?: { url: string; type: string; name: string; size?: number }[];
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business" | "admin";
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Messages() {
  const { id: conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const role      = searchParams.get("role") || "creator";
  const isCreator = role === "creator";
  const backPath  = isCreator ? "/dashboard" : "/business/dashboard";

  const [loading, setLoading]                           = useState(true);
  const [conversations, setConversations]               = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages]                         = useState<Message[]>([]);
  const [messageInput, setMessageInput]                 = useState("");
  const [sending, setSending]                           = useState(false);
  const [searchQuery, setSearchQuery]                   = useState("");
  const [attachments, setAttachments]                   = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // ─── LOAD CONVERSATIONS ────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  // ─── SELECT CONVERSATION FROM URL PARAM ────────────────────────────────

  useEffect(() => {
    if (!conversationId || conversations.length === 0) return;
    const found = conversations.find((c) => c.id === conversationId);
    if (found) setSelectedConversation(found);
  }, [conversationId, conversations]);

  // ─── SUBSCRIBE TO SELECTED CONVERSATION ───────────────────────────────

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);
    markConversationAsRead(selectedConversation.id);

    const sub = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_id !== user?.id) markAsRead(msg.id);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [selectedConversation]);

  // ─── AUTO-SCROLL ───────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── FETCH HELPERS ─────────────────────────────────────────────────────

  const loadConversations = async () => {
    try {
      const { data: convData, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const formatted = await Promise.all((convData || []).map(async (conv) => {
        const otherId   = conv.participant1_id === user?.id ? conv.participant2_id   : conv.participant1_id;
        const otherType = conv.participant1_id === user?.id ? conv.participant2_type : conv.participant1_type;

        // Look up participant name/avatar
        let name   = "Unknown";
        let avatar = "";

        if (otherType === "creator") {
          const { data: p } = await supabase
            .from("creator_profiles").select("full_name, avatar_url")
            .eq("user_id", otherId).maybeSingle();
          if (p) { name = p.full_name || "Creator"; avatar = p.avatar_url || ""; }
        } else if (otherType === "business") {
          const { data: p } = await supabase
            .from("businesses").select("business_name, logo_url")
            .eq("user_id", otherId).maybeSingle();
          if (p) { name = p.business_name || "Business"; avatar = p.logo_url || ""; }
        } else if (otherType === "admin") {
          name = "LiveLink Support";
          avatar = "";
        }

        const { count } = await supabase
          .from("messages").select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id).eq("sender_id", otherId).eq("is_read", false);

        return {
          id:                  conv.id,
          participant_id:      otherId,
          participant_name:    name,
          participant_avatar:  avatar,
          participant_type:    otherType as "creator" | "business" | "admin",
          last_message:        conv.last_message || "No messages yet",
          last_message_time:   conv.last_message_at || conv.created_at,
          unread_count:        count || 0,
        };
      }));

      setConversations(formatted);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages").select("*").eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data || []);
  };

  const markConversationAsRead = async (convId: string) => {
    await supabase.from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", convId).neq("sender_id", user?.id).eq("is_read", false);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() }).eq("id", messageId);
  };

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;
    setSending(true);

    try {
      const attachmentUrls: any[] = [];
      for (const file of attachments) {
        const fileName = `${selectedConversation.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("message-attachments").upload(fileName, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage
          .from("message-attachments").getPublicUrl(fileName);
        attachmentUrls.push({ url: publicUrl, type: file.type, name: file.name, size: file.size });
      }

      const { data, error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id:       user?.id,
        content:         messageInput.trim(),
        is_read:         false,
        attachments:     attachmentUrls.length > 0 ? attachmentUrls : undefined,
        created_at:      new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      await supabase.from("conversations").update({
        last_message:    messageInput.trim(),
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConversation.id);

      setMessages((prev) => [...prev, data]);
      setMessageInput("");
      setAttachments([]);
      setConversations((prev) =>
        prev.map((c) => c.id === selectedConversation.id
          ? { ...c, last_message: messageInput.trim(), last_message_time: new Date().toISOString() }
          : c)
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ─── HELPERS ───────────────────────────────────────────────────────────

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const diff  = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  const ParticipantAvatar = ({ conv, size = "md" }: { conv: Conversation; size?: "sm" | "md" }) => {
    const s  = size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
    const bd = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

    if (conv.participant_type === "admin") {
      return (
        <div className={`${s} rounded-full bg-[#1D1D1D] text-white flex items-center justify-center shrink-0`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
      );
    }

    return (
      <div className="relative shrink-0">
        {conv.participant_avatar ? (
          <img src={conv.participant_avatar} alt={conv.participant_name}
            className={`${s} rounded-full border-2 border-[#1D1D1D]/10 object-cover`} />
        ) : (
          <div className={`${s} rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black`}>
            {getInitials(conv.participant_name)}
          </div>
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 ${bd} rounded-full border-2 border-white flex items-center justify-center ${
          conv.participant_type === "creator" ? "bg-[#389C9A]" : "bg-[#FEDB71]"
        }`}>
          {conv.participant_type === "creator"
            ? <User className="w-1.5 h-1.5 text-white" />
            : <Building2 className="w-1.5 h-1.5 text-[#1D1D1D]" />}
        </div>
      </div>
    );
  };

  const filteredConversations = conversations.filter((c) =>
    c.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── LOADING ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Messages" backPath={backPath} userType={isCreator ? "creator" : "business"} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Messages" backPath={backPath} userType={isCreator ? "creator" : "business"} />

      {/* Full-height chat layout — subtract header (84px) + bottom nav (60px) */}
      <div className="flex" style={{ height: "calc(100vh - 144px)" }}>

        {/* ── Conversations sidebar ── */}
        <div className={`border-r border-[#1D1D1D]/10 flex flex-col ${
          selectedConversation ? "hidden md:flex w-72" : "flex w-full"
        }`}>

          {/* Search */}
          <div className="p-4 border-b border-[#1D1D1D]/10 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm transition-colors"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                <MessageSquare className="w-12 h-12 text-gray-200" />
                <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
                <p className="text-xs text-gray-300">
                  {isCreator ? "Apply to campaigns to start chatting" : "Accept applications to start chatting"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 border-b border-[#1D1D1D]/10 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conv.id
                      ? "bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]"
                      : ""
                  }`}
                >
                  <ParticipantAvatar conv={conv} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-black text-sm truncate ${
                        conv.unread_count > 0 ? "text-[#1D1D1D]" : "text-gray-500"
                      }`}>
                        {conv.participant_name}
                      </h4>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap ml-2 shrink-0">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{conv.last_message}</p>
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

        {/* ── Message area ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedConversation ? "hidden md:flex" : "flex"}`}>
          {selectedConversation ? (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  {/* Back button — mobile only */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 -ml-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <ParticipantAvatar conv={selectedConversation} size="sm" />

                  <div>
                    <h3 className="font-black text-sm leading-tight">{selectedConversation.participant_name}</h3>
                    <p className="text-[10px] text-gray-400 capitalize">{selectedConversation.participant_type}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                    <MessageSquare className="w-12 h-12 text-gray-200" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-300">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isMe
                              ? "bg-[#389C9A] text-white rounded-tr-none"
                              : "bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D] rounded-tl-none"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments.map((att, i) => (
                                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                                      isMe ? "bg-white/20 hover:bg-white/30" : "bg-gray-100 hover:bg-gray-200"
                                    }`}>
                                    {att.type.startsWith("image/")
                                      ? <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                      : <FileText  className="w-3.5 h-3.5 shrink-0" />}
                                    <span className="truncate flex-1 text-[10px] font-medium">{att.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-[9px] text-gray-400 ${isMe ? "justify-end" : "justify-start"}`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isMe && (
                              msg.is_read
                                ? <><CheckCheck className="w-3 h-3 text-[#389C9A]" /><span>Read</span></>
                                : <><CheckCheck className="w-3 h-3" /><span>Sent</span></>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="p-4 border-t border-[#1D1D1D]/10 bg-white shrink-0">
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2"
                    >
                      {attachments.map((file, index) => (
                        <div key={index} className="relative shrink-0 group">
                          {file.type.startsWith("image/") ? (
                            <div className="relative">
                              <img src={URL.createObjectURL(file)} alt={file.name}
                                className="w-16 h-16 object-cover rounded-xl border-2 border-[#1D1D1D]/10" />
                              <button
                                onClick={() => setAttachments((p) => p.filter((_, i) => i !== index))}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative w-16 h-16 bg-gray-100 rounded-xl border-2 border-[#1D1D1D]/10 flex flex-col items-center justify-center p-2">
                              <FileText className="w-6 h-6 text-gray-400 mb-1" />
                              <p className="text-[7px] truncate w-full text-center">{file.name.substring(0, 10)}</p>
                              <button
                                onClick={() => setAttachments((p) => p.filter((_, i) => i !== index))}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  <input type="file" multiple onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachments((p) => [...p, ...files]);
                  }} className="hidden" ref={fileInputRef} />

                  <label
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors shrink-0"
                  >
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </label>

                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm resize-none max-h-32 transition-colors leading-relaxed"
                    rows={Math.min(3, messageInput.split("\n").length || 1)}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                    className={`p-2.5 rounded-xl transition-all shrink-0 ${
                      messageInput.trim() || attachments.length > 0
                        ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>

                <p className="text-center text-[8px] text-gray-400 mt-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Enter</kbd> to send ·{" "}
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
              <MessageSquare className="w-16 h-16 text-gray-200" />
              <h3 className="text-xl font-black uppercase tracking-tighter italic">No Conversation Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Select a conversation from the list to start messaging.
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
