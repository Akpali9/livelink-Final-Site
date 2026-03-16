import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, MessageSquare, Bell, User, Check } from "lucide-react";
import { motion } from "motion/react";

type CampaignType = "banner" | "banner-promo" | "promo-only" | null;

export function CampaignTypeSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<CampaignType>(null);

  const handleContinue = () => {
    if (!selectedType) return;
    
    // Navigate to the appropriate setup screen based on campaign type
    if (selectedType === "banner") {
      navigate("/campaign/setup/banner");
    } else if (selectedType === "banner-promo") {
      navigate("/campaign/setup/banner-promo");
    } else if (selectedType === "promo-only") {
      navigate("/campaign/setup/promo-only");
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
              className="p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
            </button>
            <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
              CREATE CAMPAIGN
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="relative p-1.5">
              <MessageSquare className="w-4.5 h-4.5 text-[#1D1D1D]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-[#389C9A] border-2 border-white rounded-full" />
            </button>
            
            <button className="relative p-1.5">
              <Bell className="w-4.5 h-4.5 text-[#1D1D1D]" />
              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#FEDB71] text-[#1D1D1D] text-[7px] font-black flex items-center justify-center border border-[#1D1D1D]">
                3
              </div>
            </button>
            
            <button className="w-8 h-8 border border-[#1D1D1D] flex items-center justify-center bg-white">
              <User className="w-4 h-4 text-[#1D1D1D]" />
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS SECTION */}
      <div className="mt-14 px-4 py-4">
        <div className="flex items-start gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-11 h-11 border-2 border-[#1D1D1D] flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-[#1D1D1D]" />
          </button>
          
          <div className="flex-1 pt-2">
            <div className="flex gap-1.5 mb-2">
              <div className="h-1.5 flex-1 bg-[#1D1D1D]" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              CAMPAIGN TYPE
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* PAGE HEADING SECTION */}
      <div className="px-4 mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-2">
          CREATE A NEW CAMPAIGN
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1D1D1D]/50 italic leading-tight">
          IT TAKES LESS THAN 10 MINUTES. YOU ONLY GET CHARGED WHEN A CREATOR ACCEPTS.
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* MAIN QUESTION */}
      <div className="px-4 mb-5">
        <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-2">
          HOW WOULD YOU LIKE TO WORK WITH THIS CREATOR?
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
          className={`w-full text-left border-2 rounded-lg transition-all p-4 ${
            selectedType === "banner"
              ? "bg-[#389C9A] border-[#389C9A]"
              : "bg-white border-[#1D1D1D]/20"
          }`}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl flex-shrink-0">📺</div>
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
              <span className="text-[8px] font-black uppercase tracking-wider italic border border-[#1D1D1D] px-2 py-0.5 text-[#1D1D1D] flex-shrink-0">
                AVAILABLE
              </span>
            )}
          </div>
          
          <p className={`text-xs leading-relaxed mb-2.5 ${
            selectedType === "banner" ? "text-white/90" : "text-[#1D1D1D]/70"
          }`}>
            Your branded banner appears on the creator's live stream for every qualifying stream. Streams must be a minimum of 45 minutes. You are billed per every 4 streams completed.
          </p>
          
          <p className={`text-[10px] font-black uppercase tracking-wider italic ${
            selectedType === "banner" ? "text-white" : "text-[#1D1D1D]"
          }`}>
            FROM ₦25 PER 4 STREAMS
          </p>
        </motion.button>

        {/* CARD 2 — BANNER + PROMO CODE */}
        <motion.button
          onClick={() => setSelectedType("banner-promo")}
          className={`w-full text-left rounded-lg transition-all bg-[#1D1D1D] p-4 relative ${
            selectedType === "banner-promo"
              ? "border-[3px] border-[#389C9A]"
              : "border-2 border-[#1D1D1D]"
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {/* Badges in top right corner */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {selectedType === "banner-promo" ? (
              <div className="w-6 h-6 bg-[#389C9A] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <>
                <span className="text-[8px] font-black uppercase tracking-wider italic bg-[#389C9A] px-2 py-0.5 text-white">
                  RECOMMENDED
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider italic border border-white px-2 py-0.5 text-white">
                  AVAILABLE
                </span>
              </>
            )}
          </div>

          <div className="flex items-start gap-3 mb-3 pr-20">
            <div className="text-2xl flex-shrink-0">⭐</div>
            <div className="flex-1">
              <h4 className="text-sm font-black uppercase tracking-tighter italic text-white mb-1">
                BANNER + PROMO CODE
              </h4>
            </div>
          </div>
          
          <p className="text-xs text-white/90 leading-relaxed mb-2.5">
            The most powerful option. Your banner runs on every qualifying stream AND the creator shares your promo code with their audience. Maximum brand exposure combined with direct, trackable sales.
          </p>
          
          <p className="text-[10px] font-black uppercase tracking-wider italic text-white">
            FROM ₦25 PER 4 STREAMS + PROMO CODE
          </p>
        </motion.button>

        {/* CARD 3 — PROMO CODE PROMOTION */}
        <motion.button
          onClick={() => setSelectedType("promo-only")}
          className={`w-full text-left border-2 rounded-lg transition-all p-4 ${
            selectedType === "promo-only"
              ? "bg-[#389C9A] border-[#389C9A]"
              : "bg-white border-[#1D1D1D]/20"
          }`}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl flex-shrink-0">🎟️</div>
            <div className="flex-1">
              <h4 className={`text-sm font-black uppercase tracking-tighter italic mb-1 ${
                selectedType === "promo-only" ? "text-white" : "text-[#1D1D1D]"
              }`}>
                PROMO CODE PROMOTION
              </h4>
            </div>
            {selectedType === "promo-only" ? (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#389C9A]" strokeWidth={3} />
              </div>
            ) : (
              <span className="text-[8px] font-black uppercase tracking-wider italic border border-[#1D1D1D] px-2 py-0.5 text-[#1D1D1D] flex-shrink-0">
                AVAILABLE
              </span>
            )}
          </div>
          
          <p className={`text-xs leading-relaxed mb-2.5 ${
            selectedType === "promo-only" ? "text-white/90" : "text-[#1D1D1D]/70"
          }`}>
            Give the creator an exclusive discount code to share with their live audience. No upfront cost to you — you only pay a small platform fee. Great for driving direct sales and tracking ROI.
          </p>
          
          <p className={`text-[10px] font-black uppercase tracking-wider italic ${
            selectedType === "promo-only" ? "text-white" : "text-[#1D1D1D]"
          }`}>
            ₦5 PLATFORM FEE — YOU CONTROL THE DISCOUNT VALUE
          </p>
        </motion.button>
      </div>

      {/* INFO BOX */}
      <div className="px-4 mb-5">
        <div className="border-2 border-dashed border-[#1D1D1D]/30 rounded-lg p-3.5 bg-[#F8F8F8]">
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
          className={`w-full py-3.5 px-5 flex items-center justify-between transition-all ${
            selectedType
              ? "bg-[#1D1D1D] text-white"
              : "bg-[#1D1D1D]/30 text-[#1D1D1D]/40 cursor-not-allowed"
          }`}
          whileTap={selectedType ? { scale: 0.98 } : {}}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">CONTINUE</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}