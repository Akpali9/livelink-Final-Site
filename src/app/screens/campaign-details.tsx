import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  Bookmark,
  Check,
  CheckCircle2,
  Calendar,
  Video as VideoIcon,
  Tag,
  PoundSterling as Pound,
  Clock,
  Image as ImageIcon,
  Megaphone,
  Shield,
  PhoneOff,
  Download,
  Copy,
  MessageSquare,
  AlertTriangle,
  LifeBuoy,
  AlertOctagon,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";

interface Campaign {
  id: string;
  name: string;
  type: string;
  description?: string;
  budget?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  streams_required: number;
  business_id: string;
  banner_url?: string;
  created_at: string;
}

interface CampaignCreator {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
  logo_url?: string;
}

interface Message {
  id: string;
  campaign_id: string;
  creator_id: string;
  business_id: string;
  sender_type: "creator" | "business";
  message: string;
  created_at: string;
}

export function CampaignDetails() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatorLink, setCreatorLink] = useState<CampaignCreator | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isGuidModalOpen, setIsGuidModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [supportCategory, setSupportCategory] = useState("");
  const [messageText, setMessageText] = useState("");

  const reportCategories = ["Payment Issue", "Asset Loading Error", "Brand Behavior", "Technical Glitch", "Other"];
  const supportCategories = ["General Inquiry", "Account Help", "Payment Status", "Feedback", "Other"];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!user || !campaignId) return;

    try {
      setLoading(true);
      // 1. Fetch the campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // 2. Fetch the creator's link to this campaign
      const { data: linkData, error: linkError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("creator_id", user.id)
        .maybeSingle();
      if (linkError) throw linkError;
      if (!linkData) {
        setError("You are not assigned to this campaign.");
        setLoading(false);
        return;
      }
      setCreatorLink(linkData);

      // 3. Fetch business info
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, logo_url")
        .eq("id", campaignData.business_id)
        .maybeSingle();
      if (!businessError && businessData) {
        setBusiness(businessData);
      }
    } catch (err: any) {
      console.error("Error fetching campaign details:", err);
      setError(err.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  const fetchMessages = useCallback(async () => {
    if (!campaignId || !user) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [campaignId, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !campaign || !user || !creatorLink) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        campaign_id: campaign.id,
        creator_id: user.id,
        business_id: campaign.business_id,
        sender_type: "creator",
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
      fetchMessages(); // refresh after sending
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!campaignId) return;

    fetchData();
    fetchMessages();

    // Subscribe to campaign changes
    const campaignChannel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${campaignId}` },
        (payload) => {
          setCampaign((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    // Subscribe to creator link changes
    const creatorChannel = supabase
      .channel(`creator-link-${campaignId}-${user?.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_creators", filter: `campaign_id=eq.${campaignId}` },
        () => fetchData() // refresh whole data when creator status changes
      )
      .subscribe();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`messages-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      campaignChannel.unsubscribe();
      creatorChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [campaignId, user, fetchData, fetchMessages]);

  useEffect(() => {
    if (isMessagesOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMessagesOpen]);

  const copyToClipboard = (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success(`${label} copied to clipboard!`);
        }).catch(() => {
          fallbackCopyTextToClipboard(text, label);
        });
      } else {
        fallbackCopyTextToClipboard(text, label);
      }
    } catch (err) {
      fallbackCopyTextToClipboard(text, label);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, label: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success(`${label} copied to clipboard!`);
      } else {
        toast.error(`Unable to copy ${label}`);
      }
    } catch (err) {
      toast.error(`Error copying ${label}`);
    }
    document.body.removeChild(textArea);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportCategory || !messageText) {
      toast.error("Please fill in all fields.");
      return;
    }
    toast.success("Support ticket created. We'll be in touch!");
    setIsSupportModalOpen(false);
    setMessageText("");
    setSupportCategory("");
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCategory || !messageText) {
      toast.error("Please fill in all fields.");
      return;
    }
    toast.success("Issue reported. Support is investigating.");
    setIsReportModalOpen(false);
    setMessageText("");
    setReportCategory("");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  if (error || !campaign || !creatorLink) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
        <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
          <div className="flex justify-between items-center">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Campaign Details</h1>
            <div className="w-8" />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 mb-8">{error || "You are not part of this campaign."}</p>
          <button
            onClick={() => navigate("/campaigns")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  const businessName = business?.name || "Business";
  const businessLogo = business?.logo_url || "https://via.placeholder.com/100?text=Logo";
  const campaignName = campaign.name;
  const promoCode = "WELCOME20"; // could come from a promo_codes table
  const obsUrl = `https://livelink.app/overlay/banner/${campaign.id}`;

  const totalEarnings = creatorLink.total_earnings;
  const streamsCompleted = creatorLink.streams_completed;
  const totalStreams = campaign.streams_required;
  const progressPercent = (streamsCompleted / totalStreams) * 100;

  const payoutGroups = Math.ceil(totalStreams / 4);
  const payoutAmount = totalEarnings / payoutGroups;
  const payoutSchedule = Array.from({ length: payoutGroups }, (_, i) => ({
    label: `After Stream ${(i+1)*4} verified`,
    amount: `₦${payoutAmount.toFixed(2)}`,
    status: (i+1)*4 <= streamsCompleted ? "Released" : "Upcoming",
  }));

  const startDate = campaign.start_date ? new Date(campaign.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBC";
  const endDate = campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBC";

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      {/* Top Bar */}
      <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Campaign Details</h1>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="p-1 -mr-1 active:bg-[#1D1D1D]/10 transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-[#1D1D1D]' : ''}`} />
          </button>
        </div>
      </header>

      <Toaster position="top-center" richColors />

      {/* SECTION 1 — MATCH CONFIRMED BANNER */}
      <div className="bg-[#389C9A] text-white py-3 px-6 flex items-center gap-3">
        <div className="w-5 h-5 bg-white flex items-center justify-center rounded-none shrink-0">
          <Check className="w-3 h-3 text-[#389C9A]" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest italic">
          Partnership Confirmed · {businessName} x {user?.user_metadata?.full_name || "Creator"}
        </p>
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* SECTION 2 — CAMPAIGN OVERVIEW CARD */}
        <section className="px-6 py-8">
          <div className="w-full bg-white border-2 border-[#1D1D1D] rounded-none overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-none overflow-hidden border border-[#1D1D1D]/10 bg-[#F8F8F8]">
                  <ImageWithFallback src={businessLogo} className="w-full h-full object-cover grayscale" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-xl uppercase italic tracking-tighter">{businessName}</h2>
                    <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">{campaignName}</p>
                </div>
              </div>

              <div className="h-[1px] bg-[#1D1D1D]/10 my-6" />

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Calendar className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">Campaign Period</p>
                    <p className="text-xs font-bold uppercase tracking-tight italic">{startDate} — {endDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <VideoIcon className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">Package</p>
                    <p className="text-xs font-bold uppercase tracking-tight italic">{totalStreams} Streams</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Tag className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">Campaign Type</p>
                    <p className="text-xs font-bold uppercase tracking-tight italic">{campaign.type || "Banner + Code"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Pound className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">Total Earnings</p>
                    <p className="text-sm font-black uppercase tracking-tight italic">₦{totalEarnings.toLocaleString()}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic mt-1">Paid per every 3 verified qualifying streams</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — WHAT YOU NEED TO DO */}
        <section className="px-6 py-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">YOUR RESPONSIBILITIES</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-8 italic">Read carefully. These are your confirmed obligations for this campaign.</p>

          <div className="space-y-4">
            {[
              {
                icon: Clock,
                title: "Minimum Stream Duration",
                detail: "Every stream must be a minimum of 45 minutes to count as a qualifying stream toward your package."
              },
              {
                icon: ImageIcon,
                title: "Banner Visibility",
                detail: "Your campaign banner must be clearly visible throughout the entire duration of every qualifying stream. Do not cover, minimize or remove the banner during the stream."
              },
              {
                icon: Megaphone,
                title: "Promo Code Mentions",
                detail: `You must verbally mention the promo code ${promoCode} at least once per hour during every qualifying stream.`
              },
              {
                icon: Calendar,
                title: "Streaming Schedule",
                detail: "You are expected to stream according to the frequency agreed in this package. If you need to reschedule a stream notify the business via the LiveLink message thread at least 24 hours in advance."
              },
              {
                icon: Shield,
                title: "Content Standards",
                detail: "No offensive, adult, violent or illegal content may appear during any sponsored stream. Violation will result in immediate campaign termination and forfeiture of earned funds."
              },
              {
                icon: PhoneOff,
                title: "No External Communication",
                detail: "All communication with the business must remain exclusively within the LiveLink platform. Sharing contact details or moving conversations outside the app will result in account closure and loss of all funds."
              }
            ].map((resp, i) => (
              <div key={i} className="bg-white border-2 border-[#1D1D1D] p-6 flex gap-6 rounded-none">
                <div className="w-10 h-10 bg-[#1D1D1D]/5 rounded-none flex items-center justify-center shrink-0 border border-[#1D1D1D]/10">
                  <resp.icon className="w-5 h-5 text-[#389C9A]" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 italic">{resp.title}</h3>
                  <p className="text-[11px] font-medium leading-relaxed italic opacity-60">{resp.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 — COMMUNICATION */}
        <section className="px-6 py-8 border-y-2 border-[#1D1D1D] bg-[#F8F8F8]">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">COMMUNICATION</h2>

          <button
            onClick={() => setIsMessagesOpen(!isMessagesOpen)}
            className={`w-full py-6 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic border-2 border-[#1D1D1D] mb-6 shadow-none ${
              isMessagesOpen ? 'bg-white text-[#1D1D1D]' : 'bg-[#1D1D1D] text-white'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${isMessagesOpen ? 'text-[#389C9A]' : 'text-[#389C9A]'}`} />
            {isMessagesOpen ? 'Close Messages' : `Message ${businessName}`}
          </button>

          <AnimatePresence>
            {isMessagesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="bg-white border-2 border-[#1D1D1D] p-6 space-y-4">
                  <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${
                          msg.sender_type === "creator"
                            ? "bg-[#389C9A]/10 self-end text-right"
                            : "bg-[#1D1D1D]/5 self-start"
                        } p-4 rounded-none border border-[#1D1D1D]/10 max-w-[85%]`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">
                          {msg.sender_type === "creator" ? "You" : businessName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-[11px] font-medium leading-relaxed italic">{msg.message}</p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-[#1D1D1D]/10">
                    <input
                      type="text"
                      placeholder="TYPE A MESSAGE..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1 bg-white border-2 border-[#1D1D1D] px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none italic"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-[#1D1D1D] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest italic active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-[#1D1D1D] border-2 border-[#FEDB71] p-8 text-center rounded-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FEDB71]" />
            <AlertTriangle className="w-8 h-8 text-[#FEDB71] mx-auto mb-6" />
            <p className="text-[10px] font-bold uppercase tracking-tight italic text-white leading-relaxed opacity-80">
              All communication must remain within the LiveLink platform. Any attempt to move conversations outside the app will result in immediate account closure.
            </p>
          </div>
        </section>

        {/* SECTION 5 — YOUR CAMPAIGN ASSETS */}
        <section className="px-6 py-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">YOUR ASSETS</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-8 italic">Everything you need to run this campaign is here.</p>

          <div className="space-y-8">
            {/* Banner - using the actual campaign banner_url */}
            <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-none">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 italic opacity-40">Campaign Banner</h3>
              <div className="w-full h-12 bg-black border border-[#1D1D1D] mb-4 relative overflow-hidden group">
                <ImageWithFallback
                  src={campaign.banner_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=100&fit=crop"}
                  className="w-full h-full object-cover grayscale opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-black uppercase tracking-[0.4em] opacity-40 italic">BANNER PREVIEW</div>
              </div>
              <p className="text-[10px] font-medium text-[#1D1D1D]/40 italic mb-6">
                This banner is dynamic. Our tracking system detects this specific graphic in your stream.
              </p>
              <button
                onClick={() => {
                  // Download banner
                  if (campaign.banner_url) {
                    const link = document.createElement("a");
                    link.href = campaign.banner_url;
                    link.download = "banner.png";
                    link.click();
                  } else {
                    toast.error("No banner available");
                  }
                }}
                className="w-full py-5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic border-2 border-[#1D1D1D]"
              >
                <Download className="w-4 h-4 text-[#FEDB71]" /> DOWNLOAD BANNER
              </button>
            </div>

            {/* Promo Code */}
            <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-none">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 italic opacity-40">Your Promo Code</h3>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-[#FEDB71] border-2 border-[#1D1D1D] p-5 flex items-center justify-center">
                  <span className="text-xl font-black uppercase tracking-widest italic">{promoCode}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(promoCode, "Promo Code")}
                  className="bg-white border-2 border-[#1D1D1D] p-5 active:bg-[#F8F8F8] transition-all"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest italic">Discount: 20% off for your viewers</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">Code expires: {endDate}</p>
              </div>
              <div className="pt-4 border-t border-[#1D1D1D]/10">
                <p className="text-[9px] font-black uppercase tracking-widest italic text-[#389C9A]">Used 0 times so far · updates daily</p>
              </div>
            </div>

            {/* OBS Overlay URL */}
            <div className="bg-white border-2 border-[#1D1D1D] p-6 rounded-none">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 italic opacity-40">OBS Overlay URL</h3>
              <p className="text-[10px] font-medium text-[#1D1D1D]/40 italic mb-6">
                Add this URL as a browser source in OBS or Streamlabs to display your banner automatically during streams.
              </p>
              <div className="flex gap-2 mb-6">
                <div className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 font-mono text-[10px] truncate italic opacity-60">
                  {obsUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(obsUrl, "OBS URL")}
                  className="bg-white border-2 border-[#1D1D1D] px-4 active:bg-[#F8F8F8] transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsGuidModalOpen(true)}
                className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D] flex items-center gap-2 hover:translate-x-1 transition-transform italic"
              >
                How to add this to my stream <ArrowRight className="w-3.5 h-3.5 text-[#389C9A]" />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 6 — STREAM PROGRESS TRACKER */}
        <section className="px-6 py-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">STREAM PROGRESS</h2>

          <div className="w-full bg-[#1D1D1D]/5 h-3 border border-[#1D1D1D]/10 rounded-none mb-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-[#389C9A]"
            />
          </div>

          <div className="flex justify-between items-center mb-10 italic">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
              {streamsCompleted} of {totalStreams} streams completed
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{Math.round(progressPercent)}% complete</p>
          </div>

          <button className="w-full py-6 bg-white border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-[0.2em] italic active:bg-[#F8F8F8] transition-all rounded-none">
            Submit Stream Proof
          </button>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mt-4 text-center italic leading-relaxed px-4">
            After each qualifying stream upload your analytics screenshot to log your progress and trigger your payout.
          </p>
        </section>

        {/* SECTION 7 — PAYOUT SCHEDULE */}
        <section className="px-6 py-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">PAYOUT SCHEDULE</h2>

          <div className="border-2 border-[#1D1D1D] bg-white rounded-none overflow-hidden">
            {payoutSchedule.map((row, i) => (
              <div key={i} className={`flex justify-between items-center p-5 italic ${i !== payoutSchedule.length - 1 ? 'border-b border-[#1D1D1D]/10' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{row.label}</span>
                <span className="text-sm font-black italic">{row.amount}</span>
              </div>
            ))}
            <div className="bg-[#1D1D1D] p-5 flex justify-between items-center text-white italic">
              <span className="text-[10px] font-black uppercase tracking-widest">Total Earnings</span>
              <span className="text-xl font-black italic text-[#FEDB71]">₦{totalEarnings.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mt-4 italic">
            Payouts are processed within 3 to 5 business days of each verification.
          </p>
        </section>

        {/* SECTION 8 — NEED HELP */}
        <section className="px-6 py-12">
          <div className="bg-[#FEDB71]/10 p-10 border-2 border-dashed border-[#FEDB71] text-center rounded-none">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-3">NEED HELP?</h2>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-10 italic leading-relaxed">
              If you have any issues with your assets, campaign rules or payments contact the LiveLink support team.
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setIsSupportModalOpen(true)}
                className="w-full py-5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest italic active:scale-[0.98] transition-all border-2 border-[#1D1D1D]"
              >
                Contact LiveLink Support
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-5 bg-white border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest italic active:bg-[#F8F8F8] transition-all"
              >
                Report a Campaign Issue
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Guide Modal */}
      <AnimatePresence>
        {isGuidModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGuidModalOpen(false)} className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] rounded-t-[32px] overflow-hidden">
              <div className="w-12 h-1.5 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              <div className="px-8 pt-4 pb-12 flex flex-col gap-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">Setup Guide</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">Add your dynamic banner to your stream software.</p>
                  </div>
                  <button onClick={() => setIsGuidModalOpen(false)} className="p-3 bg-white border border-[#1D1D1D]/10">
                    <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />
                  </button>
                </div>

                <div className="space-y-10">
                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center shrink-0">
                      <span className="text-[#FEDB71] font-black italic">01</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 italic">Copy Overlay URL</h4>
                      <p className="text-[11px] font-medium leading-relaxed italic opacity-60">Copy your unique browser source URL from the assets section.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center shrink-0">
                      <span className="text-[#FEDB71] font-black italic">02</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 italic">Add Browser Source</h4>
                      <p className="text-[11px] font-medium leading-relaxed italic opacity-60">Open OBS/Streamlabs. Click + in Sources and select "Browser".</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center shrink-0">
                      <span className="text-[#FEDB71] font-black italic">03</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 italic">Configure Source</h4>
                      <p className="text-[11px] font-medium leading-relaxed italic opacity-60">Paste the URL. Set width to 1920 and height to 1080 (standard 16:9).</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuidModalOpen(false)}
                  className="w-full py-6 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-[0.2em] italic active:scale-[0.98] transition-all"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSupportModalOpen(false)} className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] rounded-t-[32px] overflow-hidden">
              <div className="w-12 h-1.5 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              <div className="px-8 pt-4 pb-12">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">Support Request</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">Send a message to our support team.</p>
                  </div>
                  <button onClick={() => setIsSupportModalOpen(false)} className="p-3 bg-white border border-[#1D1D1D]/10">
                    <AlertOctagon className="w-5 h-5 text-[#389C9A]" />
                  </button>
                </div>

                <form onSubmit={handleSupportSubmit} className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Support Category</label>
                    <div className="relative">
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="w-full bg-white border-2 border-[#1D1D1D] p-5 text-[11px] font-black uppercase tracking-widest outline-none appearance-none rounded-none italic pr-12"
                      >
                        <option value="" disabled>Select a category...</option>
                        {supportCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A] rotate-90" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Your Message</label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="TELL US MORE..."
                      rows={5}
                      className="w-full bg-white border-2 border-[#1D1D1D] p-5 text-[11px] font-black uppercase tracking-widest outline-none rounded-none italic resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-6 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-[0.2em] italic active:scale-[0.98] transition-all border-2 border-[#1D1D1D]"
                  >
                    Send Support Message
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] rounded-t-[32px] overflow-hidden">
              <div className="w-12 h-1.5 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              <div className="px-8 pt-4 pb-12">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2 text-[#FF5252]">Report Issue</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">Report a specific problem with this campaign.</p>
                  </div>
                  <button onClick={() => setIsReportModalOpen(false)} className="p-3 bg-white border border-[#1D1D1D]/10">
                    <AlertTriangle className="w-5 h-5 text-[#FF5252]" />
                  </button>
                </div>

                <form onSubmit={handleReportSubmit} className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Issue Category</label>
                    <div className="relative">
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full bg-white border-2 border-[#1D1D1D] p-5 text-[11px] font-black uppercase tracking-widest outline-none appearance-none rounded-none italic pr-12"
                      >
                        <option value="" disabled>Select an issue...</option>
                        {reportCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF5252] rotate-90" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Issue Details</label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="DESCRIBE THE PROBLEM..."
                      rows={5}
                      className="w-full bg-white border-2 border-[#1D1D1D] p-5 text-[11px] font-black uppercase tracking-widest outline-none rounded-none italic resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-6 bg-[#FF5252] text-white text-[10px] font-black uppercase tracking-[0.2em] italic active:scale-[0.98] transition-all border-2 border-[#1D1D1D]"
                  >
                    Submit Formal Report
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}