import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, MessageSquare, Bell, User, Plus, Minus, Info } from "lucide-react";
import { motion } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
type CampaignGoal = "awareness" | "traffic" | "product" | "event" | "general" | null;
type OfferDuration = "3" | "7" | "14" | "30" | "indefinite" | null;
type StreamDeadline = "1" | "2" | "3" | "4" | null;

export function CampaignSetupBanner() {
  const navigate = useNavigate();
  
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>(null);
  const [bidAmount, setBidAmount] = useState("25");
  const [offerDuration, setOfferDuration] = useState<OfferDuration>(null);
  const [streamDeadline, setStreamDeadline] = useState<StreamDeadline>(null);
  const [creatorCount, setCreatorCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const estimatedStreams = creatorCount * 4;
  const estimatedBilling = creatorCount * (parseInt(bidAmount) || 0);

  const getAverageViewers = (bid: number) => {
    if (bid >= 5 && bid <= 20) return 175;
    if (bid >= 15 && bid <= 30) return 325;
    if (bid >= 30 && bid <= 50) return 500;
    if (bid >= 50 && bid <= 80) return 800;
    if (bid >= 80) return 1000;
    return 175;
  };

  const bidValue = parseInt(bidAmount) || 0;
  const avgViewers = getAverageViewers(bidValue);
  const totalViewers = creatorCount * avgViewers;
  const totalImpressions = totalViewers * estimatedStreams;
  const serviceFee = Math.round(estimatedBilling * 0.08);
  const totalHeld = estimatedBilling + serviceFee;

  // SAVE CAMPAIGN TO SUPABASE
  const handleContinue = async () => {
    if (!campaignName || !campaignGoal || !offerDuration || !streamDeadline) {
      setError("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("campaigns") // your table name
      .insert([
        {
          name: campaignName,
          type: "banner",
          goal: campaignGoal,
          bid_amount: bidValue,
          offer_duration: offerDuration,
          stream_deadline: streamDeadline,
          creator_count: creatorCount,
          estimated_streams: estimatedStreams,
          estimated_billing: estimatedBilling,
          total_viewers: totalViewers,
          total_impressions: totalImpressions,
          service_fee: serviceFee,
          total_held: totalHeld,
        },
      ]);

    setLoading(false);

    if (supabaseError) {
      console.error("Supabase error:", supabaseError);
      setError("Failed to save campaign. Please try again.");
      return;
    }

    // Navigate to the next step
    navigate("/campaign/create", { 
      state: { campaignId: data[0].id } 
    });
  };

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      {/* TOP NAV */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
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

      {/* PROGRESS BAR */}
      <div className="mt-14 px-4 py-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="w-11 h-11 border-2 border-[#1D1D1D] flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4.5 h-4.5 text-[#1D1D1D]" />
          </button>
          <div className="flex-1 pt-2">
            <div className="flex gap-1.5 mb-2">
              <div className="h-1.5 flex-1 bg-[#1D1D1D]" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              CAMPAIGN DETAILS
            </p>
          </div>
        </div>
      </div>

      {/* FORM FIELDS */}
      <div className="px-4 space-y-6 mb-6">
        {error && <p className="text-red-500 text-sm italic">{error}</p>}
        {/* ... all other fields from your current component ... */}
        {/* For brevity, include all inputs, buttons, and live estimate card here */}
      </div>

      {/* CONTINUE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        <motion.button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-3.5 px-5 bg-[#1D1D1D] text-white flex items-center justify-between disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">
            {loading ? "SAVING..." : "CONTINUE"}
          </span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}