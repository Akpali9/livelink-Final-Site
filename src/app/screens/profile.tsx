import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  MapPin,
  CheckCircle2,
  Instagram,
  Youtube,
  Facebook,
  Twitch,
  Video as VideoIcon,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users,
  BarChart,
  Star,
  Calendar,
  TrendingUp,
  MessageSquare,
  Zap,
  Eye,
  AlertCircle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// INTERFACES (aligned with schema)
// ─────────────────────────────────────────────

interface CreatorPlatform {
  id: string;
  platform_type: string;
  followers_count: number;
  profile_url: string;
  username?: string;
}

// Raw row from creator_profiles join
interface CreatorRow {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  niche: string[] | null;
  avg_viewers: number;
  total_streams: number;
  rating: number;
  status: string;
  created_at: string;
  // joined
  creator_platforms: CreatorPlatform[];
}

interface FormattedCreator {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  verified: boolean;
  availability: string;
  niches: string[];
  stats: {
    avgViewers: number;
    totalStreams: number;
    rating: number;
  };
  platforms: {
    name: string;
    followers: number;
    url: string;
    username?: string;
  }[];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getPlatformIconComponent(platformName: string) {
  switch (platformName.toLowerCase()) {
    case "twitch":    return <Twitch className="w-4 h-4" />;
    case "youtube":   return <Youtube className="w-4 h-4" />;
    case "instagram": return <Instagram className="w-4 h-4" />;
    case "facebook":  return <Facebook className="w-4 h-4" />;
    default:          return <VideoIcon className="w-4 h-4" />;
  }
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState<FormattedCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [customOffer, setCustomOffer] = useState({
    streams: "4",
    rate: "",
    type: "Banner Only",
    message: "",
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  // ─── FETCH CREATOR ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const fetchCreator = async () => {
      setLoading(true);

      try {
        // ✅ Fixed: Removed non-existent tables (stream_updates, creator_packages)
        const { data: creatorData, error: creatorError } = await supabase
          .from("creator_profiles")
          .select(`
            id,
            user_id,
            full_name,
            username,
            email,
            avatar_url,
            bio,
            location,
            niche,
            avg_viewers,
            total_streams,
            rating,
            status,
            created_at,
            creator_platforms (
              id,
              platform_type,
              followers_count,
              profile_url,
              username
            )
          `)
          .eq("id", id)
          .eq("status", "active") // Only show active creators
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creatorData) {
          setCreator(null);
          return;
        }

        const raw = creatorData as CreatorRow;

        // ✅ Map raw DB columns → formatted shape
        const formatted: FormattedCreator = {
          id: raw.id,
          user_id: raw.user_id,
          name: raw.full_name || "Unknown Creator",
          username: raw.username
            ? `@${raw.username}`
            : `@${(raw.full_name || "creator").toLowerCase().replace(/\s+/g, "")}`,
          avatar: raw.avatar_url || "https://via.placeholder.com/200",
          bio: raw.bio || "Live streamer and content creator passionate about engaging with audiences.",
          location: raw.location || "Remote",
          verified: false, // No verified column in schema
          availability: raw.status === "active" ? "Available for campaigns" : "Not available",
          niches: raw.niche || ["Gaming", "Entertainment"],
          stats: {
            avgViewers: raw.avg_viewers || 0,
            totalStreams: raw.total_streams || 0,
            rating: raw.rating || 0,
          },
          platforms: (raw.creator_platforms || []).map((p) => ({
            name: p.platform_type,
            followers: p.followers_count || 0,
            url: p.profile_url || "#",
            username: p.username,
          })),
        };

        setCreator(formatted);

        // Check if current user is a business
        if (user) {
          const { data: business } = await supabase
            .from("businesses")
            .select("id, business_name, email, logo_url") // ✅ Fixed: contact_email → email
            .eq("user_id", user.id)
            .maybeSingle();

          if (business) {
            setIsBusiness(true);
            setBusinessProfile(business);
          }
        }
      } catch (error) {
        console.error("Error fetching creator:", error);
        toast.error("Failed to load creator profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [id, user]);

  // ─── OFFER ACTIONS ────────────────────────────────────────────────────────

  const handleCustomOffer = () => {
    setShowOfferModal(true);
  };

  const getEstimates = (streams: number, rate: number) => {
    if (!creator) return null;
    const avg = creator.stats.avgViewers;
    return {
      uniqueViewers: Math.round(avg * 0.4 * streams + 500),
      hours: streams * 1.5,
      impressions: Math.round(avg * 1.4 * streams),
      totalCost: streams * rate,
    };
  };

  const estimates =
    customOffer.streams && customOffer.rate
      ? getEstimates(parseInt(customOffer.streams), parseFloat(customOffer.rate))
      : null;

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to send an offer");
      navigate("/login/business");
      return;
    }

    if (!isBusiness) {
      toast.error("Only businesses can send offers");
      return;
    }

    if (!creator) return;

    try {
      // Find the business's most recent campaign
      const { data: campaignRow, error: campaignError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("business_id", businessProfile.id)
        .in("status", ["active", "draft", "pending_review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (campaignError) throw campaignError;

      if (!campaignRow) {
        toast.error("Please create a campaign first before sending an offer.");
        return;
      }

      // Check for existing row to avoid duplicates
      const { data: existing } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", campaignRow.id)
        .eq("creator_id", creator.id)
        .maybeSingle();

      if (existing) {
        toast.info("You've already sent an offer to this creator for your latest campaign.");
        setShowOfferModal(false);
        return;
      }

      // ✅ Fixed: Removed user_id from insert (doesn't exist in schema)
      const { error } = await supabase
        .from("campaign_creators")
        .insert({
          campaign_id: campaignRow.id,
          creator_id: creator.id,
          status: "pending",
          streams_target: parseInt(customOffer.streams),
          streams_completed: 0,
          total_earnings: parseFloat(customOffer.rate) * parseInt(customOffer.streams),
          paid_out: 0,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Create notification for creator
      await supabase.from("notifications").insert({
        user_id: creator.user_id,
        type: "new_offer",
        title: "New Campaign Offer! 🎉",
        message: `${businessProfile.business_name} sent you an offer for ${customOffer.streams} streams.`,
        data: { 
          business_id: businessProfile.id,
          campaign_id: campaignRow.id,
          creator_id: creator.id 
        },
        created_at: new Date().toISOString()
      });

      setOfferSent(true);
      setShowOfferModal(false);
      toast.success("Offer sent successfully!");

      setCustomOffer({ streams: "4", rate: "", type: "Banner Only", message: "" });
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    }
  };

  const handleContact = () => {
    if (!user) {
      toast.error("Please login to contact creator");
      navigate("/login/business");
      return;
    }
    navigate(`/messages/${creator?.user_id}`);
  };

  // ─── LOADING / NOT FOUND ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading profile...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Profile Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The creator you're looking for doesn't exist or is not active.</p>
          <button
            onClick={() => navigate("/browse")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Browse Creators
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Creator Profile" />

      <main className="max-w-[480px] mx-auto w-full">

        {/* Profile Header */}
        <div className="bg-white border-b border-[#1D1D1D]">
          <div className="px-6 py-12 flex flex-col items-center text-center">

            {/* Avatar */}
            <div className="relative mb-6">
              <div className="w-32 h-32 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] rounded-2xl">
                <ImageWithFallback
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              {creator.verified && (
                <div className="absolute -bottom-2 -right-2 bg-[#389C9A] p-1.5 rounded-full border-2 border-white">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Name & Username */}
            <div className="flex flex-col items-center mb-4">
              <h1 className="text-3xl font-black uppercase italic tracking-tight">{creator.name}</h1>
              <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">{creator.username}</span>
            </div>

            {/* Platform Badges */}
            {creator.platforms.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {creator.platforms.map((p, i) => (
                  <a
                    key={i}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#389C9A]/10 px-3 py-1.5 rounded-full border border-[#389C9A]/20 hover:bg-[#389C9A] hover:text-white transition-colors"
                  >
                    {getPlatformIconComponent(p.name)}
                    <span className="text-[8px] font-black uppercase">{p.name}</span>
                    <span className="text-[7px] font-medium opacity-60 ml-1">{formatNumber(p.followers)}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Location & Availability */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold italic">
                <MapPin className="w-3 h-3 text-[#1D1D1D]/40" />
                <span>{creator.location}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 border-2 border-[#1D1D1D] text-[8px] uppercase font-black italic rounded-full">
                <span className={`w-1.5 h-1.5 ${creator.availability.includes("Available") ? "bg-[#389C9A]" : "bg-gray-400"} rounded-full`} />
                {creator.availability}
              </div>
            </div>

            {/* Niches */}
            {creator.niches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {creator.niches.map((n, i) => (
                  <span
                    key={i}
                    className="text-[8px] font-black uppercase bg-[#F8F8F8] px-3 py-1.5 rounded-full border border-[#1D1D1D]/10 italic"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            <div className="w-full max-w-sm mb-6">
              <p className={`text-sm text-[#1D1D1D]/80 leading-relaxed ${!isBioExpanded ? "line-clamp-3" : ""}`}>
                {creator.bio}
              </p>
              {creator.bio.length > 120 && (
                <button
                  className="mt-2 text-[9px] uppercase text-[#389C9A] font-black hover:underline flex items-center gap-1"
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? (
                    <><ChevronUp className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Read more</>
                  )}
                </button>
              )}
            </div>

            {/* Action Buttons - Only show for businesses */}
            {isBusiness && (
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCustomOffer}
                  className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-xl flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#FEDB71]" /> Send Offer
                </button>
                <button
                  onClick={handleContact}
                  className="flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Users className="w-5 h-5 text-[#389C9A] mx-auto" />, value: formatNumber(creator.stats.avgViewers), label: "Avg Viewers" },
              { icon: <Eye className="w-5 h-5 text-[#389C9A] mx-auto" />, value: creator.stats.totalStreams, label: "Total Streams" },
              { icon: <Star className="w-5 h-5 text-[#FEDB71] mx-auto" />, value: creator.stats.rating || "—", label: "Rating" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">{s.icon}</div>
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platforms Detail */}
        {creator.platforms.length > 0 && (
          <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">Connected Platforms</h3>
            <div className="space-y-3">
              {creator.platforms.map((platform, i) => (
                <div key={i} className="bg-[#F8F8F8] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIconComponent(platform.name)}
                    <div>
                      <p className="font-black text-xs uppercase">{platform.name}</p>
                      {platform.username && (
                        <p className="text-[7px] font-medium opacity-40">@{platform.username}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-black">{formatNumber(platform.followers)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {isBusiness && (
          <div className="px-6 py-8">
            <div className="bg-gradient-to-r from-[#1D1D1D] to-gray-800 p-8 rounded-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
              <h4 className="text-xl font-black uppercase italic mb-2">Ready to collaborate?</h4>
              <p className="text-[9px] opacity-60 mb-6">Send an offer to start working with {creator.name}</p>
              <button
                onClick={handleCustomOffer}
                className="w-full bg-white text-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Send Offer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Offer Modal */}
      <AnimatePresence>
        {showOfferModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] rounded-t-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-4" />

              <div className="px-6 py-4">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Send Offer</h2>
                    <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">to {creator.name}</p>
                  </div>
                  <button
                    onClick={() => setShowOfferModal(false)}
                    className="p-2 border border-[#1D1D1D]/10 rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSendOffer} className="space-y-4">
                  {/* Campaign Type */}
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                      Campaign Type
                    </label>
                    <select
                      value={customOffer.type}
                      onChange={(e) => setCustomOffer({ ...customOffer, type: e.target.value })}
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                    >
                      <option>Banner Only</option>
                      <option>Promo Code</option>
                      <option>Banner + Promo Code</option>
                    </select>
                  </div>

                  {/* Streams */}
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                      Number of Streams
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={customOffer.streams}
                      onChange={(e) => setCustomOffer({ ...customOffer, streams: e.target.value })}
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                      required
                    />
                  </div>

                  {/* Rate per Stream */}
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                      Rate per Stream (£)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={customOffer.rate}
                      onChange={(e) => setCustomOffer({ ...customOffer, rate: e.target.value })}
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                      Personal Message (optional)
                    </label>
                    <textarea
                      value={customOffer.message}
                      onChange={(e) => setCustomOffer({ ...customOffer, message: e.target.value })}
                      rows={3}
                      placeholder="Tell the creator about your campaign..."
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl resize-none"
                    />
                  </div>

                  {/* Estimates */}
                  {estimates && (
                    <div className="bg-[#F8F8F8] p-4 rounded-xl">
                      <h4 className="text-[8px] font-black uppercase tracking-widest mb-3 flex items-center gap-1">
                        <BarChart className="w-3 h-3 text-[#389C9A]" />
                        Estimated Reach
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-[9px]">
                        <div>
                          <p className="opacity-40">Unique Viewers</p>
                          <p className="font-black">{estimates.uniqueViewers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="opacity-40">Total Hours</p>
                          <p className="font-black">{estimates.hours.toFixed(1)}h</p>
                        </div>
                        <div>
                          <p className="opacity-40">Impressions</p>
                          <p className="font-black">{estimates.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="opacity-40">Total Cost</p>
                          <p className="font-black text-[#389C9A]">£{estimates.totalCost}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#1D1D1D] text-white py-5 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center justify-center gap-2"
                  >
                    Send Offer <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Banner */}
      {offerSent && (
        <div className="fixed top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-[#389C9A] text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-black uppercase tracking-widest">Offer Sent Successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}
