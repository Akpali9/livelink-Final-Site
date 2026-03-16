import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  ArrowRight, 
  MessageSquare, 
  Bell, 
  User, 
  Plus, 
  Minus, 
  Info,
  Target,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Eye,
  TrendingUp,
  Award,
  Sparkles,
  HelpCircle,
  Check,
  AlertCircle,
  Percent,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

type CampaignGoal = "awareness" | "traffic" | "product" | "event" | "general" | "sales" | "leads";
type OfferDuration = "3" | "7" | "14" | "30" | "60" | "indefinite";
type StreamDeadline = "1" | "2" | "3" | "4" | "6" | "8" | "12";

interface CampaignData {
  name: string;
  goal: CampaignGoal;
  bidAmount: number;
  offerDuration: OfferDuration;
  streamDeadline: StreamDeadline;
  creatorCount: number;
  description?: string;
  target_audience?: string;
  min_viewers?: number;
}

export function CampaignSetupBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal | "">("");
  const [bidAmount, setBidAmount] = useState("25");
  const [offerDuration, setOfferDuration] = useState<OfferDuration | "">("");
  const [streamDeadline, setStreamDeadline] = useState<StreamDeadline | "">("");
  const [creatorCount, setCreatorCount] = useState(1);
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [minViewers, setMinViewers] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [showEstimates, setShowEstimates] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchBusinessProfile();
    }
  }, [user]);

  const fetchUserData = async () => {
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

  const fetchBusinessProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setBusinessProfile(data);
  };

  // Calculations
  const bidValue = parseInt(bidAmount) || 0;
  const estimatedStreams = creatorCount * 4;
  const estimatedBilling = creatorCount * bidValue;
  const serviceFee = Math.round(estimatedBilling * 0.08);
  const totalHeld = estimatedBilling + serviceFee;

  const getAverageViewers = (bid: number) => {
    if (bid >= 5 && bid <= 20) return 175;
    if (bid >= 15 && bid <= 30) return 325;
    if (bid >= 30 && bid <= 50) return 500;
    if (bid >= 50 && bid <= 80) return 800;
    if (bid >= 80) return 1000;
    return 175;
  };

  const avgViewers = getAverageViewers(bidValue);
  const totalViewers = creatorCount * avgViewers;
  const totalImpressions = totalViewers * estimatedStreams;

  const getViewerQuality = (bid: number) => {
    if (bid >= 50) return "Premium";
    if (bid >= 30) return "High";
    if (bid >= 15) return "Medium";
    return "Standard";
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!campaignName.trim()) {
      errors.campaignName = "Campaign name is required";
    }

    if (!campaignGoal) {
      errors.campaignGoal = "Please select a campaign goal";
    }

    if (!bidAmount || bidValue < 5) {
      errors.bidAmount = "Bid amount must be at least ₦5";
    }

    if (!offerDuration) {
      errors.offerDuration = "Please select offer duration";
    }

    if (!streamDeadline) {
      errors.streamDeadline = "Please select stream deadline";
    }

    if (creatorCount < 1) {
      errors.creatorCount = "At least 1 creator required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!businessProfile || businessProfile.application_status !== 'approved') {
      toast.error("Your business must be approved before creating campaigns");
      navigate("/business/profile");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create campaign in database
      const { data, error: supabaseError } = await supabase
        .from("campaigns")
        .insert([
          {
            business_id: businessProfile.id,
            name: campaignName,
            type: "banner",
            description: description || null,
            goal: campaignGoal,
            bid_amount: bidValue,
            offer_duration: offerDuration,
            stream_deadline: parseInt(streamDeadline as string) * 7, // Convert weeks to days
            creator_count: creatorCount,
            estimated_streams: estimatedStreams,
            estimated_billing: estimatedBilling,
            total_viewers: totalViewers,
            total_impressions: totalImpressions,
            service_fee: serviceFee,
            total_held: totalHeld,
            target_audience: targetAudience || null,
            min_viewers: parseInt(minViewers) || null,
            status: "draft",
            created_at: new Date().toISOString()
          },
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      toast.success("Campaign created successfully!");

      // Navigate to next step
      navigate("/campaign/confirm", { 
        state: { 
          campaignId: data.id,
          type: "banner"
        } 
      });

    } catch (error: any) {
      console.error("Supabase error:", error);
      setError(error.message || "Failed to save campaign. Please try again.");
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const incrementCreators = () => {
    if (creatorCount < 50) {
      setCreatorCount(prev => prev + 1);
    }
  };

  const decrementCreators = () => {
    if (creatorCount > 1) {
      setCreatorCount(prev => prev - 1);
    }
  };

  const goalOptions = [
    { value: "awareness", label: "Brand Awareness", icon: Eye, description: "Increase brand visibility" },
    { value: "traffic", label: "Website Traffic", icon: TrendingUp, description: "Drive visitors to your site" },
    { value: "product", label: "Product Launch", icon: Sparkles, description: "Promote a new product" },
    { value: "sales", label: "Direct Sales", icon: DollarSign, description: "Generate immediate sales" },
    { value: "event", label: "Event Promotion", icon: Calendar, description: "Promote an upcoming event" },
    { value: "leads", label: "Lead Generation", icon: Users, description: "Collect customer information" },
    { value: "general", label: "General Awareness", icon: Target, description: "General brand promotion" },
  ];

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      {/* TOP NAV */}
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
              BANNER CAMPAIGN
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

      {/* PROGRESS BAR */}
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
              <div className="h-1.5 flex-1 bg-[#1D1D1D] rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              STEP 3 OF 5: BANNER DETAILS
            </p>
          </div>
        </div>
      </div>

      {/* FORM FIELDS */}
      <div className="px-4 space-y-6 mb-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600">{error}</p>
          </div>
        )}

        {/* Campaign Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Target className="w-4 h-4 text-[#389C9A]" />
            CAMPAIGN NAME <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Summer Sale Promotion"
            className={`w-full p-4 border-2 rounded-xl outline-none transition-colors text-sm ${
              formErrors.campaignName ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
            }`}
          />
          {formErrors.campaignName && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.campaignName}</p>
          )}
        </div>

        {/* Campaign Goal */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Award className="w-4 h-4 text-[#389C9A]" />
            CAMPAIGN GOAL <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((goal) => {
              const Icon = goal.icon;
              const isSelected = campaignGoal === goal.value;
              return (
                <button
                  key={goal.value}
                  onClick={() => setCampaignGoal(goal.value as CampaignGoal)}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? "bg-[#389C9A] border-[#389C9A] text-white"
                      : "bg-white border-[#1D1D1D]/10 hover:border-[#389C9A] hover:shadow-md"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-[#389C9A]"}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center">
                    {goal.label}
                  </span>
                </button>
              );
            })}
          </div>
          {formErrors.campaignGoal && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.campaignGoal}</p>
          )}
        </div>

        {/* Bid Amount */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <DollarSign className="w-4 h-4 text-[#389C9A]" />
            BID AMOUNT (per 4 streams) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black">₦</span>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              min="5"
              step="5"
              className={`w-full pl-10 p-4 border-2 rounded-xl outline-none transition-colors text-sm ${
                formErrors.bidAmount ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
              }`}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
            <span className="opacity-40">Min ₦5</span>
            <span className="text-[#389C9A]">Recommended: ₦25-50</span>
          </div>
          {formErrors.bidAmount && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.bidAmount}</p>
          )}
        </div>

        {/* Offer Duration */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Calendar className="w-4 h-4 text-[#389C9A]" />
            OFFER DURATION (days) <span className="text-red-500">*</span>
          </label>
          <select
            value={offerDuration}
            onChange={(e) => setOfferDuration(e.target.value as OfferDuration)}
            className={`w-full p-4 border-2 rounded-xl outline-none transition-colors text-sm font-black uppercase tracking-wider ${
              formErrors.offerDuration ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
            }`}
          >
            <option value="">Select duration</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="indefinite">Indefinite</option>
          </select>
          {formErrors.offerDuration && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.offerDuration}</p>
          )}
        </div>

        {/* Stream Deadline */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Clock className="w-4 h-4 text-[#389C9A]" />
            STREAM DEADLINE (weeks) <span className="text-red-500">*</span>
          </label>
          <select
            value={streamDeadline}
            onChange={(e) => setStreamDeadline(e.target.value as StreamDeadline)}
            className={`w-full p-4 border-2 rounded-xl outline-none transition-colors text-sm font-black uppercase tracking-wider ${
              formErrors.streamDeadline ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
            }`}
          >
            <option value="">Select deadline</option>
            <option value="1">1 week</option>
            <option value="2">2 weeks</option>
            <option value="3">3 weeks</option>
            <option value="4">4 weeks</option>
            <option value="6">6 weeks</option>
            <option value="8">8 weeks</option>
            <option value="12">12 weeks</option>
          </select>
          {formErrors.streamDeadline && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.streamDeadline}</p>
          )}
        </div>

        {/* Creator Count */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Users className="w-4 h-4 text-[#389C9A]" />
            NUMBER OF CREATORS <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={decrementCreators}
              disabled={creatorCount <= 1}
              className="w-12 h-12 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-black">{creatorCount}</span>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                {creatorCount === 1 ? 'CREATOR' : 'CREATORS'}
              </p>
            </div>
            <button
              onClick={incrementCreators}
              disabled={creatorCount >= 50}
              className="w-12 h-12 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {formErrors.creatorCount && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{formErrors.creatorCount}</p>
          )}
        </div>

        {/* Target Audience (Optional) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Users className="w-4 h-4 text-[#389C9A]" />
            TARGET AUDIENCE (optional)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Gamers, 18-35, UK"
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
          />
        </div>

        {/* Min Viewers (Optional) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Eye className="w-4 h-4 text-[#389C9A]" />
            MINIMUM VIEWERS (optional)
          </label>
          <input
            type="number"
            value={minViewers}
            onChange={(e) => setMinViewers(e.target.value)}
            placeholder="e.g. 100"
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
          />
        </div>

        {/* Description (Optional) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <HelpCircle className="w-4 h-4 text-[#389C9A]" />
            CAMPAIGN DESCRIPTION (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell creators more about your campaign..."
            rows={4}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl resize-none"
          />
        </div>

        {/* Live Estimates Card */}
        <AnimatePresence>
          {showEstimates && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-[#1D1D1D] to-gray-800 text-white p-6 rounded-xl"
            >
              <button
                onClick={() => setShowEstimates(false)}
                className="float-right p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FEDB71]" />
                LIVE ESTIMATES
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Bid Amount</span>
                  <span className="font-black">₦{bidValue} / 4 streams</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Creators</span>
                  <span className="font-black">{creatorCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Total Streams</span>
                  <span className="font-black">{estimatedStreams}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Est. Viewers/Stream</span>
                  <span className="font-black">{avgViewers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Total Viewers</span>
                  <span className="font-black">{totalViewers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Total Impressions</span>
                  <span className="font-black">{totalImpressions.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 my-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Subtotal</span>
                    <span className="font-black">₦{estimatedBilling}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Service Fee (8%)</span>
                    <span className="font-black">₦{serviceFee}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black mt-2">
                    <span>Total Held</span>
                    <span className="text-[#FEDB71]">₦{totalHeld}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-40">
                <Info className="w-3 h-3" />
                <span>Quality Tier: {getViewerQuality(bidValue)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Box */}
        <div className="bg-[#FEDB71]/10 p-4 rounded-xl border border-dashed border-[#FEDB71] flex items-start gap-3">
          <Info className="w-5 h-5 text-[#389C9A] flex-shrink-0 mt-0.5" />
          <p className="text-[9px] font-medium leading-relaxed opacity-60">
            You'll only be charged when creators accept and complete their streams. Funds are held securely until verification.
          </p>
        </div>
      </div>

      {/* CONTINUE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        <motion.button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-4 px-5 bg-[#1D1D1D] text-white flex items-center justify-between hover:bg-[#389C9A] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">
            {loading ? "CREATING CAMPAIGN..." : "CONTINUE TO CONFIRMATION"}
          </span>
          {!loading && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
        </motion.button>
      </div>
    </div>
  );
}