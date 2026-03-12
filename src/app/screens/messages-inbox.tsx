import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search,
  MessageSquare,
  CheckCircle2,
  Briefcase,
  RefreshCw,
  Loader2,
  Shield,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: "creator" | "business" | "admin";
  campaign_id?: string;
  campaign_name?: string;
  last_message: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
  status?: "active" | "pending" | "completed";
}

// Resolve participant display info regardless of their type
async function resolveParticipant(userId: string): Promise<{
  name: string;
  avatar: string;
  type: "creator" | "business" | "admin";
}> {
  // Check admin first
  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (admin) {
    return {
      name: admin.full_name || "Admin",
      avatar: admin.avatar_url || "",
      type: "admin",
    };
  }

  // Check creator
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("full_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (creator) {
    return {
      name: creator.full_name || "Creator",
      avatar: creator.avatar_url || "",
      type: "creator",
    };
  }

  // Check business
  const { data: business } = await supabase
    .from("businesses")
    .select("business_name, logo_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (business) {
    return {
      name: business.business_name || "Business",
      avatar: business.logo_url || "",
      type: "business",
    };
  }

  return { name: "Unknown", avatar: "", type: "creator" };
}

export function MessagesInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const role = searchParams.get("role") || "creator";
  const userType = role === "business" ? "business" : role === "admin" ? "admin" : "creator";
  const backPath =
    userType === "business"
      ? "/business/dashboard"
      : userType === "admin"
      ? "/admin"
      : "/dashboard";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "active">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: conversationsData, error: convError } = await supabase
        .from("conversations")
        .select(`
          *,
          messages:messages(
            content,
            created_at,
            sender_id,
            is_read
          )
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      if (conversationsData) {
        const formatted = await Promise.all(
          conversationsData.map(async (conv: any) => {
            const otherParticipantId =
              conv.participant1_id === user.id
                ? conv.participant2_id
                : conv.participant1_id;

            const participant = await resolveParticipant(otherParticipantId);

            const messages = conv.messages || [];
            const lastMsg = messages[messages.length - 1];
            const unreadCount = messages.filter(
              (m: any) => m.sender_id !== user.id && !m.is_read
            ).length;

            return {
              id: conv.id,
              participant_id: otherParticipantId,
              participant_name: participant.name,
              participant_avatar: participant.avatar,
              participant_type: participant.type,
              campaign_id: conv.campaign_id,
              campaign_name: conv.campaign_name || null,
              last_message: lastMsg?.content || "",
              last_message_time: lastMsg?.created_at || conv.created_at,
              last_message_sender: lastMsg?.sender_id === user.id ? "You" : participant.name,
              unread_count: unreadCount,
              status: conv.status || "active",
            };
          })
        );

        setConversations(formatted);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "unread") return matchesSearch && conv.unread_count > 0;
    if (filter === "active") return matchesSearch && conv.status === "active";
    return matchesSearch;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getParticipantBadge = (type: string) => {
    switch (type) {
      case "admin":
        return (
          <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        );
      case "business":
        return (
          <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-[#389C9A] bg-[#389C9A]/10 px-2 py-0.5 rounded-full">
            <Briefcase className="w-2.5 h-2.5" /> Business
          </span>
        );
      default:
        return (
          <span className="text-[7px] font-black uppercase tracking-widest text-[#FEDB71] bg-[#FEDB71]/10 px-2 py-0.5 rounded-full">
            Creator
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Messages" backPath={backPath} />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
            <p className="text-sm text-gray-500">Loading conversations...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px]">
      <AppHeader showBack title="Messages" backPath={backPath} />

      <main className="flex-1 max-w-[480px] mx-auto w-full">
        {/* Search and Filters */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-[#1D1D1D]/10">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full h-12 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl pl-11 pr-4 text-[10px] font-black uppercase tracking-widest outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-12 h-12 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { value: "all",    label: "All",    icon: MessageSquare },
              { value: "unread", label: "Unread", icon: CheckCircle2 },
              { value: "active", label: "Active", icon: Briefcase },
            ].map((f) => {
              const Icon = f.icon;
              const count =
                f.value === "unread"
                  ? conversations.reduce((sum, c) => sum + c.unread_count, 0)
                  : f.value === "active"
                  ? conversations.filter((c) => c.status === "active").length
                  : conversations.length;

              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as any)}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    filter === f.value
                      ? "bg-[#1D1D1D] text-white"
                      : "bg-[#F8F8F8] text-[#1D1D1D]/40 hover:bg-[#1D1D1D]/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {f.label}
                  {count > 0 && f.value !== "all" && (
                    <span
                      className={`text-[7px] px-1.5 py-0.5 rounded-full ${
                        filter === f.value
                          ? "bg-white text-[#1D1D1D]"
                          : "bg-[#1D1D1D] text-white"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white">
          <AnimatePresence mode="popLayout">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => navigate(`/messages/${conv.id}?role=${userType}`)}
                  className="flex items-center gap-4 px-6 py-5 border-b border-[#1D1D1D]/5 hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.participant_type === "admin" ? (
                      <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center border-2 border-purple-200">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-[#1D1D1D]/10 bg-[#F8F8F8]">
                        <ImageWithFallback
                          src={conv.participant_avatar}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                        />
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#389C9A] rounded-full flex items-center justify-center text-white text-[8px] font-black border-2 border-white">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3
                          className={`font-black text-sm uppercase tracking-tight truncate ${
                            conv.unread_count > 0
                              ? "text-[#1D1D1D]"
                              : "text-[#1D1D1D]/70"
                          }`}
                        >
                          {conv.participant_name}
                        </h3>
                        {getParticipantBadge(conv.participant_type)}
                      </div>
                      <span className="text-[8px] font-medium text-[#1D1D1D]/30 whitespace-nowrap ml-2 flex-shrink-0">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>

                    {conv.campaign_name && (
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] mb-1">
                        {conv.campaign_name}
                      </p>
                    )}

                    <p
                      className={`text-[10px] truncate ${
                        conv.unread_count > 0
                          ? "text-[#1D1D1D] font-bold"
                          : "text-[#1D1D1D]/50"
                      }`}
                    >
                      {conv.last_message_sender !== "You" ? (
                        <span className="text-[#1D1D1D]/30">{conv.last_message_sender}: </span>
                      ) : (
                        <span className="text-[#1D1D1D]/30">You: </span>
                      )}
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>

                  {/* Active dot */}
                  {conv.status === "active" && (
                    <div className="w-2 h-2 bg-[#389C9A] rounded-full animate-pulse flex-shrink-0" />
                  )}
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                <div className="w-20 h-20 bg-[#F8F8F8] rounded-2xl flex items-center justify-center mb-6 border-2 border-[#1D1D1D]/10">
                  <MessageSquare className="w-8 h-8 text-[#1D1D1D]/20" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic mb-2">
                  No conversations
                </h3>
                <p className="text-[10px] text-[#1D1D1D]/40 max-w-[250px]">
                  {searchQuery
                    ? "No matches found. Try a different search."
                    : "Start a conversation by sending an offer or messaging a creator."}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        {conversations.length > 0 && (
          <div className="px-6 py-6 bg-[#F8F8F8] border-t border-[#1D1D1D]/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-black text-[#389C9A]">{conversations.length}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Total</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#FEDB71]">
                  {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
                </p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Unread</p>
              </div>
              <div>
                <p className="text-xl font-black text-green-500">
                  {conversations.filter((c) => c.status === "active").length}
                </p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Active</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
