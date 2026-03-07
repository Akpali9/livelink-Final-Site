import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  CheckCircle2, 
  Clock, 
  Bell, 
  ShieldCheck, 
  Mail, 
  LayoutDashboard, 
  Search,
  ArrowRight,
  Download,
  Copy,
  ExternalLink,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Campaign {
  id: string;
  business_id: string;
  creator_id: string;
  name: string;
  type: string;
  total_payment: number;
  status: string;
  streams_required: number;
  streams_completed: number;
  created_at: string;
  creator: {
    full_name: string;
    email?: string;
    avatar?: string;
  };
  business?: {
    business_name: string;
    email?: string;
  };
}

interface Payment {
  id: string;
  campaign_id: string;
  amount: number;
  status: 'held' | 'released' | 'refunded';
  payment_method: string;
  transaction_id?: string;
  held_until?: string;
  released_at?: string;
  created_at: string;
}

export function PaymentHeld() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!campaignId) return;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch campaign data with creator info
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select(`
            *,
            creator:creator_profiles (
              full_name,
              email,
              avatar_url
            ),
            business:businesses (
              business_name,
              email
            )
          `)
          .eq("id", campaignId)
          .single();

        if (campaignError) throw campaignError;
        setCampaign(campaignData);

        // Fetch payment data
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (paymentError && paymentError.code !== 'PGRST116') throw paymentError;
        setPayment(paymentData);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  const handleCopyTransactionId = () => {
    if (payment?.id) {
      navigator.clipboard.writeText(payment.id);
      setCopied(true);
      toast.success("Transaction ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewReceipt = () => {
    // In a real app, this would generate/download a receipt
    toast.info("Receipt download feature coming soon");
  };

  const getEstimatedReleaseDate = () => {
    if (!payment?.held_until) {
      const date = new Date();
      date.setDate(date.getDate() + 2); // 2 days from now
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    return new Date(payment.held_until).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Payment Status" showBack />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
            <p className="text-sm text-gray-500">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign || !payment) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Payment Status" showBack />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Payment Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The payment you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/business/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-[100px]">
      <AppHeader title="Payment Held" showBack />
      
      <main className="max-w-[480px] mx-auto px-6 pt-8 flex flex-col items-center">
        {/* Success Animation */}
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-28 h-28 bg-[#389C9A] flex items-center justify-center mb-8 rounded-2xl shadow-xl"
        >
          <CheckCircle2 className="w-14 h-14 text-[#FEDB71]" strokeWidth={2.5} />
        </motion.div>

        {/* Title */}
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black uppercase tracking-tighter mb-3 text-center"
        >
          Payment Held
        </motion.h1>

        {/* Amount */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <span className="text-5xl font-black text-[#389C9A]">₦{campaign.total_payment.toFixed(2)}</span>
        </motion.div>

        {/* Status Message */}
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-center mb-6 max-w-xs"
        >
          Your payment is securely held. Campaign is under review by our team.
        </motion.p>

        {/* Email Notification */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#389C9A] font-black italic mb-8"
        >
          <Mail className="w-4 h-4" />
          <span>Check your email for confirmation</span>
        </motion.div>

        {/* Payment Details Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full bg-gradient-to-br from-[#1D1D1D] to-gray-800 text-white p-8 rounded-2xl mb-8"
        >
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">
            Payment Details
          </h3>

          <div className="space-y-4">
            {/* Transaction ID */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] opacity-60">Transaction ID</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono">{payment.id.slice(0, 8)}...</span>
                <button
                  onClick={handleCopyTransactionId}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] opacity-60">Amount Held</span>
              <span className="text-lg font-black text-[#FEDB71]">₦{payment.amount.toFixed(2)}</span>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] opacity-60">Payment Method</span>
              <span className="text-[10px] font-black uppercase">{payment.payment_method || 'Card'}</span>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] opacity-60">Date</span>
              <span className="text-[10px] font-black">
                {new Date(payment.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Release Date */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[9px] opacity-60">Est. Release</span>
              <span className="text-[10px] font-black text-[#389C9A]">{getEstimatedReleaseDate()}</span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-40">
            <ShieldCheck className="w-3 h-3" />
            <span>Funds held securely in escrow</span>
          </div>
        </motion.div>

        {/* Campaign Summary */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full bg-[#F8F8F8] p-6 rounded-2xl mb-8"
        >
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Campaign Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px] font-medium">{campaign.name}</span>
              </div>
              <span className="text-[8px] font-black uppercase px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                {campaign.status}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px] font-medium">Creator</span>
              </div>
              <span className="text-[9px] font-black">{campaign.creator?.full_name || 'Unknown'}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px] font-medium">Streams</span>
              </div>
              <span className="text-[9px] font-black">{campaign.streams_completed || 0}/{campaign.streams_required}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full flex flex-col gap-3"
        >
          <button
            onClick={handleViewReceipt}
            className="w-full bg-white border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> View Receipt
          </button>

          <button
            onClick={() => navigate(`/campaign/${campaignId}`)}
            className="w-full bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all flex items-center justify-center gap-2"
          >
            View Campaign <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
          </button>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => navigate("/business/dashboard")}
              className="py-4 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate("/campaigns")}
              className="py-4 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors"
            >
              All Campaigns
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}