import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Check,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { getCampaignById } from "../services/campaignService";

export function CampaignAcceptedBusiness() {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<any>(null);

  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaign = async () => {
      try {
        const data = await getCampaignById(campaignId);
        setCampaign(data);
      } catch (err) {
        console.error("Error fetching campaign:", err);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  if (!campaign) return <p>Loading...</p>;

  const creator = campaign.creator;
  return (
    <div className="flex flex-col min-h-screen bg-white pb-40 text-[#1D1D1D]">
      <AppHeader title="Success" />

      <main className="flex-1 flex flex-col items-center justify-center px-8 pt-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-24 h-24 bg-[#389C9A] rounded-none flex items-center justify-center border-4 border-[#1D1D1D] relative z-10"
          >
            <CheckCircle2 className="w-12 h-12 text-[#FEDB71]" />
          </motion.div>
        </motion.div>

        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2 text-center leading-tight">
          Campaign Confirmed!
        </h1>
        <p className="text-sm text-[#1D1D1D]/60 mb-12 text-center font-medium italic">
          {creator.full_name} has accepted your campaign. You're good to go.
        </p>

        {/* Campaign Summary Card */}
        <section className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 mb-8 rounded-none relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-none overflow-hidden border border-[#1D1D1D]/10">
              <ImageWithFallback
                src={creator.avatar_url || ""}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div>
              <h3 className="font-black text-[#1D1D1D] uppercase italic tracking-tight">
                {creator.full_name}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">
                {creator.username}
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between italic">
              <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">
                Package
              </span>
              <span className="text-[12px] font-black uppercase">
                {campaign.package}
              </span>
            </div>
            <div className="flex justify-between italic">
              <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">
                Campaign Type
              </span>
              <span className="text-[12px] font-black uppercase">
                {campaign.campaign_type}
              </span>
            </div>
            <div className="flex justify-between italic">
              <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">
                Start Date
              </span>
              <span className="text-[12px] font-black uppercase">
                {new Date(campaign.start_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between italic pt-4 border-t border-[#1D1D1D]/10">
              <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">
                Total Payment
              </span>
              <div className="text-right">
                <span className="text-[14px] font-black uppercase tracking-tighter italic">
                  £{campaign.total_payment.toFixed(2)}
                </span>
                <p className="text-[7px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                  Released per verified stream cycle
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#389C9A] p-4 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-[#FEDB71]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FEDB71] italic">
              ✓ Active Campaign
            </span>
          </div>
        </section>

        {/* Coordination Warning Card */}
        <section className="w-full bg-[#1D1D1D] p-8 mb-8 border-2 border-[#FEDB71] relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="w-8 h-8 text-[#FEDB71] mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-tight italic text-white leading-relaxed opacity-80 mb-6">
              All coordination with your creator must happen inside LiveLink. Do not share personal contact details, move to WhatsApp, email or any external platform. Violations result in immediate account closure and forfeiture of all funds.
            </p>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#FEDB71] text-[#1D1D1D]">
              <Lock className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase italic tracking-widest">
                Secured Messaging Active
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Action Buttons */}
      <div className="px-6 pb-12 flex flex-col gap-4 max-w-[480px] mx-auto w-full">
        <button
          onClick={() => navigate(`/messages/${campaign.id}`)}
          className="w-full py-6 bg-[#1D1D1D] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] rounded-none italic border-2 border-[#1D1D1D]"
        >
          <MessageCircle className="w-5 h-5 text-[#389C9A]" />
          <span>Open Message Thread</span>
        </button>
        <button
          onClick={() => navigate(`/business/campaign/overview/${campaign.id}`)}
          className="w-full py-6 bg-white border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:bg-[#F8F8F8] transition-all rounded-none italic"
        >
          View Campaign Overview <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
        </button>
      </div>
    </div>
  );
}