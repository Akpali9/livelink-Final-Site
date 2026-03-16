import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search as SearchIcon } from "lucide-react";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

interface Conversation {
  id: string;
  name: string;
  campaign: string;
  logo: string;
  last_message: string;
  last_message_time: string;
  unread: boolean;
}

export function MessagesInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const userType = role === "business" ? "business" : "creator";
  const backPath = userType === "business" ? "/business/dashboard" : "/dashboard";

  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Fetch conversations with unread status
  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        name,
        campaign,
        logo,
        messages (
          content,
          created_at,
          sender_type,
          seen
        )
      `);
    if (error) console.error(error);
    else {
      const formatted = data.map((conv: any) => {
        const lastMsg = conv.messages?.[conv.messages.length - 1];
        return {
          id: conv.id,
          name: conv.name,
          campaign: conv.campaign,
          logo: conv.logo,
          last_message: lastMsg?.content || "",
          last_message_time: lastMsg?.created_at || "",
          unread: lastMsg?.sender_type !== userType && !lastMsg?.seen
        };
      });
      setConversations(formatted);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Realtime listener for new messages
    const channel = supabase
      .channel("messages-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Compute total unread messages
  const totalUnread = conversations.filter(c => c.unread).length;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px]">
      <AppHeader showBack title="Messages" backPath={backPath} userType={userType} />

      <main>
        <div className="px-6 py-8">
          <div className="relative mb-6">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
            <input
              type="text"
              placeholder="SEARCH CONVERSATIONS..."
              className="w-full h-12 bg-[#F8F8F8] border border-[#1D1D1D]/10 rounded-none pl-11 pr-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#1D1D1D] transition-colors italic"
            />
          </div>
        </div>

        <div className="bg-white border-y border-[#1D1D1D]/10">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={async () => {
                // Navigate to conversation
                navigate(`/messages/${conv.id}?role=${userType}`);

                // Mark all messages as seen
                await supabase
                  .from("messages")
                  .update({ seen: true })
                  .eq("conversation_id", conv.id)
                  .eq("sender_type", userType === "creator" ? "business" : "creator")
                  .eq("seen", false);

                // Update local state immediately
                setConversations(prev =>
                  prev.map(c =>
                    c.id === conv.id ? { ...c, unread: false } : c
                  )
                );
              }}
              className={`h-[80px] flex items-center px-6 gap-4 border-b border-[#1D1D1D]/10 last:border-0 active:bg-[#F8F8F8] transition-colors cursor-pointer group ${
                conv.unread ? "bg-[#389C9A]/5" : "bg-white"
              }`}
            >
              <div className="w-12 h-12 rounded-none overflow-hidden border-2 border-[#1D1D1D]/10 shrink-0 bg-[#F8F8F8]">
                <ImageWithFallback
                  src={conv.logo}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2 mb-1">
                  <h3 className="font-black text-sm uppercase tracking-tight group-hover:italic transition-all">
                    {conv.name}
                  </h3>
                  <span className="text-[9px] text-[#1D1D1D]/40 font-bold uppercase tracking-widest shrink-0">
                    {conv.last_message_time
                      ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-[11px] text-[#1D1D1D]/60 truncate leading-none font-medium italic">
                    {conv.last_message}
                  </p>
                  {conv.unread && (
                    <div className="w-2 h-2 bg-[#389C9A] rounded-none shrink-0 border border-[#1D1D1D]/10" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}