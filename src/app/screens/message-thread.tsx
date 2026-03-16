import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { BottomNav } from "../components/bottom-nav";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";

interface Message {
  id: string;
  sender_type: "creator" | "business";
  content: string;
  created_at: string;
  seen: boolean;
}

export function MessageThread() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "creator";
  const userType = role === "business" ? "business" : "creator";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    else setMessages(data);

    // Mark all unseen messages as seen
    await supabase
      .from("messages")
      .update({ seen: true })
      .eq("conversation_id", id)
      .eq("sender_type", userType === "creator" ? "business" : "creator")
      .eq("seen", false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("conversation-" + id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !id) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_type: userType,
      content: inputText.trim(),
      seen: false
    });
    if (error) console.error(error);
    else setInputText("");
  };

  return (
    <div className="flex flex-col h-screen bg-white text-[#1D1D1D]">
      {/* Top Bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-14 bg-[#1D1D1D] flex items-center px-4 z-50">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      <main ref={scrollRef} className="flex-1 pt-14 pb-[120px] overflow-y-auto px-4 flex flex-col space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender_type === "creator" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[75%] p-4 rounded-none text-[13px] leading-relaxed font-medium italic border-2 ${
                msg.sender_type === "creator"
                  ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                  : "bg-[#F8F8F8] text-[#1D1D1D] border-[#1D1D1D]/10"
              }`}
            >
              {msg.content}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#1D1D1D]/30 uppercase tracking-widest italic">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {msg.sender_type === "creator" && msg.seen && (
                <span className="text-[9px] font-black text-[#389C9A] uppercase tracking-widest italic">Seen</span>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[60px] bg-white border-t border-[#1D1D1D]/10 px-4 flex items-center gap-3 z-50">
        <button className="p-2 text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors">
          <Paperclip className="w-5 h-5 text-[#389C9A]" />
        </button>
        <div className="flex-1 bg-[#F8F8F8] h-10 rounded-none flex items-center px-4 border border-[#1D1D1D]/10">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full bg-transparent text-xs font-bold uppercase outline-none italic placeholder:text-[#1D1D1D]/20"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
        </div>
        <button
          onClick={sendMessage}
          className={`w-10 h-10 rounded-none flex items-center justify-center transition-all ${
            inputText.trim() ? "bg-[#1D1D1D] text-white scale-100" : "bg-[#1D1D1D]/5 text-[#1D1D1D]/30 scale-95"
          }`}
        >
          <Send className="w-4 h-4 fill-current text-[#FEDB71]" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}