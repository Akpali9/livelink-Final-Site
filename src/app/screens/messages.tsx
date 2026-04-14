import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  MessageSquare, Send, Paperclip, Image as ImageIcon, FileText,
  X, User, Building2, MoreVertical, Search, ArrowLeft, ChevronRight,
  CheckCheck, Loader2, ShieldCheck, Flag, AlertTriangle,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
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
// REPORT REASONS
// ─────────────────────────────────────────────

const REPORT_REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Inappropriate content",
  "Fake identity or impersonation",
  "Payment dispute",
  "Threatening behaviour",
  "Other",
];

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

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

  // New message modal
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");

  // Report modal
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // ─── FETCH HELPERS ────────────────────────────────────────────────────

  const loadConversations = async () => {
    try {
      const { data: convData, error } = await supabase
        .from("conversations").select("*")
        .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const formatted = await Promise.all((convData || []).map(async (conv) => {
        const otherId = conv.participant1_id === user?.id ? conv.participant2_id : conv.participant1_id;
        const otherType = conv.participant1_id === user?.id ? conv.participant2_type : conv.participant1_type;

        let name = "Unknown", avatar = "";

        if (otherType === "creator") {
          const { data: p } = await supabase.from("creator_profiles")
            .select("full_name, avatar_url").eq("user_id", otherId).maybeSingle();
          if (p) { name = p.full_name || "Creator"; avatar = p.avatar_url || ""; }
        } else if (otherType === "business") {
          const { data: p } = await supabase.from("businesses")
            .select("business_name, logo_url").eq("user_id", otherId).maybeSingle();
          if (p) { name = p.business_name || "Business"; avatar = p.logo_url || ""; }
        } else if (otherType === "admin") {
          name = "LiveLink Support"; avatar = "";
        }

        const { count } = await supabase.from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id).eq("sender_id", otherId).eq("is_read", false);

        return {
          id: conv.id,
          participant_id: otherId,
          participant_name: name,
          participant_avatar: avatar,
          participant_type: otherType as "creator" | "business" | "admin",
          last_message: conv.last_message || "No messages yet",
          last_message_time: conv.last_message_at || conv.created_at,
          unread_count: count || 0,
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
        sender_id: user?.id,
        content: messageInput.trim(),
        is_read: false,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      await supabase.from("conversations").update({
        last_message: messageInput.trim(),
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

  // ─── START NEW CONVERSATION (SEARCH USERS) ────────────────────────────

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const [{ data: c }, { data: b }] = await Promise.all([
        supabase.from("creator_profiles").select("id, user_id, full_name, email, avatar_url, status, created_at")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(8),
        supabase.from("businesses").select("id, user_id, business_name, email, logo_url, status, created_at")
          .or(`business_name.ilike.%${query}%,email.ilike.%${query}%`).limit(8),
      ]);
      setSearchResults([
        ...(c || []).map((x: any) => ({ ...x, type: "creator" as const })),
        ...(b || []).map((x: any) => ({ ...x, full_name: x.business_name, avatar_url: x.logo_url, type: "business" as const })),
      ]);
    } catch (e) { console.error("searchUsers:", e); }
    finally { setSearching(false); }
  };

  const startConversation = async (u: UserProfile) => {
    try {
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .or(`and(participant1_id.eq.${user?.id},participant2_id.eq.${u.user_id}),and(participant1_id.eq.${u.user_id},participant2_id.eq.${user?.id})`)
        .maybeSingle();

      let convId = existing?.id;

      if (!convId) {
        const { data: newConv, error } = await supabase.from("conversations").insert({
          participant1_id: user?.id, participant2_id: u.user_id,
          participant1_type: isCreator ? "creator" : "business",
          participant2_type: u.type,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;
        convId = newConv.id;
      }

      await loadConversations();
      setShowUserSearch(false);
      setNewMsgSearch("");
      setSearchResults([]);

      setTimeout(() => {
        const found = conversations.find(c => c.id === convId);
        if (found) setSelectedConversation(found);
        else loadConversations().then(() => {
          const newlyFound = conversations.find(c => c.id === convId);
          if (newlyFound) setSelectedConversation(newlyFound);
        });
      }, 300);
    } catch (e) {
      console.error("startConversation:", e);
      toast.error("Failed to start conversation");
    }
  };

  // ─── REPORT CONVERSATION ───────────────────────────────────────────────

  const submitReport = async () => {
    if (!reportReason) { toast.error("Please select a reason"); return; }
    if (!selectedConversation || !user) return;
    setSubmittingReport(true);
    try {
      const ticketMessage = [
        `Reason: ${reportReason}`,
        reportDetails.trim() ? `Details: ${reportDetails.trim()}` : null,
        `Reported user: ${selectedConversation.participant_name} (${selectedConversation.participant_type})`,
        `Reported user ID: ${selectedConversation.participant_id}`,
        `Conversation ID: ${selectedConversation.id}`,
        `Reporter type: ${role}`,
      ].filter(Boolean).join("\n");

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: `Report: ${reportReason} — ${selectedConversation.participant_name}`,
        message: ticketMessage,
        status: "open",
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: "Report Submitted ✅",
        message: `Your report against ${selectedConversation.participant_name} has been received. We'll review it within 24 hours.`,
        data: { conversation_id: selectedConversation.id },
        created_at: new Date().toISOString(),
      }).catch(() => {});

      toast.success("Report submitted — our team will review it within 24 hours");
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
    } catch (e: any) {
      toast.error(`Failed to submit report: ${e.message}`);
    } finally {
      setSubmittingReport(false);
    }
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  const ParticipantAvatar = ({ conv, size = "md" }: { conv: Conversation; size?: "sm" | "md" }) => {
    const s = size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
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

  // ─── CUSTOM HEADER WITH WORKING BACK BUTTON ───────────────────────────
  const CustomHeader = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-[#1D1D1D]/10 px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => navigate(backPath)}
        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-black uppercase tracking-tighter italic">Messages</h1>
    </div>
  );

  // ─── LOADING ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <CustomHeader />
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
      <CustomHeader />

      <div className="flex" style={{ height: "calc(100vh - 144px)" }}>

        {/* ── Conversations sidebar ── */}
        <div className={`flex flex-col w-full ${selectedConversation ? "hidden" : "flex"}`}>
          <div className="p-4 border-b border-[#1D1D1D]/10 bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#389C9A]" /> Messages
              </h3>
              <button
                onClick={() => setShowUserSearch(true)}
                className="p-2 bg-[#1D1D1D] text-white rounded-lg hover:bg-[#389C9A] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm transition-colors" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                <MessageSquare className="w-12 h-12 text-gray-200" />
                <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="text-[#389C9A] text-[10px] font-black hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Start a new conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button key={conv.id} onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 border-b border-[#1D1D1D]/10 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conv.id ? "bg-[#389C9A]/5 border-l-4 border-l-[#389C9A]" : ""
                  }`}>
                  <ParticipantAvatar conv={conv} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-black text-sm truncate ${conv.unread_count > 0 ? "text-[#1D1D1D]" : "text-gray-500"}`}>
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
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedConversation ? "hidden" : "flex"}`}>
          {selectedConversation ? (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConversation(null)}
                    className="p-2 -ml-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <ParticipantAvatar conv={selectedConversation} size="sm" />
                  <div>
                    <h3 className="font-black text-sm leading-tight">{selectedConversation.participant_name}</h3>
                    <p className="text-[10px] text-gray-400 capitalize">{selectedConversation.participant_type}</p>
                  </div>
                </div>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>

                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-[#1D1D1D] rounded-xl shadow-xl z-30 overflow-hidden"
                      >
                        {selectedConversation.participant_type !== "admin" && (
                          <button
                            onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            Report Conversation
                          </button>
                        )}
                        <button
                          onClick={() => { setShowMenu(false); setSelectedConversation(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors border-t border-[#1D1D1D]/10"
                        >
                          <X className="w-3.5 h-3.5" />
                          Close Chat
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
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
                                      : <FileText className="w-3.5 h-3.5 shrink-0" />}
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
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="relative shrink-0 group">
                          {file.type.startsWith("image/") ? (
                            <div className="relative">
                              <img src={URL.createObjectURL(file)} alt={file.name}
                                className="w-16 h-16 object-cover rounded-xl border-2 border-[#1D1D1D]/10" />
                              <button onClick={() => setAttachments((p) => p.filter((_, i) => i !== index))}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative w-16 h-16 bg-gray-100 rounded-xl border-2 border-[#1D1D1D]/10 flex flex-col items-center justify-center p-2">
                              <FileText className="w-6 h-6 text-gray-400 mb-1" />
                              <p className="text-[7px] truncate w-full text-center">{file.name.substring(0, 10)}</p>
                              <button onClick={() => setAttachments((p) => p.filter((_, i) => i !== index))}
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
                  <input type="file" multiple onChange={(e) => setAttachments((p) => [...p, ...Array.from(e.target.files || [])])}
                    className="hidden" ref={fileInputRef} />
                  <label onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors shrink-0">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </label>
                  <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm resize-none max-h-32 transition-colors leading-relaxed"
                    rows={Math.min(3, messageInput.split("\n").length || 1)} />
                  <button onClick={sendMessage}
                    disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                    className={`p-2.5 rounded-xl transition-all shrink-0 ${
                      messageInput.trim() || attachments.length > 0
                        ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
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
                Select a conversation from the list or start a new one.
              </p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="mt-4 px-6 py-3 bg-[#1D1D1D] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── New Message Modal ── */}
      <AnimatePresence>
        {showUserSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <h3 className="text-xl font-black uppercase tracking-tighter italic">New Message</h3>
                <button onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={newMsgSearch}
                  onChange={e => { setNewMsgSearch(e.target.value); searchUsers(e.target.value); }}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                  autoFocus />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(u => (
                      <button key={u.id} onClick={() => startConversation(u)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-[#1D1D1D]/10">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shrink-0">
                          {getInitials(u.full_name || u.business_name || "")}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm uppercase tracking-tight">{u.full_name || u.business_name}</p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500">
                            <span>{u.type === "creator" ? "Creator" : "Business"}</span>
                            <span>·</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#389C9A] transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : newMsgSearch ? (
                  <div className="text-center py-8">
                    <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No users found</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Start typing to search</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {showReportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => !submittingReport && setShowReportModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t-4 border-[#1D1D1D] z-50 rounded-t-3xl flex flex-col"
              style={{ maxHeight: "90vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Flag className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-black uppercase tracking-tighter italic">Report Conversation</h3>
                  </div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  Reporting <span className="font-black">{selectedConversation?.participant_name}</span>. Our team will review this conversation.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      Reason for report *
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full border-2 border-[#1D1D1D]/10 p-3 text-sm outline-none focus:border-[#1D1D1D] rounded-xl"
                    >
                      <option value="">Select a reason</option>
                      {REPORT_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={4}
                      placeholder="Please provide any additional context that might help our team investigate..."
                      className="w-full border-2 border-[#1D1D1D]/10 p-3 text-sm outline-none focus:border-[#1D1D1D] rounded-xl resize-none"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mt-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      False reports may result in account restrictions. Please only report genuine violations of our community guidelines.
                    </p>
                  </div>

                  <button
                    onClick={submitReport}
                    disabled={!reportReason || submittingReport}
                    className={`w-full py-4 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                      !reportReason || submittingReport
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                  >
                    {submittingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Flag className="w-4 h-4" />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

export default Messages;
