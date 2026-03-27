import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { 
  ArrowLeft, 
  Paperclip, 
  Send, 
  CheckCircle2,
  Clock,
  Info,
  MoreVertical,
  Image as ImageIcon,
  X,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  attachments: {
    url: string;
    type: string;
    name: string;
  }[];
}

interface ConversationDetails {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  participant_type: 'creator' | 'business';
  campaign_id?: string;
  campaign_name?: string;
  created_at: string;
}

export function MessageThread() {
  const navigate = useNavigate();
  const { id: paramId, campaignId, creatorId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const role = searchParams.get("role") || "creator";
  const userType = role === "business" ? "business" : "creator";

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve conversation ID from either direct param or campaign/creator params
  useEffect(() => {
    if (!user) return;

    const resolveConversation = async () => {
      // If we have a direct conversation ID, use it
      if (paramId) {
        setConversationId(paramId);
        return;
      }

      // Otherwise, try to find or create conversation from campaignId and creatorId
      if (campaignId && creatorId) {
        try {
          // Determine which participant is the business (current user) and which is the creator
          const businessId = user.id;
          const creatorIdStr = creatorId;

          // Check if a conversation already exists
          const { data: existing, error: findError } = await supabase
            .from("conversations")
            .select("id")
            .or(`and(participant1_id.eq.${businessId},participant2_id.eq.${creatorIdStr}),and(participant1_id.eq.${creatorIdStr},participant2_id.eq.${businessId})`)
            .eq("campaign_id", campaignId)
            .maybeSingle();

          if (findError) throw findError;

          if (existing) {
            setConversationId(existing.id);
            return;
          }

          // Create a new conversation
          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert({
              participant1_id: businessId,
              participant1_type: "business",
              participant2_id: creatorIdStr,
              participant2_type: "creator",
              campaign_id: campaignId,
              last_message_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createError) throw createError;

          setConversationId(newConv.id);
        } catch (err) {
          console.error("Error resolving conversation:", err);
          toast.error("Failed to start conversation");
          setLoading(false);
        }
      } else {
        // No valid params – show error
        toast.error("Invalid conversation link");
        setLoading(false);
      }
    };

    resolveConversation();
  }, [paramId, campaignId, creatorId, user]);

  // Once we have a conversation ID, load the conversation details and messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch conversation details
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (convError) throw convError;

        if (convData) {
          // Determine other participant
          const otherParticipantId = convData.participant1_id === user.id 
            ? convData.participant2_id 
            : convData.participant1_id;

          const otherParticipantType = convData.participant1_id === user.id 
            ? convData.participant2_type 
            : convData.participant1_type;

          // Fetch participant details
          const table = otherParticipantType === "creator" ? "creator_profiles" : "businesses";
          const { data: participantData } = await supabase
            .from(table)
            .select("*")
            .eq("user_id", otherParticipantId)
            .single();

          // Fetch campaign name if exists
          let campaignName = undefined;
          if (convData.campaign_id) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("name")
              .eq("id", convData.campaign_id)
              .single();
            campaignName = campaign?.name;
          }

          setConversation({
            id: convData.id,
            participant_id: otherParticipantId,
            participant_name: participantData?.full_name || participantData?.business_name || 'Unknown',
            participant_avatar: participantData?.avatar_url || participantData?.logo_url || '',
            participant_type: otherParticipantType,
            campaign_id: convData.campaign_id,
            campaign_name: campaignName,
            created_at: convData.created_at
          });
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        // Ensure attachments is always an array
        const sanitized = (messagesData || []).map((msg) => ({
          ...msg,
          attachments: Array.isArray(msg.attachments) ? msg.attachments : []
        }));
        
        setMessages(sanitized);

        // Mark unread messages as read
        await supabase
          .from("messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("sender_id", convData?.participant1_id === user.id ? convData.participant2_id : convData.participant1_id)
          .eq("is_read", false);

      } catch (error) {
        console.error("Error fetching conversation:", error);
        toast.error("Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime subscription for new messages
    const channel = supabase
      .channel("messages-" + conversationId)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = {
            ...payload.new,
            attachments: Array.isArray(payload.new.attachments) ? payload.new.attachments : []
          } as Message;
          
          setMessages((prev) => [...prev, newMessage]);
          
          // Mark as read if it's from other participant
          if (payload.new.sender_id !== user.id) {
            await supabase
              .from("messages")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ 
      top: scrollRef.current.scrollHeight, 
      behavior: "smooth" 
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId || !user || sending) return;

    setSending(true);

    try {
      // Upload attachments if any
      const attachmentUrls = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${conversationId}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("message-attachments")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("message-attachments")
            .getPublicUrl(fileName);

          attachmentUrls.push({
            url: publicUrl,
            type: file.type,
            name: file.name
          });
        }
      }

      // Insert message
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: inputText.trim(),
          is_read: false,
          attachments: attachmentUrls,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setInputText("");
      setAttachments([]);
      
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/20 bg-white/10 animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="w-24 h-3 bg-white/20 animate-pulse rounded" />
              <div className="w-16 h-2 bg-white/10 animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h3 className="text-white font-black uppercase ml-3">Conversation</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <Info className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500">Conversation not found</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-14 bg-[#1D1D1D] flex items-center px-4 z-50">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <div 
          className="flex-1 flex items-center gap-3 ml-2 cursor-pointer"
          onClick={() => setShowInfo(!showInfo)}
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/20 bg-white/10">
            <ImageWithFallback
              src={conversation.participant_avatar}
              className="w-full h-full object-cover grayscale"
            />
          </div>
          <div className="flex flex-col leading-none">
            <h3 className="text-[14px] font-black uppercase tracking-tight text-white">
              {conversation.participant_name}
            </h3>
            {conversation.campaign_name && (
              <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">
                {conversation.campaign_name}
              </span>
            )}
          </div>
        </div>

        <button className="p-2 text-white/60 hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-b border-[#1D1D1D]/10 z-40 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#1D1D1D]/10">
                  <ImageWithFallback
                    src={conversation.participant_avatar}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-black text-lg uppercase">{conversation.participant_name}</h4>
                  <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">
                    {conversation.participant_type}
                  </p>
                </div>
              </div>

              {conversation.campaign_name && (
                <div className="bg-[#F8F8F8] p-4 rounded-xl mb-4">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">
                    Active Campaign
                  </p>
                  <p className="font-black text-sm">{conversation.campaign_name}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/profile/${conversation.participant_id}`)}
                  className="flex-1 py-3 border-2 border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => navigate(`/offers?role=${userType}&business=${conversation.participant_id}`)}
                  className="flex-1 py-3 bg-[#1D1D1D] text-white text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
                >
                  Send Offer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <main 
        ref={scrollRef} 
        className="flex-1 pt-14 pb-[120px] overflow-y-auto px-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex flex-col space-y-6 py-6">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-[8px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              
              {dateMessages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.id;
                const showAvatar = index === 0 || dateMessages[index - 1]?.sender_id !== msg.sender_id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && showAvatar && (
                        <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-[#1D1D1D]/10 flex-shrink-0">
                          <ImageWithFallback
                            src={conversation.participant_avatar}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div>
                        <div
                          className={`p-4 rounded-2xl text-[13px] leading-relaxed font-medium ${
                            isOwn
                              ? 'bg-[#1D1D1D] text-white rounded-tr-none'
                              : 'bg-[#F8F8F8] text-[#1D1D1D] rounded-tl-none border border-[#1D1D1D]/10'
                          }`}
                        >
                          {msg.content}
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg text-[10px] ${
                                    isOwn ? 'bg-white/10' : 'bg-white'
                                  }`}
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  <span className="truncate flex-1">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={`flex items-center gap-2 mt-1 text-[8px] font-medium ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-[#1D1D1D]/30">
                            {formatTime(msg.created_at)}
                          </span>
                          {isOwn && (
                            <span className="flex items-center gap-1">
                              {msg.is_read ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />
                                  <span className="text-[#389C9A]">Read</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-[#FEDB71]" />
                                  <span className="text-[#FEDB71]">Sent</span>
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
          ))}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-[#1D1D1D]/10 px-4 py-3 z-50">
        {/* Attachment Previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-2 mb-3 overflow-x-auto pb-2"
            >
              {attachments.map((file, index) => (
                <div key={index} className="relative flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-[#1D1D1D]/10"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[#F8F8F8] rounded-lg border-2 border-[#1D1D1D]/10 flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-[#389C9A]" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
          >
            <Paperclip className="w-5 h-5 text-[#389C9A]" />
          </button>

          <div className="flex-1 bg-[#F8F8F8] rounded-xl flex items-center px-4 border-2 border-transparent focus-within:border-[#389C9A] transition-colors">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full bg-transparent py-3 text-sm outline-none"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || sending}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              inputText.trim() && !sending
                ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
                : "bg-[#1D1D1D]/5 text-[#1D1D1D]/30"
            }`}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-[#FEDB71]" />
            )}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
