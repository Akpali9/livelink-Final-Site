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
  DollarSign,
  Clock,
  Award,
  Settings,
  Edit,
  Mail,
  Phone,
  Globe,
  Link as LinkIcon,
  Twitter,
  Github,
  Linkedin,
  Package,
  Info,
  Shield,
  Camera,
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

// ── Added email + phone_number to FormattedCreator ──
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
    case "twitch":    return <Twitch className="w-4 h-4" />;
    case "youtube":   return <Youtube className="w-4 h-4" />;
    case "instagram": return <Instagram className="w-4 h-4" />;
    case "facebook":  return <Facebook className="w-4 h-4" />;
    case "twitter":   return <Twitter className="w-4 h-4" />;
    case "tiktok":    return <VideoIcon className="w-4 h-4" />;
    default:          return <Globe className="w-4 h-4" />;
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
  const [selectedPackage, setSelectedPackage] = useState<CreatorPackage | null>(null);
  const [customOffer, setCustomOffer] = useState({
    streams: "4",
    rate: "",
    type: "Banner Only",
    message: "",
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // ─── FETCH CREATOR ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const fetchCreator = async () => {
      setLoading(true);
      try {
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
            phone_number,
            niche,
            avg_viewers,
            total_streams,
            rating,
            status,
            created_at,
            updated_at
          `)
          .eq("id", id)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creatorData) { setCreator(null); return; }

        const { data: platformsData } = await supabase
          .from("creator_platforms")
          .select("*")
          .eq("creator_id", id);

        const defaultPackages: CreatorPackage[] = [
          { id: "1", name: "Bronze Package", streams: 4,  price: 15000, description: "Perfect for testing the partnership",       enabled: true, is_default: true },
          { id: "2", name: "Silver Package", streams: 8,  price: 28000, description: "Best value for ongoing campaigns",          enabled: true },
          { id: "3", name: "Gold Package",   streams: 12, price: 40000, description: "Maximum exposure for premium brands",       enabled: false },
        ];

        // Own profile check
        if (user && creatorData.user_id === user.id) setIsOwnProfile(true);

        // Business check
        if (user) {
          const { data: business } = await supabase
            .from("businesses")
            .select("id, business_name, email, logo_url")
            .eq("user_id", user.id)
            .maybeSingle();
          if (business) {
            setIsBusiness(true);
            setBusinessProfile(business);
          }
        }

        // ── Map all fields including email + phone_number ──
        const formatted: FormattedCreator = {
          id:           creatorData.id,
          user_id:      creatorData.user_id,
          name:         creatorData.full_name || "Unknown Creator",
          username:     creatorData.username
                          ? `@${creatorData.username}`
                          : `@${(creatorData.full_name || "creator").toLowerCase().replace(/\s+/g, "")}`,
          email:        creatorData.email || "",
          phone_number: creatorData.phone_number || "",
          avatar:       creatorData.avatar_url || "https://via.placeholder.com/200",
          bio:          creatorData.bio || "Live streamer and content creator passionate about engaging with audiences.",
          location:     creatorData.location || "Remote",
          verified:     false,
          availability: creatorData.status === "active" ? "Available for campaigns" : "Not available",
          niches:       creatorData.niche || ["Gaming", "Entertainment"],
          stats: {
            avgViewers:   creatorData.avg_viewers || 0,
            totalStreams:  creatorData.total_streams || 0,
            rating:        creatorData.rating || 0,
          },
          platforms: (platformsData || []).map((p: CreatorPlatform) => ({
            name:      p.platform_type,
            followers: p.followers_count || 0,
            url:       p.profile_url || "#",
            username:  p.username,
          })),
          packages: defaultPackages.filter(p => p.enabled),
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

  // ─── OFFER ACTIONS ───────────────────────────────────────────────────────

  const handleSelectPackage = (pkg: CreatorPackage) => {
    setSelectedPackage(pkg);
    setCustomOffer({ streams: pkg.streams.toString(), rate: pkg.price.toString(), type: "Banner Only", message: "" });
    setShowOfferModal(true);
  };

  const handleCustomOffer = () => {
    setSelectedPackage(null);
    setShowOfferModal(true);
  };

  const getEstimates = (streams: number, rate: number) => {
    if (!creator) return null;
    const avg = creator.stats.avgViewers;
    return {
      uniqueViewers: Math.round(avg * 0.4 * streams + 500),
      hours:         streams * 1.5,
      impressions:   Math.round(avg * 1.4 * streams),
      totalCost:     streams * rate,
    };
  };

  const estimates = selectedPackage
    ? getEstimates(selectedPackage.streams, selectedPackage.price)
    : customOffer.streams && customOffer.rate
    ? getEstimates(parseInt(customOffer.streams), parseFloat(customOffer.rate))
    : null;

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please login to send an offer"); navigate("/login/business"); return; }
    if (!isBusiness) { toast.error("Only businesses can send offers"); return; }
    if (!creator) return;

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
      if (!campaignRow) { toast.error("Please create a campaign first before sending an offer."); return; }

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

      const streams = selectedPackage ? selectedPackage.streams : parseInt(customOffer.streams);
      const rate    = selectedPackage ? selectedPackage.price / selectedPackage.streams : parseFloat(customOffer.rate);

      const { error } = await supabase.from("campaign_creators").insert({
        campaign_id:       campaignRow.id,
        creator_id:        creator.id,
        status:            "pending",
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
      setShowOfferModal(false);
      toast.success("Offer sent successfully!");
      setCustomOffer({ streams: "4", rate: "", type: "Banner Only", message: "" });
      setSelectedPackage(null);
      setTimeout(() => setOfferSent(false), 3000);
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
          <button onClick={() => navigate("/browse")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl">
            Browse Creators
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Creator Profile" userType={isBusiness ? "business" : "creator"} />

      <main className="max-w-[480px] mx-auto w-full">

        {/* Profile Header */}
        <div className="bg-white border-b border-[#1D1D1D]">
          <div className="px-6 py-12 flex flex-col items-center text-center relative">

            {isOwnProfile && (
              <button onClick={() => navigate("/settings")}
                className="absolute top-6 right-6 p-3 border-2 border-[#1D1D1D] rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors group">
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            )}

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
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-[#389C9A]/10 px-3 py-1.5 rounded-full border border-[#389C9A]/20 hover:bg-[#389C9A] hover:text-white transition-colors">
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

            {/* ── Contact Info — only for businesses ── */}
            {isBusiness && (creator.email || creator.phone_number) && (
              <div className="flex flex-col gap-2 w-full max-w-sm mb-6 p-4 bg-[#F8F8F8] border border-[#1D1D1D]/10 rounded-xl text-left">
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

            {/* Niches */}
            {creator.niches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {creator.niches.map((n, i) => (
                  <span key={i}
                    className="text-[8px] font-black uppercase bg-[#F8F8F8] px-3 py-1.5 rounded-full border border-[#1D1D1D]/10 italic">
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
                  {isBioExpanded
                    ? <><ChevronUp className="w-3 h-3" /> Show less</>
                    : <><ChevronDown className="w-3 h-3" /> Read more</>}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              {isOwnProfile ? (
                <button onClick={() => navigate("/settings")}
                  className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-xl flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4 text-[#FEDB71]" /> Edit Profile
                </button>
              ) : isBusiness ? (
                <>
                  <button onClick={handleCustomOffer}
                    className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-xl flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-[#FEDB71]" /> Send Offer
                  </button>
                  <button onClick={handleContact}
                    className="flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Users className="w-5 h-5 text-[#389C9A] mx-auto" />, value: formatNumber(creator.stats.avgViewers), label: "Avg Viewers" },
              { icon: <Eye className="w-5 h-5 text-[#389C9A] mx-auto" />,   value: creator.stats.totalStreams,              label: "Total Streams" },
              { icon: <Star className="w-5 h-5 text-[#FEDB71] mx-auto" />,  value: creator.stats.rating || "—",            label: "Rating" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">{s.icon}</div>
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Packages Section */}
        {creator.packages.length > 0 && (
          <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Campaign Packages</h3>
              <Package className="w-4 h-4 text-[#389C9A]" />
            </div>
            <div className="space-y-4">
              {creator.packages.map((pkg) => (
                <motion.div key={pkg.id} whileHover={{ y: -2 }}
                  className={`relative bg-white border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    pkg.is_default ? "border-[#389C9A] shadow-lg" : "border-[#1D1D1D] hover:border-[#389C9A]"
                  }`}
                  onClick={() => isBusiness && handleSelectPackage(pkg)}>
                  {pkg.is_default && (
                    <div className="absolute -top-3 right-4 bg-[#389C9A] text-white px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest">
                      Popular
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-lg uppercase tracking-tight">{pkg.name}</h4>
                      <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">{pkg.streams} streams</p>
                    </div>
                    <p className="text-xl font-black text-[#389C9A]">₦{pkg.price.toLocaleString()}</p>
                  </div>
                  <p className="text-[9px] text-[#1D1D1D]/60 mb-4">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-widest opacity-40">
                      <Clock className="w-3 h-3" />
                      <span>Est. {(pkg.streams * 1.5).toFixed(1)} hours</span>
                    </div>
                    {isBusiness && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1">
                        Select Package <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 border border-[#389C9A]/30 bg-[#389C9A]/5 p-4 rounded-xl flex gap-3">
              <Info className="w-4 h-4 text-[#389C9A] flex-shrink-0 mt-0.5" />
              <p className="text-[8px] text-[#1D1D1D]/70 leading-relaxed">
                Prices shown are per package. Minimum 4 streams per package. All prices are reviewed by our team.
              </p>
            </div>
          </div>
        )}

        {/* Platforms Detail */}
        {creator.platforms.length > 0 && (
          <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">Connected Platforms</h3>
            <div className="space-y-3">
              {creator.platforms.map((platform, i) => (
                <a key={i} href={platform.url} target="_blank" rel="noopener noreferrer"
                  className="bg-[#F8F8F8] p-4 rounded-xl flex items-center justify-between hover:bg-[#1D1D1D] hover:text-white transition-colors group">
                  <div className="flex items-center gap-3">
                    {getPlatformIconComponent(platform.name)}
                    <div>
                      <p className="font-black text-xs uppercase">{platform.name}</p>
                      {platform.username && (
                        <p className="text-[7px] font-medium opacity-40 group-hover:opacity-60">{platform.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">{formatNumber(platform.followers)}</p>
                    <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTA for Businesses */}
        {isBusiness && (
          <div className="px-6 py-8">
            <div className="bg-gradient-to-r from-[#1D1D1D] to-gray-800 p-8 rounded-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] opacity-20 rounded-full blur-3xl" />
              <h4 className="text-xl font-black uppercase italic mb-2">Ready to collaborate?</h4>
              <p className="text-[9px] opacity-60 mb-6">Send an offer to start working with {creator.name}</p>
              <button onClick={handleCustomOffer}
                className="w-full bg-white text-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] hover:text-white transition-all flex items-center justify-center gap-2">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />

            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] rounded-t-3xl max-h-[90vh] overflow-y-auto">
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-4" />

              <div className="px-6 py-4">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                      {selectedPackage ? selectedPackage.name : "Custom Offer"}
                    </h2>
                    <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">to {creator.name}</p>
                  </div>
                  <button onClick={() => setShowOfferModal(false)}
                    className="p-2 border border-[#1D1D1D]/10 rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSendOffer} className="space-y-4">
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">Campaign Type</label>
                    <select value={customOffer.type} onChange={(e) => setCustomOffer({ ...customOffer, type: e.target.value })}
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl">
                      <option>Banner Only</option>
                      <option>Promo Code</option>
                      <option>Banner + Promo Code</option>
                    </select>
                  </div>

                  {!selectedPackage && (
                    <>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">Number of Streams</label>
                        <input type="number" min="4" max="50" value={customOffer.streams}
                          onChange={(e) => setCustomOffer({ ...customOffer, streams: e.target.value })}
                          className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                          required />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">Rate per Stream (₦)</label>
                        <input type="number" min="1000" step="500" value={customOffer.rate}
                          onChange={(e) => setCustomOffer({ ...customOffer, rate: e.target.value })}
                          className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                          required />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">Personal Message (optional)</label>
                    <textarea value={customOffer.message} onChange={(e) => setCustomOffer({ ...customOffer, message: e.target.value })}
                      rows={3} placeholder="Tell the creator about your campaign..."
                      className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl resize-none" />
                  </div>

                  {estimates && (
                    <div className="bg-[#F8F8F8] p-4 rounded-xl">
                      <h4 className="text-[8px] font-black uppercase tracking-widest mb-3 flex items-center gap-1">
                        <BarChart className="w-3 h-3 text-[#389C9A]" /> Estimated Reach
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-[9px]">
                        <div><p className="opacity-40">Unique Viewers</p><p className="font-black">{estimates.uniqueViewers.toLocaleString()}</p></div>
                        <div><p className="opacity-40">Total Hours</p><p className="font-black">{estimates.hours.toFixed(1)}h</p></div>
                        <div><p className="opacity-40">Impressions</p><p className="font-black">{estimates.impressions.toLocaleString()}</p></div>
                        <div><p className="opacity-40">Total Cost</p><p className="font-black text-[#389C9A]">₦{estimates.totalCost.toLocaleString()}</p></div>
                      </div>
                    </div>
                  )}

                  <button type="submit"
                    className="w-full bg-[#1D1D1D] text-white py-5 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center justify-center gap-2">
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
