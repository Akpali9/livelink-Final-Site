import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, Lock, AlertTriangle, CreditCard, Info } from "lucide-react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

export function CampaignConfirm({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = async () => {
    if (!agreed) return;

    // Hold payment in Supabase
    const { data, error } = await supabase
      .from("payments")
      .insert([{ campaign_id: campaignId, amount: 240, status: "held" }])
      .select()
      .single();

    if (error) return alert(error.message);

    // Update campaign status to "review"
    await supabase.from("business_campaigns").update({ status: "review" }).eq("id", campaignId);

    // Navigate to success page
    navigate(`/payment/held/${campaignId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-40">
      <AppHeader showBack title="Confirm Order" />
      <div className="p-8">
        <label className="flex items-center gap-4">
          <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)} />
          <span>I agree to keep communication inside LiveLink</span>
        </label>
        <button
          disabled={!agreed}
          onClick={handleConfirm}
          className="mt-4 bg-black text-white px-6 py-4"
        >
          Confirm & Hold Payment <ArrowRight />
        </button>
      </div>
    </div>
  );
}