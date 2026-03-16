import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, MessageSquare, Bell, User, Plus, Minus } from "lucide-react";
import { motion } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
type PromoGoal = "sales" | "acquisition" | "downloads" | "signups" | "other" | null;
type OfferDuration = "3" | "7" | "14" | "30" | "indefinite" | null;
type StreamDeadline = "1" | "2" | "3" | "4" | null;

export function CampaignSetupPromoOnly() {
  const navigate = useNavigate();

  const [promoGoal, setPromoGoal] = useState<PromoGoal>(null);
  const [offerDuration, setOfferDuration] = useState<OfferDuration>(null);
  const [streamDeadline, setStreamDeadline] = useState<StreamDeadline>(null);
  const [creatorCount, setCreatorCount] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE OFF");
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("Unlimited");
  const [expiryDate, setExpiryDate] = useState("");
  const [instructions, setInstructions] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    // Basic validation
    if (!promoGoal || !offerDuration || !streamDeadline || !promoCode || !discountValue) {
      alert("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("campaigns") // Replace with your table name
        .insert([
          {
            type: "promo-only",
            promo_goal: promoGoal,
            offer_duration: offerDuration,
            stream_deadline: streamDeadline,
            creator_count: creatorCount,
            promo_code: promoCode,
            discount_type: discountType,
            discount_value: discountValue,
            usage_limit: usageLimit,
            expiry_date: expiryDate,
            instructions,
          },
        ])
        .select(); // get the inserted record

      if (supabaseError) throw supabaseError;

      // Navigate to next step with the inserted campaign ID
      navigate("/campaign/create", { state: { campaignId: data[0].id } });
    } catch (err: any) {
      console.error("Supabase error:", err.message);
      setError("Failed to save campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      {/* ... your top nav, progress, and form fields remain unchanged ... */}

      {/* CONTINUE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        {error && <p className="text-red-600 text-sm mb-2 italic">{error}</p>}
        <motion.button
          onClick={handleContinue}
          disabled={isLoading}
          className={`w-full py-3.5 px-5 flex items-center justify-between text-white ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#1D1D1D]"
          }`}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">
            {isLoading ? "SAVING..." : "CONTINUE"}
          </span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}