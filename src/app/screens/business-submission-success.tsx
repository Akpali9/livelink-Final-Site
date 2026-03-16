import { useNavigate } from "react-router";
import {
  CheckCircle2,
  ArrowRight,
  Mail,
  Bell,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 

export function BusinessSubmissionSuccess() {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);

  const user = supabase.auth.user();

  useEffect(() => {
    const fetchLatestCampaign = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("business_campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log("Fetch campaign error:", error.message);
        return;
      }

      setCampaign(data);
    };

    fetchLatestCampaign();
  }, [user]);

  if (!campaign) return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      <AppHeader title="Campaign Submitted" />

      <main className="max-w-[480px] mx-auto w-full px-6 pt-12 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="w-24 h-24 bg-[#389C9A] border-4 border-[#1D1D1D] flex items-center justify-center mb-8"
        >
          <CheckCircle2 className="w-12 h-12 text-[#FEDB71]" />
        </motion.div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2 leading-none">
            Payment Held
          </h1>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4 leading-none">
            Campaign Under Review
          </h1>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="h-px w-8 bg-[#1D1D1D]/10" />
            <Clock className="w-4 h-4 text-[#D2691E]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E] italic">
              Under Admin Review
            </span>
            <span className="h-px w-8 bg-[#1D1D1D]/10" />
          </div>

          <p className="text-sm font-medium italic text-[#1D1D1D]/60 leading-relaxed uppercase tracking-tight max-w-[320px] mx-auto mb-4">
            Your payment has been held securely. Your campaign is now being reviewed by the LiveLink team before going live to creators.
          </p>

          <p className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] italic">
            Please watch for updates in your email and the app inbox.
          </p>
        </div>

        {/* Transaction Info */}
        <p className="mt-8 text-[8px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/20 text-center italic">
          Transaction ID: {campaign.transaction_id}
        </p>
      </main>
    </div>
  );
}