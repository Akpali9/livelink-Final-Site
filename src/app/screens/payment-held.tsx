import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { CheckCircle2, Clock, Bell, ShieldCheck, Mail, LayoutDashboard, Search } from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

export function PaymentHeld() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    if (!campaignId) return;

    const fetchData = async () => {
      const { data: campaignData } = await supabase
        .from("business_campaigns")
        .select(`*, creator:creator_id (full_name)`)
        .eq("id", campaignId)
        .single();
      setCampaign(campaignData);

      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setPayment(paymentData);
    };

    fetchData();
  }, [campaignId]);

  if (!campaign || !payment) return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-white pb-[100px]">
      <AppHeader title="Campaign Submitted" />
      <main className="max-w-[480px] mx-auto px-6 pt-12 flex flex-col items-center">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 bg-[#389C9A] flex items-center justify-center mb-8">
          <CheckCircle2 className="w-12 h-12 text-[#FEDB71]" />
        </motion.div>

        <h1 className="text-4xl font-black uppercase mb-2">Payment Held</h1>
        <p className="text-sm text-center mb-4">Your payment of N{campaign.total_payment.toFixed(2)} is held securely. Campaign is under review.</p>
        <p className="text-[10px] uppercase tracking-widest text-[#389C9A] italic">Check email for updates.</p>

        <div className="w-full bg-[#FFF8DC] p-6 flex items-start gap-4 mt-8">
          <Mail className="w-6 h-6" />
          <span>Transaction ID: {payment.id}</span>
        </div>

        <div className="flex flex-col w-full gap-4 mt-6">
          <button onClick={() => navigate("/business/dashboard")} className="bg-black text-white py-4 flex justify-center">Return to Dashboard</button>
          <button onClick={() => navigate("/campaigns")} className="bg-white border py-4 flex justify-center">View My Campaigns</button>
        </div>
      </main>
    </div>
  );
}