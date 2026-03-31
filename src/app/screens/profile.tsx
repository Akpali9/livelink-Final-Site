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
  MessageSquare,
  Zap,
  Eye,
  AlertCircle,
  X,
  Clock,
  Settings,
  Mail,
  Phone,
  Globe,
  Twitter,
  Package,
  Info,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface CreatorPlatform {
  id: string;
  platform_type: string;
  username: string;
  profile_url: string;
  followers_count: number;
}

interface CreatorPackage {
  id: string;
  name: string;
  streams: number;
  price: number;
  description: string;
  enabled: boolean;
  is_default?: boolean;
}

interface FormattedCreator {
  id: string;
  user_id: string;
  name: string;
  username: string;
  email: string;
  phone_number: string;
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
  packages: CreatorPackage[];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getPlatformIconComponent(platformName: string) {
  switch (platformName.toLowerCase()) {
    case "twitch":    return <Twitch className="w-3 h-3 text-[#389C9A]" />;
    case "youtube":   return <Youtube className="w-3 h-3 text-[#389C9A]" />;
    case "instagram": return <Instagram className="w-3 h-3 text-[#389C9A]" />;
    case "facebook":  return <Facebook className="w-3 h-3 text-[#389C9A]" />;
    case "twitter":   return <Twitter className="w-3 h-3 text-[#389C9A]" />;
    case "tiktok":    return <VideoIcon className="w-3 h-3 text-[#389C9A]" />;
    default:          return <Globe className="w-3 h-3 text-[#389C9A]" />;
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
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [id, setId] = useState<string | undefined>(
    rawId === "me" ? undefined : rawId
  );

  useEffect(() => {
    if (rawId !== "me") {
      setId(rawId);
      return;
    }
    if (!user) { navigate("/login"); return; }

    supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Creator profile not found");
          navigate("/");
          return;
        }
        setId(data.id);
      });
  }, [rawId, user]);

  const [creator, setCreator] = useState<FormattedCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customOffer, setCustomOffer] = useState({
    streams: "",
    rate: "",
    type: "Banner Only",
    message: "",
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // ─── Helper to compute stats from campaign data ──────────────────────────
  const computeCreatorStats = async (creatorId: string) => {
    // 1. Total completed streams from campaigns
    const { data: campaignRows, error: campError } = await supabase
      .from("campaign_creators")
      .select("streams_completed, status")
      .eq("creator_id", creatorId)
      .in("status", ["active", "completed"]);

    if (campError) {
      console.error("Error fetching campaign_creators:", campError);
      return null;
    }
    const totalStreams = (campaignRows || []).reduce(
      (sum, cc) => sum + (cc.streams_completed || 0),
      0
    );

    // 2. Average viewers from stream_proofs (if viewer_count column exists)
    //    If your table does not have viewer_count, comment this out and keep profile avg.
    let avgViewers = 0;
    try {
      const { data: proofs, error: proofError } = await supabase
        .from("stream_proofs")
        .select("viewer_count")
        .eq("campaign_creator_id", creatorId)
        .not("viewer_count", "is", null);

      if (!proofError && proofs && proofs.length > 0) {
        const sum = proofs.reduce((s, p) => s + (p.viewer_count || 0), 0);
        avgViewers = Math.round(sum / proofs.length);
      }
    } catch (err) {
      // If column doesn't exist, ignore and fallback to profile value
      console.warn("viewer_count column may not exist. Falling back to profile avg_viewers.");
    }

    return { totalStreams, avgViewers };
  };

  // ─── FETCH CREATOR ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!id || id === "me") return;

    const fetchCreator = async () => {
      setLoading(true);
      try {
        // 1. Get creator profile
        const { data: creatorData, error: creatorError } = await supabase
          .from("creator_profiles")
          .select(`
            id, user_id, full_name, username, email, phone_number,
            phone_country_code, avatar_url, bio, location, country, city,
            niche, categories, avg_viewers, avg_concurrent, total_streams,
            rating, status, verification_status, frequency, duration, days,
            time_of_day, total_earned, pending_earnings, paid_out, created_at
          `)
          .eq("id", id)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creatorData) { setCreator(null); setLoading(false); return; }

        // 2. Get platforms
        const { data: platformsData } = await supabase
          .from("creator_platforms")
          .select("*")
          .eq("creator_id", id);

        // 3. Compute stats from campaigns
        const computedStats = await computeCreatorStats(id);

        // 4. Determine packages (you can load from DB or use defaults)
        const defaultPackages: CreatorPackage[] = [
          { id: "1", name: "Bronze Package", streams: 4,  price: 15000, description: "Perfect for testing the partnership",  enabled: true,  is_default: false },
          { id: "2", name: "Silver Package", streams: 8,  price: 28000, description: "Best value for ongoing campaigns",     enabled: true,  is_default: true  },
          { id: "3", name: "Gold Package",   streams: 12, price: 40000, description: "Maximum exposure for premium brands",  enabled: true,  is_default: false },
        ];

        // 5. Check if viewing own profile
        if (user && creatorData.user_id === user.id) setIsOwnProfile(true);

        // 6. Check if viewer is a business
        if (user) {
          const { data: business } = await supabase
            .from("businesses")
            .select("id, business_name, email, logo_url")
            .eq("user_id", user.id)
            .maybeSingle();
          if (business) { setIsBusiness(true); setBusinessProfile(business); }
        }

        // 7. Build final creator object
        const formatted: FormattedCreator = {
          id:           creatorData.id,
          user_id:      creatorData.user_id,
          name:         creatorData.full_name || "Unknown Creator",
          username:     creatorData.username
                          ? creatorData.username
                          : (creatorData.full_name || "creator").toLowerCase().replace(/\s+/g, ""),
          email:        creatorData.email || "",
          phone_number: creatorData.phone_number || "",
          avatar:       creatorData.avatar_url || "https://via.placeholder.com/200",
          bio:          creatorData.bio || "Live streamer and content creator passionate about engaging with audiences.",
          location:     creatorData.location || `${creatorData.city || ""}, ${creatorData.country || ""}`.replace(/^, |, $/, "") || "Remote",
          verified:     creatorData.verification_status === "approved",
          availability: creatorData.status === "active" ? "Available for campaigns" : "Not available",
          niches:       (creatorData.niche?.length ? creatorData.niche : creatorData.categories) || [],
          stats: {
            avgViewers:  computedStats?.avgViewers ?? creatorData.avg_viewers ?? creatorData.avg_concurrent ?? 0,
            totalStreams: computedStats?.totalStreams ?? creatorData.total_streams ?? 0,
            rating:       creatorData.rating ?? 0,
          },
          platforms: (platformsData || []).map((p: CreatorPlatform) => ({
            name:      p.platform_type,
            followers: p.followers_count || 0,
            url:       p.profile_url || "#",
            username:  p.username,
          })),
          packages: defaultPackages.filter((p) => p.enabled),
        };

        setCreator(formatted);
      } catch (error) {
        console.error("Error fetching creator:", error);
        toast.error("Failed to load creator profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [id, user]);

  // ─── DERIVED STATE ───────────────────────────────────────────────────────

  const selectedPackage = creator?.packages.find(p => p.id === selectedPackageId) ?? null;

  const getEstimates = (streams: number) => {
    if (!creator) return null;
    const avg = creator.stats.avgViewers;
    return {
      uniqueViewers: Math.round(avg * 0.4 * streams + 500),
      hours:         streams * 1.5,
      impressions:   Math.round(avg * 1.4 * streams),
    };
  };

  const estimates = selectedPackage ? getEstimates(selectedPackage.streams) : null;

  // ─── OFFER SEND ──────────────────────────────────────────────────────────

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please login to send an offer"); navigate("/login/business"); return; }
    if (!isBusiness) { toast.error("Only businesses can send offers"); return; }
    if (!creator) return;

    const streams = selectedPackage
      ? selectedPackage.streams
      : parseInt(customOffer.streams);
    const rate = selectedPackage
      ? selectedPackage.price / selectedPackage.streams
      : parseFloat(customOffer.rate);

    try {
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

      const { data: existing } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("campaign_id", campaignRow.id)
        .eq("creator_id", creator.id)
        .maybeSingle();

      if (existing) {
        toast.info("You've already sent an offer to this creator.");
        return;
      }

      const { error } = await supabase.from("campaign_creators").insert({
        campaign_id:       campaignRow.id,
        creator_id:        creator.id,
        status: "NOT STARTED",
        streams_target:    streams,
        streams_completed: 0,
        total_earnings:    streams * rate,
        paid_out:          0,
        created_at:        new Date().toISOString(),
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id:    creator.user_id,
        type:       "new_offer",
        title:      "New Campaign Offer! 🎉",
        message:    `${businessProfile.business_name} sent you an offer for ${streams} streams.`,
        data:       { business_id: businessProfile.id, campaign_id: campaignRow.id, creator_id: creator.id },
        created_at: new Date().toISOString(),
      });

      setOfferSent(true);
      toast.success("Offer sent successfully!");
      setCustomOffer({ streams: "", rate: "", type: "Banner Only", message: "" });
      setSelectedPackageId(null);
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    }
  };

  const handleContact = async () => {
    if (!user) { toast.error("Please login to contact creator"); navigate("/login/business"); return; }
    if (!creator) return;

    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${creator.user_id}),and(participant1_id.eq.${creator.user_id},participant2_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        navigate(`/messages/${existing.id}?role=business`);
      } else {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({
            participant1_id:   user.id,
            participant2_id:   creator.user_id,
            participant1_type: "business",
            participant2_type: "creator",
            last_message_at:   new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        if (newConv) navigate(`/messages/${newConv.id}?role=business`);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  // ─── LOADING / NOT FOUND ─────────────────────────────────────────────────

  if (loading || (rawId === "me" && !id)) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Profile Not Found</h2>
          <p className="text-gray-400 text-center mb-8">
            The creator you're looking for doesn't exist or is not active.
          </p>
          <button
            onClick={() => navigate("/browse")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest"
          >
            Browse Creators
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Creator Profile" />

      <main className="max-w-[480px] mx-auto w-full">

        {/* ── Profile Header ── */}
        <div className="bg-white border-b border-[#1D1D1D]">
          <div className="px-6 py-12 flex flex-col items-center text-center relative">

            {isOwnProfile && (
              <button
                onClick={() => navigate("/settings")}
                className="absolute top-6 right-6 border-2 border-[#1D1D1D] p-3 hover:bg-[#1D1D1D] hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <div className="relative mb-6">
              <div className="w-32 h-32 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">
                <ImageWithFallback
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
            </div>

            <div className="flex flex-col items-center mb-4">
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none italic mb-1">
                {creator.name}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                @{creator.username}
              </span>
            </div>

            {creator.platforms.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {creator.platforms.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-[#389C9A]/10 px-2 py-1 border border-[#389C9A]/20">
                    {getPlatformIconComponent(p.name)}
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] italic">{p.name}</span>
                  </div>
                ))}
                {creator.verified && (
                  <div className="flex items-center gap-1.5 bg-[#FEDB71]/10 px-2 py-1 border border-[#FEDB71]/20">
                    <CheckCircle2 className="w-3 h-3 text-[#1D1D1D]" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]">Verified</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 mb-4 text-[10px] font-bold uppercase tracking-widest italic">
              <MapPin className="w-3 h-3 text-[#1D1D1D]/40" />
              <span>{creator.location}</span>
            </div>

            {creator.niches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {creator.niches.map((n, i) => (
                  <span key={i} className="text-[9px] font-bold uppercase tracking-widest bg-[#F8F8F8] px-2 py-0.5 border border-[#1D1D1D]/10 italic">
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="w-full max-w-sm mb-6">
              <p className={`text-sm leading-relaxed text-[#1D1D1D]/80 ${!isBioExpanded ? "line-clamp-3" : ""}`}>
                {creator.bio}
              </p>
              {creator.bio.length > 120 && (
                <button
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                  className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1 mx-auto underline"
                >
                  {isBioExpanded
                    ? <><ChevronUp className="w-3 h-3" /> Show less</>
                    : <><ChevronDown className="w-3 h-3" /> Read more</>}
                </button>
              )}
            </div>

            {isBusiness && (creator.email || creator.phone_number) && (
              <div className="flex flex-col gap-2 w-full max-w-sm mb-6 p-4 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-left">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Contact Details</p>
                {creator.email && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-[#389C9A] shrink-0" />
                    <span className="font-medium truncate">{creator.email}</span>
                  </div>
                )}
                {creator.phone_number && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-[#389C9A] shrink-0" />
                    <span className="font-medium">{creator.phone_number}</span>
                  </div>
                )}
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
              <span className={`w-2 h-2 ${creator.availability.includes("Available") ? "bg-[#389C9A]" : "bg-red-500"}`} />
              {creator.availability}
            </div>

            {!isOwnProfile && isBusiness && (
              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={() => {
                    setSelectedPackageId(null);
                    setOfferSent(false);
                    document.getElementById("offer-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all italic flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#FEDB71]" /> Send Offer
                </button>
                <button
                  onClick={handleContact}
                  className="flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all italic flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>
            )}

            {isOwnProfile && (
              <button
                onClick={() => navigate("/settings")}
                className="w-full mt-6 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all italic flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4 text-[#FEDB71]" /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Row – now uses computed stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#1D1D1D] border-b border-[#1D1D1D]">
          <div className="bg-white p-6 flex flex-col gap-1 items-center text-center">
            <span className="text-2xl font-black italic">{formatNumber(creator.stats.avgViewers)}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">Avg Viewers</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1 items-center text-center">
            <span className="text-2xl font-black italic text-[#389C9A]">{creator.stats.totalStreams}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">Total Streams</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1 items-center text-center">
            <span className="text-2xl font-black italic">{creator.niches.length}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">Niches</span>
          </div>
          <div className="bg-white p-6 flex flex-col gap-1 items-center text-center">
            <span className="text-2xl font-black italic text-[#FEDB71]">{creator.stats.rating?.toFixed(1) || "—"}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">Rating</span>
          </div>
        </div>

        <div className="px-6 py-12" id="offer-section">

          {/* ── Partnership Packages ── */}
          {creator.packages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Partnership Packages</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-8 italic">
                Choose a package or make the creator a custom offer below.
              </p>

              <div className="flex flex-col gap-6">
                {creator.packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => isBusiness && setSelectedPackageId(pkg.id === selectedPackageId ? null : pkg.id)}
                    className={`relative transition-all border-2 flex flex-col ${isBusiness ? "cursor-pointer" : ""} ${
                      selectedPackageId === pkg.id
                        ? "border-[#1D1D1D] bg-white scale-[1.02]"
                        : "border-[#1D1D1D]/10 bg-[#F8F8F8] hover:border-[#389C9A]/40"
                    } ${pkg.is_default ? "pt-12 pb-10" : "py-8"}`}
                  >
                    {pkg.is_default && (
                      <div className="absolute top-0 left-0 right-0 h-10 bg-[#FEDB71] flex items-center justify-center border-b-2 border-[#1D1D1D]">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D] italic">Most Popular</span>
                      </div>
                    )}

                    <div className="px-8 flex flex-col items-center text-center">
                      <span className="text-[10px] font-black tracking-widest mb-4 opacity-40 italic">
                        {pkg.name.toUpperCase()}
                      </span>
                      <span className="text-4xl font-black uppercase tracking-tighter italic mb-1">
                        {pkg.streams} Streams
                      </span>
                      <p className="text-[10px] font-medium text-[#1D1D1D]/60 mb-6 px-4 leading-relaxed italic">
                        {pkg.description}
                      </p>
                      <span className="text-3xl font-black mb-8 italic text-[#389C9A]">
                        ₦{pkg.price.toLocaleString()}
                      </span>

                      {isBusiness && (
                        <button
                          className={`w-full py-4 text-[10px] font-black uppercase tracking-widest transition-all italic ${
                            pkg.is_default
                              ? "bg-[#1D1D1D] text-white"
                              : "border-2 border-[#1D1D1D] text-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white"
                          } ${selectedPackageId === pkg.id && !pkg.is_default ? "bg-[#1D1D1D] text-white" : ""}`}
                        >
                          {selectedPackageId === pkg.id ? "Selected ✓" : "Select"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Estimated Viewership ── */}
          <AnimatePresence>
            {selectedPackage && estimates && isBusiness && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-12"
              >
                <div className="bg-white border-2 border-[#1D1D1D] p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 italic">
                    Estimated Viewership for This Package
                  </h3>

                  <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-[#389C9A] mt-1" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight italic">
                          Approx. {estimates.uniqueViewers.toLocaleString()} unique viewers
                        </p>
                        <p className="text-[10px] text-[#1D1D1D]/40 uppercase tracking-widest">
                          over {selectedPackage.streams} streams
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <VideoIcon className="w-4 h-4 text-[#389C9A] mt-1" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight italic">
                          Approx. {estimates.hours} hours
                        </p>
                        <p className="text-[10px] text-[#1D1D1D]/40 uppercase tracking-widest">
                          of live brand exposure
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart className="w-4 h-4 text-[#389C9A] mt-1" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight italic">
                          Approx. {estimates.impressions.toLocaleString()} banner impressions
                        </p>
                        <p className="text-[10px] text-[#1D1D1D]/40 uppercase tracking-widest">
                          based on avg concurrent viewers
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-[#1D1D1D]/30 italic mb-8 uppercase tracking-widest">
                    Estimates are based on this creator's historical average. Actual figures may vary.
                  </p>

                  <button
                    onClick={() => {
                      document.getElementById("custom-offer-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full bg-[#1D1D1D] text-white py-6 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 italic active:scale-[0.98] transition-all"
                  >
                    Proceed to Send Offer <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Custom Offer / Send Offer Form ── */}
          {isBusiness && (
            <div className="mb-12 pt-12 border-t border-[#1D1D1D]/10" id="custom-offer-form">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">
                {selectedPackage ? "Confirm Your Offer" : "Make a Custom Offer"}
              </h2>
              <p className="text-xs text-[#1D1D1D]/60 mb-8 italic">
                {selectedPackage
                  ? `You've selected the ${selectedPackage.name}. Complete and send your offer below.`
                  : "If none of the packages fit your needs, propose your own terms directly."}
              </p>

              {offerSent ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-[#1D1D1D] p-8 text-center"
                >
                  <div className="w-12 h-12 bg-[#389C9A]/10 flex items-center justify-center mx-auto mb-4 border border-[#389C9A]/20">
                    <CheckCircle2 className="w-6 h-6 text-[#389C9A]" />
                  </div>
                  <h3 className="font-black uppercase tracking-widest mb-4 italic">Offer Sent!</h3>
                  <p className="text-xs text-[#1D1D1D]/60 leading-relaxed italic">
                    Your offer has been sent to {creator.name}. They will review it and respond within 48 hours.
                    You can track this in your My Campaigns tab.
                  </p>
                  <button
                    onClick={() => { setOfferSent(false); setSelectedPackageId(null); }}
                    className="mt-8 text-[10px] font-black uppercase tracking-widest underline italic text-[#389C9A]"
                  >
                    Send another offer
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSendOffer} className="space-y-6">
                  {!selectedPackage && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-2 italic">
                        Number of streams
                      </label>
                      <input
                        type="number"
                        min="4"
                        placeholder="e.g. 8"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-bold outline-none focus:border-[#1D1D1D] transition-all italic"
                        value={customOffer.streams}
                        onChange={(e) => setCustomOffer({ ...customOffer, streams: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {!selectedPackage && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-2 italic">
                        Your offered rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#389C9A]">₦</span>
                        <input
                          type="number"
                          min="1000"
                          placeholder="per every 4 qualifying lives"
                          className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 pl-8 text-xs font-bold outline-none focus:border-[#1D1D1D] transition-all italic"
                          value={customOffer.rate}
                          onChange={(e) => setCustomOffer({ ...customOffer, rate: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {selectedPackage && (
                    <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest italic">{selectedPackage.name}</p>
                        <p className="text-[9px] text-[#1D1D1D]/40 uppercase">{selectedPackage.streams} streams</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black italic text-[#389C9A]">₦{selectedPackage.price.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPackageId(null)}
                          className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 underline italic"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-2 italic">
                      Campaign type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Banner Only", "Promo Code Only", "Banner + Promo Code"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCustomOffer({ ...customOffer, type })}
                          className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all italic ${
                            customOffer.type === type
                              ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                              : "bg-white border-[#1D1D1D]/10"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-2 italic">
                      Message to the creator
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Introduce your business, explain what you are looking for..."
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                      value={customOffer.message}
                      onChange={(e) => setCustomOffer({ ...customOffer, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-6 bg-[#1D1D1D] text-white font-black uppercase tracking-widest text-xs hover:bg-[#389C9A] transition-all italic active:scale-[0.98]"
                  >
                    Send Offer
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Important Notes ── */}
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-8 mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-[#389C9A] mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight italic">
                  All streams must be a minimum of 45 minutes to qualify toward your package
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-[#389C9A] mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight italic">
                  Packages are billed per every 4 qualifying lives completed
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-[#389C9A] mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight italic">
                  Payment is held securely and only released to the creator once streams are verified
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
