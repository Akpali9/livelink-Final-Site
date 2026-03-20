function AdminMessages({ adminUser }: { adminUser: any }) {
  const [loading, setLoading] = useState(true);
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
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (adminUser) fetchConversations();
  }, [adminUser]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
      
      // Subscribe to new messages in this conversation
      const messageSubscription = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if admin is viewing
          if (newMessage.sender_id !== adminUser?.id) {
            markAsRead(newMessage.id);
          }
        })
        .subscribe();

      return () => {
        messageSubscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

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

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, is_read")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const conversationMap = new Map();

      for (const msg of msgs || []) {
        if (!conversationMap.has(msg.conversation_id)) {
          const { data: participants } = await supabase
            .from("conversations")
            .select("participant1_id, participant2_id, participant1_type, participant2_type, last_message_at")
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
            const selectFields = otherParticipantType === "creator"
              ? "id, full_name, avatar_url, email"
              : "id, business_name, logo_url, email";

            const { data: profile } = await supabase.from(table).select(selectFields).eq("user_id", otherParticipantId).single();
            
            // Count unread messages
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", msg.conversation_id)
              .eq("sender_id", otherParticipantId)
              .eq("is_read", false);

            const profileName = otherParticipantType === "creator"
              ? (profile as any)?.full_name
              : (profile as any)?.business_name;
            const profileAvatar = otherParticipantType === "creator"
              ? (profile as any)?.avatar_url
              : (profile as any)?.logo_url;

            conversationMap.set(msg.conversation_id, {
              id: msg.conversation_id,
              participant_id: otherParticipantId,
              participant_name: profileName || "Unknown User",
              participant_avatar: profileAvatar || "",
              participant_type: otherParticipantType,
              last_message: msg.content,
              last_message_time: participants.last_message_at || msg.created_at,
              last_message_sender: msg.sender_id === adminUser?.id ? "You" : profileName || "Them",
              unread_count: count || 0,
            });
          }
        }
      }

      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    } catch (error) {
      console.error("Error fetching conversations:", error);
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
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
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
          const fileName = `admin/${selectedConversation.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
          attachmentUrls.push({ url: publicUrl, type: file.type, name: file.name, size: file.size });
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: adminUser?.id,
          sender_type: "admin",
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
            ? { ...conv, last_message: messageInput.trim(), last_message_time: new Date().toISOString(), last_message_sender: "You" }
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
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const [creators, businesses] = await Promise.all([
        supabase.from("creator_profiles").select("id, user_id, full_name, email, avatar_url, status, created_at")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`).limit(10),
        supabase.from("businesses").select("id, user_id, business_name, email, logo_url, status, created_at")
          .or(`business_name.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`).limit(10)
      ]);

      const results: UserProfile[] = [
        ...(creators.data || []).map((c: any) => ({ 
          id: c.id, 
          user_id: c.user_id, 
          full_name: c.full_name, 
          avatar_url: c.avatar_url, 
          email: c.email, 
          type: "creator" as const, 
          status: c.status, 
          created_at: c.created_at 
        })),
        ...(businesses.data || []).map((b: any) => ({ 
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
        await fetchConversations();
        const conv = conversations.find(c => c.id === existing.id);
        setSelectedConversation(conv || null);
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
      setNewMsgSearch("");
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

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "unread") return matchesSearch && conv.unread_count > 0;
    if (filter === "creators") return matchesSearch && conv.participant_type === "creator";
    if (filter === "businesses") return matchesSearch && conv.participant_type === "business";
    return matchesSearch;
  });

  return (
    <div className="bg-white border-2 border-[#1D1D1D] rounded-xl overflow-hidden shadow-lg" style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
      <div className="flex h-full">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-[#1D1D1D]/10 flex flex-col shrink-0 bg-[#FDFDFD]">
          <div className="p-4 border-b border-[#1D1D1D]/10 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase tracking-tight text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#389C9A]" />
                Conversations
              </h3>
              <button 
                onClick={() => setShowUserSearch(true)}
                className="p-2 bg-[#1D1D1D] text-white rounded-lg hover:bg-[#389C9A] transition-all transform hover:scale-105 shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..." 
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg text-sm bg-white transition-colors"
              />
            </div>

            <div className="flex gap-1.5">
              {(["all", "unread", "creators", "businesses"] as const).map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    filter === f 
                      ? "bg-[#1D1D1D] text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "unread" ? "Unread" : f === "creators" ? "Creators" : "Business"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-xs text-gray-500 mb-3">No conversations yet</p>
                <button 
                  onClick={() => setShowUserSearch(true)}
                  className="text-[#389C9A] text-[10px] font-black hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Start a conversation
                </button>
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
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shadow-md">
                        {getInitials(conv.participant_name)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                      conv.participant_type === 'creator' ? 'bg-[#389C9A]' : 'bg-[#FEDB71]'
                    }`}>
                      {conv.participant_type === 'creator'
                        ? <Users className="w-2 h-2 text-white" />
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
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[11px] text-gray-500 truncate flex-1">
                        <span className="font-medium">{conv.last_message_sender}: </span>
                        {conv.last_message.length > 40 ? conv.last_message.substring(0, 40) + '...' : conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#389C9A] text-white text-[9px] font-black rounded-full shadow-sm animate-pulse">
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
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {selectedConversation.participant_avatar ? (
                    <img 
                      src={selectedConversation.participant_avatar} 
                      className="w-10 h-10 rounded-full border-2 border-[#1D1D1D]/10 object-cover" 
                      alt={selectedConversation.participant_name}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm">
                      {getInitials(selectedConversation.participant_name)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-base">{selectedConversation.participant_name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        {selectedConversation.participant_type === 'creator' 
                          ? <><Users className="w-3 h-3" /> Creator</>
                          : <><Building2 className="w-3 h-3" /> Business</>
                        }
                      </span>
                      {selectedConversation.unread_count === 0 && (
                        <span className="text-[8px] text-green-500 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Seen
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Messages Container - Scrollable */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9] custom-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium mb-1">No messages yet</p>
                    <p className="text-xs text-gray-400">Start the conversation by sending a message below!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isAdmin = msg.sender_id === adminUser?.id;
                    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;
                    const showDateSeparator = index === 0 || 
                      new Date(msg.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-500 rounded-full">
                              {new Date(msg.created_at).toLocaleDateString(undefined, { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[70%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
                            {!isAdmin && showAvatar && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                {getInitials(selectedConversation.participant_name)}
                              </div>
                            )}
                            {!isAdmin && !showAvatar && <div className="w-8 shrink-0" />}
                            
                            <div className="flex flex-col">
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                                isAdmin
                                  ? 'bg-[#389C9A] text-white rounded-tr-none'
                                  : 'bg-white border-2 border-[#1D1D1D]/10 text-[#1D1D1D] rounded-tl-none'
                              }`}>
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>

                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {msg.attachments.map((att, i) => (
                                      <a 
                                        key={i} 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                                          isAdmin ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                      >
                                        {att.type.startsWith('image/') 
                                          ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> 
                                          : <FileText className="w-3.5 h-3.5 shrink-0" />
                                        }
                                        <span className="truncate flex-1 text-[10px] font-medium">{att.name}</span>
                                        <DownloadIcon className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <span>{formatTime(msg.created_at)}</span>
                                {isAdmin && (
                                  <span className="flex items-center gap-0.5">
                                    {msg.is_read ? (
                                      <>
                                        <CheckCheck className="w-3 h-3 text-[#389C9A]" />
                                        <span className="text-[#389C9A] text-[8px]">Read</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCheck className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-400 text-[8px]">Sent</span>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator (optional) */}
              {typingUser === selectedConversation.id && (
                <div className="px-4 py-2 text-[10px] text-gray-400 flex items-center gap-1">
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>typing...</span>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-[#1D1D1D]/10 bg-white">
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="flex gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar"
                    >
                      {attachments.map((file, index) => (
                        <div key={index} className="relative shrink-0 group">
                          {file.type.startsWith('image/') ? (
                            <div className="relative">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name} 
                                className="w-16 h-16 object-cover rounded-lg border-2 border-[#1D1D1D]/10 shadow-sm" 
                              />
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                  className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
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
                    id="admin-file-upload" 
                    multiple 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                  <label 
                    htmlFor="admin-file-upload" 
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </label>

                  <div className="flex-1 relative">
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
                      className="w-full px-4 py-2.5 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors rounded-xl text-sm resize-none max-h-32"
                      rows={Math.min(3, messageInput.split('\n').length)}
                      style={{ scrollbarWidth: 'thin' }}
                    />
                  </div>

                  <button 
                    onClick={sendMessage}
                    disabled={(!messageInput.trim() && attachments.length === 0) || sending}
                    className={`p-2.5 rounded-xl transition-all transform active:scale-95 ${
                      messageInput.trim() || attachments.length > 0
                        ? 'bg-[#1D1D1D] text-white hover:bg-[#389C9A] hover:shadow-lg'
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
                
                <div className="text-center mt-2">
                  <p className="text-[8px] text-gray-400">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-mono">Shift + Enter</kbd> for new line
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-gray-50 to-white">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <MessageSquare className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-3">No Conversation Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs mb-6">
                Select a conversation from the sidebar or start a new one to message creators and businesses.
              </p>
              <button 
                onClick={() => setShowUserSearch(true)}
                className="px-6 py-3 bg-[#1D1D1D] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
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
                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#389C9A]" />
                  New Message
                </h3>
                <button 
                  onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={newMsgSearch}
                  onChange={(e) => { setNewMsgSearch(e.target.value); searchUsers(e.target.value); }}
                  placeholder="Search creators or businesses by name or email..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-xl text-sm"
                  autoFocus
                />
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <button 
                        key={user.id} 
                        onClick={() => startNewConversation(user)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-all group border border-transparent hover:border-[#1D1D1D]/10"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#389C9A] to-[#1D1D1D] text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                          {getInitials(user.full_name || user.business_name || "")}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm uppercase tracking-tight">
                            {user.full_name || user.business_name}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              {user.type === 'creator' 
                                ? <><Users className="w-2.5 h-2.5" /> Creator</>
                                : <><Building2 className="w-2.5 h-2.5" /> Business</>
                              }
                            </span>
                            <span>•</span>
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#389C9A] transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : newMsgSearch ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Start typing to search</p>
                    <p className="text-xs text-gray-400 mt-1">Search creators or businesses by name or email</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#1D1D1D]/10">
                <button 
                  onClick={() => { setShowUserSearch(false); setSearchResults([]); setNewMsgSearch(""); }}
                  className="w-full px-4 py-2.5 border-2 border-[#1D1D1D] text-xs font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

