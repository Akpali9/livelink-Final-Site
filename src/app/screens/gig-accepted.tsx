import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { 
  Check, 
  Calendar, 
  Video as VideoIcon, 
  Tag, 
  PoundSterling, 
  AlertTriangle, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  Award,
  Sparkles,
  Share2,
  Download,
  Mail
} from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: string;
  description?: string;
  budget?: number;
  streams_required: number;
  streams_completed?: number;
  min_viewers?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  tier?: string;
  campaign_type?: string;
  total_streams?: number;
  total_budget?: number;
  min_stream_duration?: number;
  business?: {
    id: string;
    business_name: string;
    logo_url?: string;
    industry?: string;
    contact_email?: string;
    verified?: boolean;
  };
}

interface CampaignCreator {
  id: string;
  status: string;
  streams_completed: number;
  streams_required: number;
  accepted_at: string;
  campaign: Campaign;
  business: {
    business_name: string;
    logo_url?: string;
  };
}

export function GigAccepted() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatorLink, setCreatorLink] = useState<CampaignCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails();
    }
  }, [campaignId]);

  useEffect(() => {
    // Auto-redirect countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto navigate to campaign details after countdown
      // navigate(`/campaign/${campaignId}`);
    }
  }, [countdown, campaignId, navigate]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    
    try {
      // Fetch campaign details with business info
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            logo_url,
            industry,
            contact_email,
            id_verified
          )
        `)
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;

      setCampaign(campaignData);

      // If user is logged in, fetch their creator link to this campaign
      if (user) {
        const { data: creatorData } = await supabase
          .from("campaign_creators")
          .select(`
            *,
            campaign:campaigns (*),
            business:businesses (business_name, logo_url)
          `)
          .eq("campaign_id", campaignId)
          .eq("creator_id", user.id)
          .single();

        if (creatorData) {
          setCreatorLink(creatorData);
        }
      }

      // Trigger confetti effect
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign details");
    } finally {
      setLoading(false);
    }
  };

  const handleMessageBusiness = () => {
    if (campaign?.business_id) {
      navigate(`/messages/${campaign.business_id}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `I just accepted a campaign with ${campaign?.business?.business_name}!`,
        text: `Check out my new partnership on LiveLink`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownloadContract = async () => {
    try {
      // Generate and download contract (simplified)
      const contractData = {
        campaign: campaign?.name,
        business: campaign?.business?.business_name,
        accepted: new Date().toISOString(),
        terms: "Standard creator agreement",
      };
      
      const blob = new Blob([JSON.stringify(contractData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${campaignId}.json`;
      a.click();
      
      toast.success("Contract downloaded!");
    } catch (error) {
      toast.error("Failed to download contract");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <AppHeader showBack showLogo />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500 italic font-medium">Loading your partnership...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <AppHeader showBack showLogo />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 bg-red-100 flex items-center justify-center mb-6 border-2 border-red-500">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter mb-2 text-center">
            Campaign Not Found
          </h1>
          <p className="text-sm text-[#1D1D1D]/60 mb-8 text-center font-medium italic">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            to="/dashboard" 
            className="bg-[#1D1D1D] text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest italic"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const businessName = campaign.business?.business_name || campaign.name;
  const logoUrl = campaign.business?.logo_url || 'https://via.placeholder.com/100';
  const isVerified = campaign.business?.id_verified || false;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      {/* Confetti Effect (simplified) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0
              }}
              animate={{ 
                y: window.innerHeight + 100,
                rotate: 360
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
              className="absolute w-2 h-2"
              style={{
                backgroundColor: ['#389C9A', '#FEDB71', '#1D1D1D'][Math.floor(Math.random() * 3)]
              }}
            />
          ))}
        </div>
      )}

      <AppHeader showBack showLogo />

      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        {/* Success Icon with Animation */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mt-12 w-24 h-24 bg-[#389C9A] flex items-center justify-center mb-6 border-4 border-[#1D1D1D] shadow-xl"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black italic uppercase tracking-tighter mb-2 text-center"
        >
          Gig Accepted!
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-[#1D1D1D]/60 mb-12 text-center font-medium italic"
        >
          You're now partnered with <span className="font-black text-[#389C9A]">{businessName}</span>
        </motion.p>

        {/* Campaign Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 mb-8 rounded-xl shadow-lg"
        >
          {/* Brand Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#1D1D1D] bg-white">
              <ImageWithFallback 
                src={logoUrl} 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" 
                alt={businessName}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-lg uppercase italic tracking-tight">
                  {businessName}
                </h3>
                {isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />
                )}
              </div>
              <p className="text-[10px] font-medium opacity-40 uppercase tracking-widest">
                {campaign.industry || campaign.type}
              </p>
            </div>
            {isVerified && (
              <div className="bg-[#389C9A]/10 px-3 py-1 rounded-full">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#389C9A]">
                  Verified
                </span>
              </div>
            )}
          </div>

          {/* Campaign Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 border border-[#1D1D1D]/10 rounded-lg">
              <Calendar className="w-4 h-4 text-[#389C9A] mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Start Date</p>
              <p className="text-xs font-black">
                {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Soon'}
              </p>
            </div>
            <div className="bg-white p-4 border border-[#1D1D1D]/10 rounded-lg">
              <Clock className="w-4 h-4 text-[#389C9A] mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Duration</p>
              <p className="text-xs font-black">
                {campaign.streams_required || 4} Streams
              </p>
            </div>
            <div className="bg-white p-4 border border-[#1D1D1D]/10 rounded-lg">
              <Tag className="w-4 h-4 text-[#389C9A] mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Type</p>
              <p className="text-xs font-black uppercase">
                {campaign.type || 'Promo'}
              </p>
            </div>
            <div className="bg-white p-4 border border-[#1D1D1D]/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-[#389C9A] mb-2" />
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Budget</p>
              <p className="text-xs font-black text-[#389C9A]">
                ₦{campaign.budget || 0}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {campaign.min_viewers && campaign.min_viewers > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-[#1D1D1D] rounded-lg">
              <Users className="w-4 h-4 text-[#FEDB71]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white flex-1">
                Minimum {campaign.min_viewers} concurrent viewers required
              </span>
            </div>
          )}

          {/* Warning */}
          {campaign.min_stream_duration && (
            <div className="flex items-center gap-2 text-[#FEDB71] bg-[#1D1D1D] p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {campaign.min_stream_duration} minutes minimum stream duration required
              </span>
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-6 pt-6 border-t border-[#1D1D1D]/10">
            <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-[#389C9A]" />
              Next Steps
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px]">Review campaign guidelines</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px]">Prepare your streaming setup</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px]">Connect with the brand</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full grid grid-cols-3 gap-3 mb-8"
        >
          <div className="text-center">
            <div className="bg-[#F8F8F8] p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#389C9A] mx-auto mb-1" />
              <p className="text-lg font-black">{campaign.streams_required || 4}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Streams</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-[#F8F8F8] p-3 rounded-lg">
              <Award className="w-5 h-5 text-[#FEDB71] mx-auto mb-1" />
              <p className="text-lg font-black">₦{campaign.budget || 0}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Earnings</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-[#F8F8F8] p-3 rounded-lg">
              <Gift className="w-5 h-5 text-[#389C9A] mx-auto mb-1" />
              <p className="text-lg font-black">1</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Perks</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bottom Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="px-6 pb-12 flex flex-col gap-3 max-w-md mx-auto w-full"
      >
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate(`/campaign/${campaign.id}`)}
            className="py-5 bg-white border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-[#F8F8F8] transition-all rounded-xl"
          >
            View Details <ArrowRight className="w-3.5 h-3.5 text-[#FEDB71]" />
          </button>

          <button 
            onClick={handleMessageBusiness}
            className="py-5 bg-[#1D1D1D] text-white font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-[#389C9A] transition-all rounded-xl"
          >
            <MessageCircle className="w-4 h-4 text-[#FEDB71]" /> Message
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleShare}
            className="py-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] text-[8px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-[#389C9A]" /> Share
          </button>

          <button 
            onClick={handleDownloadContract}
            className="py-4 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] text-[8px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#389C9A]" /> Contract
          </button>
        </div>

        <Link 
          to="/dashboard" 
          className="block text-center text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] underline transition-colors italic mt-4"
        >
          Back to Dashboard ({countdown}s)
        </Link>
      </motion.div>
    </div>
  );
}