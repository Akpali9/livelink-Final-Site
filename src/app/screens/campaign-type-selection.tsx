import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  ArrowRight, 
  MessageSquare, 
  Bell, 
  User, 
  Check,
  Info,
  Sparkles,
  TrendingUp,
  DollarSign,
  Percent,
  Award,
  HelpCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

type CampaignType = "banner" | "banner-promo" | "promo-only" | null;

interface CampaignPricing {
  banner: {
    basePrice: number;
    perStream: number;
    minStreams: number;
    description: string;
  };
  bannerPromo: {
    basePrice: number;
    perStream: number;
    minStreams: number;
    description: string;
  };
  promoOnly: {
    platformFee: number;
    description: string;
  };
}

export function CampaignTypeSelection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<CampaignType>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Pricing information
  const pricing: CampaignPricing = {
    banner: {
      basePrice: 25,
      perStream: 6.25,
      minStreams: 4,
      description: "Your branded banner appears on the creator's live stream"
    },
    bannerPromo: {
      basePrice: 35,
      perStream: 8.75,
      minStreams: 4,
      description: "Banner + Promo code combination for maximum exposure"
    },
    promoOnly: {
      platformFee: 5,
      description: "You control the discount value, only pay platform fee"
    }
  };

  // Fetch business profile and unread counts
  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
      fetchUnreadCounts();
    }
  }, [user]);

  const fetchBusinessProfile = async () => {
    try {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      setBusinessProfile(data);
    } catch (error) {
      console.error("Error fetching business profile:", error);
    }
  };

  const fetchUnreadCounts = async () => {
    if (!user) return;

    // Get unread notifications
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotifications(notifCount || 0);

    // Get unread messages
    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    setUnreadMessages(msgCount || 0);
  };

  const handleContinue = () => {
    if (!selectedType) {
      toast.error("Please select a campaign type to continue");
      return;
    }
    
    // Check if business profile is complete
    if (!businessProfile || businessProfile.application_status !== 'approved') {
      toast.error("Your business profile must be approved before creating campaigns");
      navigate("/business/profile");
      return;
    }

    // Navigate to the appropriate setup screen based on campaign type
    if (selectedType === "banner") {
      navigate("/campaign/setup/banner");
    } else if (selectedType === "banner-promo") {
      navigate("/campaign/setup/banner-promo");
    } else if (selectedType === "promo-only") {
      navigate("/campaign/setup/promo-only");
    }
  };

  const getCampaignTypeDetails = (type: CampaignType) => {
    switch(type) {
      case "banner":
        return {
          icon: "📺",
          title: "BANNER ADVERTISING",
          price: `₦${pricing.banner.basePrice} PER ${pricing.banner.minStreams} STREAMS`,
          color: "bg-[#389C9A]",
          lightColor: "bg-[#389C9A]/10",
          borderColor: "border-[#389C9A]"
        };
      case "banner-promo":
        return {
          icon: "⭐",
          title: "BANNER + PROMO CODE",
          price: `₦${pricing.bannerPromo.basePrice} PER ${pricing.bannerPromo.minStreams} STREAMS`,
          color: "bg-[#1D1D1D]",
          lightColor: "bg-[#1D1D1D]/10",
          borderColor: "border-[#1D1D1D]"
        };
      case "promo-only":
        return {
          icon: "🎟️",
          title: "PROMO CODE PROMOTION",
          price: `₦${pricing.promoOnly.platformFee} PLATFORM FEE`,
          color: "bg-[#FEDB71]",
          lightColor: "bg-[#FEDB71]/10",
          borderColor: "border-[#FEDB71]"
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      {/* TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="p-1 -ml-1 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
            </button>
            <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
              CREATE CAMPAIGN
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/messages")}
              className="relative p-1.5 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4.5 h-4.5 text-[#1D1D1D]" />
              {unreadMessages > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-[#389C9A] border-2 border-white rounded-full" />
              )}
            </button>
            
            <button 
              onClick={() => navigate("/notifications")}
              className="relative p-1.5 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
            >
              <Bell className="w-4.5 h-4.5 text-[#1D1D1D]" />
              {unreadNotifications > 0 && (
                <div className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] bg-[#FEDB71] text-[#1D1D1D] text-[7px] font-black flex items-center justify-center border border-[#1D1D1D]">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </div>
              )}
            </button>
            
            <button 
              onClick={() => navigate("/business/profile")}
              className="w-8 h-8 border border-[#1D1D1D] flex items-center justify-center bg-white hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS SECTION */}
      <div className="mt-14 px-4 py-4">
        <div className="flex items-start gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-11 h-11 border-2 border-[#1D1D1D] flex items-center justify-center flex-shrink-0 hover:bg-[#1D1D1D] hover:text-white transition-colors rounded-lg"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          
          <div className="flex-1 pt-2">
            <div className="flex gap-1.5 mb-2">
              <div className="h-1.5 flex-1 bg-[#1D1D1D] rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D] rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              STEP 2 OF 5: CAMPAIGN TYPE
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* PAGE HEADING SECTION */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            CREATE A NEW CAMPAIGN
          </h2>
          <button
            onClick={() => setShowPricingModal(true)}
            className="p-2 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-[#389C9A]" />
          </button>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1D1D1D]/50 italic leading-tight">
          IT TAKES LESS THAN 10 MINUTES. YOU ONLY GET CHARGED WHEN A CREATOR ACCEPTS.
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* MAIN QUESTION */}
      <div className="px-4 mb-5">
        <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-2">
          HOW WOULD YOU LIKE TO WORK WITH CREATORS?
        </h3>
        <p className="text-xs text-[#1D1D1D]/70 leading-relaxed">
          Choose the option that works best for your business. You can always change this later.
        </p>
      </div>

      {/* THREE CAMPAIGN TYPE CARDS */}
      <div className="px-4 space-y-3 mb-5">
        {/* CARD 1 — BANNER ADVERTISING */}
        <motion.button
          onClick={() => setSelectedType("banner")}
          className={`w-full text-left border-2 rounded-xl transition-all p-4 ${
            selectedType === "banner"
              ? "bg-[#389C9A] border-[#389C9A] shadow-lg"
              : "bg-white border-[#1D1D1D]/10 hover:border-[#389C9A] hover:shadow-md"
          }`}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className={`text-2xl flex-shrink-0 ${selectedType === "banner" ? "text-white" : ""}`}>📺</div>
            <div className="flex-1">
              <h4 className={`text-sm font-black uppercase tracking-tighter italic mb-1 ${
                selectedType === "banner" ? "text-white" : "text-[#1D1D1D]"
              }`}>
                BANNER ADVERTISING
              </h4>
            </div>
            {selectedType === "banner" ? (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#389C9A]" strokeWidth={3} />
              </div>
            ) : (
              <span className="text-[8px] font-black uppercase tracking-wider italic border border-[#389C9A] px-2 py-0.5 text-[#389C9A] flex-shrink-0 rounded-full">
                SELECT
              </span>
            )}
          </div>
          
          <p className={`text-xs leading-relaxed mb-2.5 ${
            selectedType === "banner" ? "text-white/90" : "text-[#1D1D1D]/70"
          }`}>
            {pricing.banner.description}. Streams must be a minimum of 45 minutes. You are billed per every 4 streams completed.
          </p>
          
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-wider italic ${
              selectedType === "banner" ? "text-white" : "text-[#1D1D1D]"
            }`}>
              FROM ₦{pricing.banner.basePrice} PER {pricing.banner.minStreams} STREAMS
            </p>
            <TrendingUp className={`w-4 h-4 ${
              selectedType === "banner" ? "text-white" : "text-[#389C9A]"
            }`} />
          </div>
        </motion.button>

        {/* CARD 2 — BANNER + PROMO CODE */}
        <motion.button
          onClick={() => setSelectedType("banner-promo")}
          className={`w-full text-left rounded-xl transition-all bg-[#1D1D1D] p-4 relative overflow-hidden ${
            selectedType === "banner-promo"
              ? "border-[3px] border-[#389C9A] shadow-lg"
              : "border-2 border-[#1D1D1D] hover:shadow-md"
          }`}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#389C9A] rounded-full blur-3xl" />
          </div>

          {/* Badges in top right corner */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
            {selectedType === "banner-promo" ? (
              <div className="w-6 h-6 bg-[#389C9A] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <>
                <span className="text-[8px] font-black uppercase tracking-wider italic bg-[#389C9A] px-2 py-0.5 text-white rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> RECOMMENDED
                </span>
              </>
            )}
          </div>

          <div className="flex items-start gap-3 mb-3 pr-20">
            <div className="text-2xl flex-shrink-0 text-white">⭐</div>
            <div className="flex-1">
              <h4 className="text-sm font-black uppercase tracking-tighter italic text-white mb-1">
                BANNER + PROMO CODE
              </h4>
            </div>
          </div>
          
          <p className="text-xs text-white/90 leading-relaxed mb-2.5 pr-12">
            {pricing.bannerPromo.description}. Maximum brand exposure combined with direct, trackable sales.
          </p>
          
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider italic text-white">
              FROM ₦{pricing.bannerPromo.basePrice} PER {pricing.bannerPromo.minStreams} STREAMS
            </p>
            <Award className="w-4 h-4 text-[#FEDB71]" />
          </div>
        </motion.button>

        {/* CARD 3 — PROMO CODE PROMOTION */}
        <motion.button
          onClick={() => setSelectedType("promo-only")}
          className={`w-full text-left border-2 rounded-xl transition-all p-4 ${
            selectedType === "promo-only"
              ? "bg-[#FEDB71] border-[#FEDB71] shadow-lg"
              : "bg-white border-[#1D1D1D]/10 hover:border-[#FEDB71] hover:shadow-md"
          }`}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className={`text-2xl flex-shrink-0 ${selectedType === "promo-only" ? "text-[#1D1D1D]" : ""}`}>🎟️</div>
            <div className="flex-1">
              <h4 className={`text-sm font-black uppercase tracking-tighter italic mb-1 ${
                selectedType === "promo-only" ? "text-[#1D1D1D]" : "text-[#1D1D1D]"
              }`}>
                PROMO CODE PROMOTION
              </h4>
            </div>
            {selectedType === "promo-only" ? (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#FEDB71]" strokeWidth={3} />
              </div>
            ) : (
              <span className="text-[8px] font-black uppercase tracking-wider italic border border-[#FEDB71] px-2 py-0.5 text-[#FEDB71] flex-shrink-0 rounded-full">
                SELECT
              </span>
            )}
          </div>
          
          <p className={`text-xs leading-relaxed mb-2.5 ${
            selectedType === "promo-only" ? "text-[#1D1D1D]/80" : "text-[#1D1D1D]/70"
          }`}>
            {pricing.promoOnly.description}. No upfront cost to you — you only pay a small platform fee. Great for driving direct sales and tracking ROI.
          </p>
          
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-wider italic ${
              selectedType === "promo-only" ? "text-[#1D1D1D]" : "text-[#1D1D1D]"
            }`}>
              ₦{pricing.promoOnly.platformFee} PLATFORM FEE
            </p>
            <Percent className={`w-4 h-4 ${
              selectedType === "promo-only" ? "text-[#1D1D1D]" : "text-[#FEDB71]"
            }`} />
          </div>
        </motion.button>
      </div>

      {/* INFO BOX */}
      <div className="px-4 mb-5">
        <div className="border-2 border-dashed border-[#1D1D1D]/30 rounded-xl p-3.5 bg-[#F8F8F8] flex items-start gap-3">
          <Info className="w-5 h-5 text-[#389C9A] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#1D1D1D]/70 leading-relaxed">
            Not sure which to choose? Most businesses see the best results with the combined option. You can speak to our team before committing.
          </p>
        </div>
      </div>

      {/* CONTINUE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        <motion.button
          onClick={handleContinue}
          disabled={!selectedType}
          className={`w-full py-4 px-5 flex items-center justify-between transition-all rounded-xl ${
            selectedType
              ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
              : "bg-[#1D1D1D]/30 text-[#1D1D1D]/40 cursor-not-allowed"
          }`}
          whileTap={selectedType ? { scale: 0.98 } : {}}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">
            {selectedType ? `CONTINUE WITH ${selectedType === "banner" ? "BANNER" : selectedType === "banner-promo" ? "BANNER + PROMO" : "PROMO ONLY"}` : "SELECT A CAMPAIGN TYPE"}
          </span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowPricingModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-4 border-[#1D1D1D] z-50 rounded-t-xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Pricing Breakdown</h3>
                <button
                  onClick={() => setShowPricingModal(false)}
                  className="p-2 hover:bg-[#1D1D1D]/5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Banner */}
                <div className="p-4 bg-[#389C9A]/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#389C9A] rounded-full flex items-center justify-center text-white text-xs">📺</div>
                    <h4 className="font-black uppercase text-sm">Banner Advertising</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Base price:</div>
                    <div className="font-black">₦{pricing.banner.basePrice}</div>
                    <div>Per stream:</div>
                    <div className="font-black">₦{pricing.banner.perStream}</div>
                    <div>Min streams:</div>
                    <div className="font-black">{pricing.banner.minStreams}</div>
                  </div>
                </div>

                {/* Banner + Promo */}
                <div className="p-4 bg-[#1D1D1D]/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#1D1D1D] rounded-full flex items-center justify-center text-white text-xs">⭐</div>
                    <h4 className="font-black uppercase text-sm">Banner + Promo</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Base price:</div>
                    <div className="font-black">₦{pricing.bannerPromo.basePrice}</div>
                    <div>Per stream:</div>
                    <div className="font-black">₦{pricing.bannerPromo.perStream}</div>
                    <div>Min streams:</div>
                    <div className="font-black">{pricing.bannerPromo.minStreams}</div>
                  </div>
                </div>

                {/* Promo Only */}
                <div className="p-4 bg-[#FEDB71]/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#FEDB71] rounded-full flex items-center justify-center text-[#1D1D1D] text-xs">🎟️</div>
                    <h4 className="font-black uppercase text-sm">Promo Only</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Platform fee:</div>
                    <div className="font-black">₦{pricing.promoOnly.platformFee}</div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  * You only get charged when a creator accepts and completes the campaign requirements.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}