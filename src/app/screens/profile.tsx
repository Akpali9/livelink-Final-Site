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
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Users,
  BarChart,
  Star,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  MessageSquare,
  Shield,
  Target,
  Zap,
  Gift,
  Eye,
  ThumbsUp,
  Share2,
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [customOffer, setCustomOffer] = useState({
    streams: "4",
    rate: "",
    type: "Banner Only",
    message: ""
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  // Fetch creator from Supabase
  useEffect(() => {
    const fetchCreator = async () => {
      setLoading(true);
      
      try {
        // Fetch creator profile
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

        // Fetch packages
        const { data: packagesData } = await supabase
          .from("creator_packages")
          .select("*")
          .eq("creator_id", id)
          .order("price", { ascending: true });

        // Format creator data
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
          reviews: [] // Would need separate query for reviews
        };

        setCreator(formattedCreator);

        // Check if current user is a business
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

      // Reset form
      setCustomOffer({
        streams: "4",
        rate: "",
        type: "Banner Only",
        message: ""
      });
      setSelectedPackage(null);

    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast.error("Please login to contact creator");
      navigate("/login/business");
      return;
    }

    // Navigate to messages with this creator
    navigate(`/messages/${creator?.user_id}`);
  };

  const getPlatformIconComponent = (platformName: string) => {
    switch(platformName.toLowerCase()) {
      case 'twitch': return <Twitch className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      default: return <VideoIcon className="w-4 h-4" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

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
          <p className="text-gray-400 text-center mb-8">The creator you're looking for doesn't exist.</p>
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

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Creator Profile" />
      
      <main className="max-w-[480px] mx-auto w-full">
        {/* Profile Header */}
        <div className="bg-white border-b border-[#1D1D1D]">
          <div className="px-6 py-12 flex flex-col items-center text-center">
            
            {/* Avatar with Verified Badge */}
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

            {/* Location & Availability */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold italic">
                <MapPin className="w-3 h-3 text-[#1D1D1D]/40" />
                <span>{creator.location}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 border-2 border-[#1D1D1D] text-[8px] uppercase font-black italic rounded-full">
                <span className={`w-1.5 h-1.5 ${
                  creator.availability.includes("Available") ? "bg-[#389C9A]" : "bg-[#FEDB71]"
                } rounded-full`} />
                {creator.availability}
              </div>
            </div>

            {/* Niches */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {creator.niches.map((n, i) => (
                <span key={i} className="text-[8px] font-black uppercase bg-[#F8F8F8] px-3 py-1.5 rounded-full border border-[#1D1D1D]/10 italic">
                  {n}
                </span>
              ))}
            </div>

            {/* Bio */}
            <div className="w-full max-w-sm mb-6">
              <p className={`text-sm text-[#1D1D1D]/80 leading-relaxed ${!isBioExpanded ? "line-clamp-3" : ""}`}>
                {creator.bio}
              </p>
              {creator.bio?.length > 120 && (
                <button
                  className="mt-2 text-[9px] uppercase text-[#389C9A] font-black hover:underline"
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>

            {/* Action Buttons */}
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
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">
                <Users className="w-5 h-5 text-[#389C9A] mx-auto" />
              </div>
              <p className="text-lg font-black">{formatNumber(creator.stats.followers)}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Followers</p>
            </div>
            <div className="text-center">
              <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">
                <Eye className="w-5 h-5 text-[#389C9A] mx-auto" />
              </div>
              <p className="text-lg font-black">{formatNumber(creator.stats.avgViewers)}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Avg Viewers</p>
            </div>
            <div className="text-center">
              <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">
                <TrendingUp className="w-5 h-5 text-[#389C9A] mx-auto" />
              </div>
              <p className="text-lg font-black">{creator.stats.engagement}%</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Engagement</p>
            </div>
            <div className="text-center">
              <div className="bg-[#F8F8F8] p-3 rounded-xl mb-2">
                <Star className="w-5 h-5 text-[#FEDB71] mx-auto" />
              </div>
              <p className="text-lg font-black">{creator.stats.rating}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Rating</p>
            </div>
          </div>
        </div>

        {/* Packages Section */}
        {creator.packages.length > 0 && (
          <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">Campaign Packages</h3>
            
            <div className="flex flex-col gap-4">
              {creator.packages.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  whileHover={{ y: -2 }}
                  className={`relative bg-white border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    pkg.popular ? 'border-[#389C9A] shadow-lg' : 'border-[#1D1D1D] hover:border-[#389C9A]'
                  }`}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 right-4 bg-[#389C9A] text-white px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest">
                      Popular
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-lg uppercase tracking-tight">{pkg.name}</h4>
                      <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">{pkg.streams} streams</p>
                    </div>
                    <p className="text-xl font-black text-[#389C9A]">£{pkg.price}</p>
                  </div>
                  
                  <p className="text-[9px] text-[#1D1D1D]/60 mb-4">{pkg.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-widest opacity-40">
                      <Calendar className="w-3 h-3" />
                      <span>Est. {pkg.streams * 1.5} hours</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] flex items-center gap-1">
                      Select Package <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Streams */}
        {creator.recentStreams.length > 0 && (
          <div className="px-6 py-8 border-b border-[#1D1D1D]/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">Recent Streams</h3>
            
            <div className="space-y-3">
              {creator.recentStreams.map((stream) => (
                <div key={stream.id} className="bg-[#F8F8F8] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VideoIcon className="w-4 h-4 text-[#389C9A]" />
                    <div>
                      <p className="font-black text-xs uppercase tracking-tight">{stream.title}</p>
                      <p className="text-[7px] font-medium opacity-40">{stream.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black">{stream.viewers.toLocaleString()}</p>
                    <p className="text-[7px] font-medium opacity-40">viewers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
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
                      <option>Custom</option>
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

                  {/* Submit Button */}
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

      {/* Success Toast */}
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