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
  ArrowRight,
  Users,
  BarChart,
  Star,
  Calendar,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Target,
  Zap,
  Eye,
  AlertCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Creator {
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
    peakViewers: number;
    followers: number;
    totalStreams: number;
    engagement: number;
    rating: number;
    reviews: number;
  };
  platforms: {
    name: string;
    icon: any;
    followers: number;
    url: string;
  }[];
  packages: {
    id: string;
    name: string;
    streams: number;
    price: number;
    description: string;
    popular?: boolean;
  }[];
  recentStreams: {
    id: string;
    title: string;
    date: string;
    viewers: number;
    duration: string;
  }[];
  reviews: {
    id: string;
    business: string;
    rating: number;
    comment: string;
    date: string;
  }[];
}

interface Package {
  id: string;
  name: string;
  streams: number;
  price: number;
  description: string;
  popular?: boolean;
}

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [offerSent, setOfferSent] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [customOffer, setCustomOffer] = useState({
    streams: "4",
    rate: "",
    type: "Banner Only",
    message: ""
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    const fetchCreator = async () => {
      setLoading(true);
      try {
        const { data: creatorData, error: creatorError } = await supabase
          .from("creator_profiles")
          .select(`
            *,
            platforms:creator_platforms(*),
            stats:creator_stats(*),
            recent_streams:stream_updates(
              id,
              stream_number,
              stream_date,
              duration,
              viewer_count
            )
          `)
          .eq("id", id)
          .single();

        if (creatorError) throw creatorError;

        const { data: packagesData } = await supabase
          .from("creator_packages")
          .select("*")
          .eq("creator_id", id)
          .order("price", { ascending: true });

        const formattedCreator: Creator = {
          id: creatorData.id,
          user_id: creatorData.user_id,
          name: creatorData.full_name,
          username: creatorData.username || `@${creatorData.full_name.toLowerCase().replace(/\s/g, '')}`,
          avatar: creatorData.avatar_url || 'https://via.placeholder.com/200',
          bio: creatorData.bio || 'Live streamer and content creator passionate about engaging with audiences.',
          location: creatorData.location || 'Remote',
          verified: creatorData.verified || false,
          availability: creatorData.availability || 'Available for campaigns',
          niches: creatorData.niches || ['Gaming', 'Entertainment'],
          stats: {
            avgViewers: creatorData.avg_concurrent || 250,
            peakViewers: creatorData.peak_viewers || 500,
            followers: creatorData.followers || 15000,
            totalStreams: creatorData.total_streams || 120,
            engagement: creatorData.engagement_rate || 8.5,
            rating: creatorData.rating || 4.8,
            reviews: creatorData.review_count || 24
          },
          platforms: creatorData.platforms?.map((p: any) => ({
            name: p.platform_type,
            icon: getPlatformIcon(p.platform_type),
            followers: p.followers_count || 0,
            url: p.profile_url || '#'
          })) || [],
          packages: packagesData || [],
          recentStreams: creatorData.recent_streams?.slice(0, 5).map((s: any) => ({
            id: s.id,
            title: `Stream #${s.stream_number}`,
            date: new Date(s.stream_date).toLocaleDateString(),
            viewers: s.viewer_count || 0,
            duration: s.duration || '45 min'
          })) || [],
          reviews: []
        };

        setCreator(formattedCreator);

        if (user) {
          const { data: business } = await supabase
            .from("businesses")
            .select("*")
            .eq("user_id", user.id)
            .single();

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

    if (id) fetchCreator();
  }, [id, user]);

  const getPlatformIcon = (platform: string) => {
    switch(platform.toLowerCase()) {
      case 'twitch': return Twitch;
      case 'youtube': return Youtube;
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      default: return VideoIcon;
    }
  };

  const getPlatformIconComponent = (platformName: string) => {
    switch(platformName.toLowerCase()) {
      case 'twitch': return <Twitch className="w-3.5 h-3.5" />;
      case 'youtube': return <Youtube className="w-3.5 h-3.5" />;
      case 'instagram': return <Instagram className="w-3.5 h-3.5" />;
      case 'facebook': return <Facebook className="w-3.5 h-3.5" />;
      default: return <VideoIcon className="w-3.5 h-3.5" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setCustomOffer({
      streams: pkg.streams.toString(),
      rate: pkg.price.toString(),
      type: "Banner Only",
      message: ""
    });
    setShowOfferModal(true);
  };

  const handleCustomOffer = () => {
    setSelectedPackage(null);
    setShowOfferModal(true);
  };

  const handleContact = async () => {
    if (!user) {
      toast.error("Please login to contact creator");
      navigate("/login/business");
      return;
    }
    navigate(`/messages/${creator?.user_id}`);
  };

  const getEstimates = (streams: number, rate: number) => {
    if (!creator) return null;
    const avgViewers = creator.stats.avgViewers;
    return {
      uniqueViewers: Math.round(avgViewers * 0.4 * streams + 500),
      hours: streams * 1.5,
      impressions: Math.round(avgViewers * 1.4 * streams),
      totalCost: streams * rate
    };
  };

  const estimates = selectedPackage
    ? getEstimates(selectedPackage.streams, selectedPackage.price)
    : customOffer.streams && customOffer.rate
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
    try {
      const { error } = await supabase
        .from("offers")
        .insert({
          business_id: businessProfile.id,
          creator_id: id,
          streams: parseInt(customOffer.streams),
          amount: parseFloat(customOffer.rate) * parseInt(customOffer.streams),
          rate: parseFloat(customOffer.rate),
          campaign_type: customOffer.type,
          message: customOffer.message,
          status: "pending",
          created_at: new Date().toISOString()
        });
      if (error) throw error;
      setOfferSent(true);
      setShowOfferModal(false);
      toast.success("Offer sent successfully!");
      setCustomOffer({ streams: "4", rate: "", type: "Banner Only", message: "" });
      setSelectedPackage(null);
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Loading profile...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!creator) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Creator Profile" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertCircle className="w-12 h-12 text-[#1D1D1D]/20 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Not Found</h2>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest text-center mb-8">
            This creator doesn't exist
          </p>
          <button
            onClick={() => navigate("/browse")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest"
          >
            Browse Creators
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Creator Profile" />

      <main className="max-w-[480px] mx-auto w-full">

        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <div className="border-b-2 border-[#1D1D1D]">
          <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">

            {/* Avatar */}
            <div className="relative mb-5">
              <div className="w-28 h-28 border-2 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">
                <ImageWithFallback
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {creator.verified && (
                <div className="absolute -bottom-1 -right-1 bg-[#389C9A] p-1 border-2 border-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">
              {creator.name}
            </h1>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 mb-4">
              {creator.username}
            </span>

            {/* Availability pill */}
            <div className="flex items-center gap-2 border-2 border-[#1D1D1D] px-3 py-1.5 mb-4">
              <span className={`w-1.5 h-1.5 ${
                creator.availability.includes("Available") ? "bg-[#389C9A]" : "bg-[#FEDB71]"
              }`} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {creator.availability}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 mb-4 text-[9px] font-black uppercase tracking-widest opacity-40">
              <MapPin className="w-3 h-3" />
              <span>{creator.location}</span>
            </div>

            {/* Platform badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {creator.platforms.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-[#1D1D1D]/20 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors"
                >
                  {getPlatformIconComponent(p.name)}
                  {p.name}
                  <span className="opacity-40 font-medium">{formatNumber(p.followers)}</span>
                </a>
              ))}
            </div>

            {/* Niches */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-5">
              {creator.niches.map((n, i) => (
                <span
                  key={i}
                  className="text-[8px] font-black uppercase tracking-widest bg-[#F8F8F8] border border-[#1D1D1D]/10 px-3 py-1"
                >
                  {n}
                </span>
              ))}
            </div>

            {/* Bio */}
            <div className="w-full mb-6 text-left">
              <p className={`text-[11px] text-[#1D1D1D]/70 leading-relaxed ${!isBioExpanded ? "line-clamp-3" : ""}`}>
                {creator.bio}
              </p>
              {creator.bio?.length > 120 && (
                <button
                  className="mt-1 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={handleCustomOffer}
                className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-[#FEDB71]" /> Send Offer
              </button>
              <button
                onClick={handleContact}
                className="flex-1 border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 border-b-2 border-[#1D1D1D]">
          {[
            { icon: <Users className="w-4 h-4 text-[#389C9A]" />, value: formatNumber(creator.stats.followers), label: "Followers" },
            { icon: <Eye className="w-4 h-4 text-[#389C9A]" />, value: formatNumber(creator.stats.avgViewers), label: "Avg Viewers" },
            { icon: <TrendingUp className="w-4 h-4 text-[#389C9A]" />, value: `${creator.stats.engagement}%`, label: "Engagement" },
            { icon: <Star className="w-4 h-4 text-[#FEDB71]" />, value: creator.stats.rating, label: "Rating" },
          ].map((stat, i) => (
            <div
              key={i}
              className={`flex flex-col items-center py-5 px-2 gap-2 ${i < 3 ? "border-r border-[#1D1D1D]/10" : ""}`}
            >
              {stat.icon}
              <p className="text-base font-black leading-none">{stat.value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40 text-center">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Packages ───────────────────────────────────────────────────── */}
        {creator.packages.length > 0 && (
          <div className="px-5 py-7 border-b-2 border-[#1D1D1D]">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5">Campaign Packages</h3>
            <div className="flex flex-col gap-3">
              {creator.packages.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`relative border-2 p-5 cursor-pointer transition-colors ${
                    pkg.popular
                      ? "border-[#389C9A] bg-[#389C9A]/5"
                      : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-[10px] right-4 bg-[#FEDB71] border border-[#1D1D1D] px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-[#1D1D1D]">
                      Popular
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">{pkg.name}</h4>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{pkg.streams} streams</p>
                    </div>
                    <p className="text-xl font-black text-[#389C9A]">£{pkg.price}</p>
                  </div>
                  <p className="text-[9px] opacity-60 mb-3">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest opacity-40">
                      <Calendar className="w-3 h-3" />
                      Est. {pkg.streams * 1.5}h
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1">
                      Select <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Streams ─────────────────────────────────────────────── */}
        {creator.recentStreams.length > 0 && (
          <div className="px-5 py-7 border-b-2 border-[#1D1D1D]">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] mb-5">Recent Streams</h3>
            <div className="flex flex-col">
              {creator.recentStreams.map((stream, i) => (
                <div
                  key={stream.id}
                  className={`flex items-center justify-between py-3.5 ${
                    i < creator.recentStreams.length - 1 ? "border-b border-[#1D1D1D]/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F8F8F8] border border-[#1D1D1D]/10 flex items-center justify-center flex-shrink-0">
                      <VideoIcon className="w-3.5 h-3.5 text-[#389C9A]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight">{stream.title}</p>
                      <p className="text-[8px] opacity-40 font-medium">{stream.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black">{stream.viewers.toLocaleString()}</p>
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-40">viewers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA Banner ─────────────────────────────────────────────────── */}
        <div className="px-5 py-7">
          <div className="bg-[#1D1D1D] p-7 relative overflow-hidden">
            {/* Accent stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-[#389C9A]" />
            <div className="absolute top-0 right-0 w-16 h-full bg-[#FEDB71]/5" />

            <h4 className="text-xl font-black uppercase italic tracking-tighter text-white mb-1">
              Ready to collaborate?
            </h4>
            <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-6">
              Send an offer to {creator.name}
            </p>
            <button
              onClick={handleCustomOffer}
              className="w-full bg-white text-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              Send Offer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* ── Offer Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOfferModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="absolute inset-0 bg-[#1D1D1D]/80"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-[480px] bg-white border-t-2 border-[#1D1D1D] max-h-[92vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-[#1D1D1D]/10 mx-auto mt-4 mb-2" />

              <div className="px-5 py-4">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6 border-b-2 border-[#1D1D1D] pb-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Send Offer</h2>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">to {creator.name}</p>
                  </div>
                  <button
                    onClick={() => setShowOfferModal(false)}
                    className="p-2 border-2 border-[#1D1D1D]/10 hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSendOffer} className="space-y-4">
                  {/* Campaign Type */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                      Campaign Type
                    </label>
                    <select
                      value={customOffer.type}
                      onChange={(e) => setCustomOffer({ ...customOffer, type: e.target.value })}
                      className="w-full p-3.5 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none transition-colors text-[11px] font-black uppercase tracking-widest bg-white appearance-none"
                    >
                      <option>Banner Only</option>
                      <option>Promo Code</option>
                      <option>Banner + Promo Code</option>
                      <option>Custom</option>
                    </select>
                  </div>

                  {/* Streams + Rate side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                        No. of Streams
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={customOffer.streams}
                        onChange={(e) => setCustomOffer({ ...customOffer, streams: e.target.value })}
                        className="w-full p-3.5 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none transition-colors text-sm font-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                        Rate / Stream (£)
                      </label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={customOffer.rate}
                        onChange={(e) => setCustomOffer({ ...customOffer, rate: e.target.value })}
                        className="w-full p-3.5 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none transition-colors text-sm font-black"
                        required
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                      Message (optional)
                    </label>
                    <textarea
                      value={customOffer.message}
                      onChange={(e) => setCustomOffer({ ...customOffer, message: e.target.value })}
                      rows={3}
                      placeholder="Tell the creator about your campaign..."
                      className="w-full p-3.5 border-2 border-[#1D1D1D]/20 focus:border-[#389C9A] outline-none transition-colors text-[11px] resize-none"
                    />
                  </div>

                  {/* Estimates */}
                  {estimates && (
                    <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4">
                      <h4 className="text-[8px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <BarChart className="w-3 h-3 text-[#389C9A]" />
                        Estimated Reach
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Unique Viewers", value: estimates.uniqueViewers.toLocaleString() },
                          { label: "Total Hours", value: `${estimates.hours.toFixed(1)}h` },
                          { label: "Impressions", value: estimates.impressions.toLocaleString() },
                          { label: "Total Cost", value: `£${estimates.totalCost}`, highlight: true },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-[7px] font-black uppercase tracking-widest opacity-40">{item.label}</p>
                            <p className={`text-[11px] font-black ${item.highlight ? "text-[#389C9A]" : ""}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                  >
                    Send Offer <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Success Banner ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {offerSent && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-0 right-0 flex justify-center z-50 pointer-events-none px-5"
          >
            <div className="bg-[#389C9A] text-white px-6 py-4 border-2 border-[#1D1D1D] flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Offer Sent Successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
