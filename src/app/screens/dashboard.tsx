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
  Calendar,
  Tag,
  Users,
  Clock,
  Percent,
  DollarSign,
  Hash,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

type PromoGoal = "sales" | "acquisition" | "downloads" | "signups" | "leads" | "awareness" | "other";
type OfferDuration = "3" | "7" | "14" | "30" | "60" | "indefinite";
type StreamDeadline = "1" | "2" | "3" | "4" | "6" | "8" | "12";
type DiscountType = "percentage" | "fixed_amount" | "bogo" | "free_shipping";

interface FormErrors {
  promoGoal?: string;
  offerDuration?: string;
  streamDeadline?: string;
  creatorCount?: string;
  promoCode?: string;
  discountValue?: string;
  expiryDate?: string;
}

export function CampaignSetupPromoOnly() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [promoGoal, setPromoGoal] = useState<PromoGoal | "">("");
  const [offerDuration, setOfferDuration] = useState<OfferDuration | "">("");
  const [streamDeadline, setStreamDeadline] = useState<StreamDeadline | "">("");
  const [creatorCount, setCreatorCount] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [budget, setBudget] = useState(0);
  const [estimatedReach, setEstimatedReach] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPreview, setShowPreview] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

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

  // Calculate estimated budget based on selections
  useEffect(() => {
    if (creatorCount && discountType) {
      // Platform fee per creator
      const platformFee = 5 * creatorCount;
      
      // Estimated budget based on discount value (simplified)
      const estimatedDiscountImpact = discountValue ? parseFloat(discountValue) * creatorCount * 10 : 0;
      
      setBudget(platformFee + estimatedDiscountImpact);
      
      // Estimated reach (simplified - based on creator count)
      setEstimatedReach(creatorCount * 5000);
    }
  }, [creatorCount, discountType, discountValue]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!promoGoal) {
      newErrors.promoGoal = "Please select a campaign goal";
    }

    if (!offerDuration) {
      newErrors.offerDuration = "Please select offer duration";
    }

    if (!streamDeadline) {
      newErrors.streamDeadline = "Please select stream deadline";
    }

    if (creatorCount < 1) {
      newErrors.creatorCount = "At least 1 creator required";
    }

    if (!promoCode.trim()) {
      newErrors.promoCode = "Promo code is required";
    } else if (promoCode.length < 4) {
      newErrors.promoCode = "Promo code must be at least 4 characters";
    }

    if (!discountValue) {
      newErrors.discountValue = "Discount value is required";
    } else if (discountType === "percentage" && (parseFloat(discountValue) < 1 || parseFloat(discountValue) > 100)) {
      newErrors.discountValue = "Percentage must be between 1 and 100";
    } else if (discountType === "fixed_amount" && parseFloat(discountValue) < 1) {
      newErrors.discountValue = "Amount must be greater than 0";
    }

    if (expiryDate && new Date(expiryDate) < new Date()) {
      newErrors.expiryDate = "Expiry date must be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before continuing");
      return;
    }

    if (!businessProfile || businessProfile.application_status !== 'approved') {
      toast.error("Your business must be approved before creating campaigns");
      navigate("/business/profile");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create the campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert([
          {
            business_id: businessProfile.id,
            name: `${discountType === 'percentage' ? discountValue + '% OFF' : '₦' + discountValue + ' OFF'} Promo Campaign`,
            type: "promo-only",
            description: instructions || "Promo code campaign",
            status: "draft",
            budget: budget,
            streams_required: parseInt(streamDeadline) || 4,
            target_audience: promoGoal,
            start_date: new Date().toISOString(),
            end_date: expiryDate || null,
            created_at: new Date().toISOString()
          },
        ])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Create promo code details
      const { error: promoError } = await supabase
        .from("promo_codes")
        .insert([
          {
            campaign_id: campaignData.id,
            business_id: businessProfile.id,
            code: promoCode.toUpperCase(),
            discount_type: discountType,
            discount_value: parseFloat(discountValue),
            usage_limit: usageLimit === "Unlimited" ? null : parseInt(usageLimit),
            expires_at: expiryDate || null,
            instructions: instructions,
            goal: promoGoal,
            offer_duration: offerDuration,
            created_at: new Date().toISOString()
          },
        ]);

      if (promoError) throw promoError;

      // 3. Create campaign creators entries
      const creatorEntries = [];
      for (let i = 0; i < creatorCount; i++) {
        creatorEntries.push({
          campaign_id: campaignData.id,
          status: "pending",
          streams_target: parseInt(streamDeadline) || 4,
          streams_completed: 0,
          created_at: new Date().toISOString()
        });
      }

      const { error: creatorsError } = await supabase
        .from("campaign_creators")
        .insert(creatorEntries);

      if (creatorsError) throw creatorsError;

      toast.success("Campaign created successfully!");

      // Navigate to next step with campaign ID
      navigate("/campaign/confirm", { 
        state: { 
          campaignId: campaignData.id,
          type: "promo-only"
        } 
      });

    } catch (error: any) {
      console.error("Error creating campaign:", error);
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setIsLoading(false);
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

  const getDiscountTypeLabel = (type: DiscountType) => {
    switch(type) {
      case "percentage": return "Percentage Off";
      case "fixed_amount": return "Fixed Amount Off";
      case "bogo": return "Buy One Get One";
      case "free_shipping": return "Free Shipping";
      default: return type;
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
              PROMO ONLY CAMPAIGN
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
              <div className="h-1.5 flex-1 bg-[#1D1D1D] rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
              <div className="h-1.5 flex-1 bg-[#1D1D1D]/20 rounded-full" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              STEP 3 OF 5: PROMO CODE SETUP
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* PAGE HEADING */}
      <div className="px-4 mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-2">
          SET UP YOUR PROMO CODE
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1D1D1D]/50 italic leading-tight">
          CREATE A DISCOUNT CODE FOR CREATORS TO SHARE WITH THEIR AUDIENCE
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* FORM */}
      <div className="px-4 space-y-6 pb-8">
        {/* Goal Selection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
            <Tag className="w-4 h-4 text-[#389C9A]" />
            CAMPAIGN GOAL <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "sales", label: "Sales", icon: DollarSign },
              { value: "acquisition", label: "Acquisition", icon: Users },
              { value: "downloads", label: "Downloads", icon: ArrowDown },
              { value: "signups", label: "Signups", icon: UserPlus },
              { value: "leads", label: "Leads", icon: Hash },
              { value: "awareness", label: "Awareness", icon: Sparkles },
            ].map((goal) => {
              const Icon = goal.icon;
              return (
                <button
                  key={goal.value}
                  onClick={() => setPromoGoal(goal.value as PromoGoal)}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    promoGoal === goal.value
                      ? "bg-[#389C9A] border-[#389C9A] text-white"
                      : "bg-white border-[#1D1D1D]/10 hover:border-[#389C9A] hover:shadow-md"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${promoGoal === goal.value ? "text-white" : "text-[#389C9A]"}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest italic">
                    {goal.label}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.promoGoal && (
            <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.promoGoal}</p>
          )}
        </div>

        {/* Promo Code Details */}
        <div className="space-y-4 p-5 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#389C9A]" />
            Promo Code Details
          </h3>

          {/* Promo Code Input */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              PROMO CODE <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20"
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black uppercase tracking-wider rounded-lg"
              maxLength={20}
            />
            {errors.promoCode && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.promoCode}</p>
            )}
          </div>

          {/* Discount Type and Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                DISCOUNT TYPE <span className="text-red-500">*</span>
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black uppercase tracking-wider rounded-lg"
              >
                <option value="percentage">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount Off</option>
                <option value="bogo">Buy One Get One</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                VALUE <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {discountType === "percentage" && (
                  <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                )}
                {discountType === "fixed_amount" && (
                  <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
                )}
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "20" : "10"}
                  className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black rounded-lg"
                  min={discountType === "percentage" ? 1 : 0.01}
                  max={discountType === "percentage" ? 100 : undefined}
                  step={discountType === "percentage" ? 1 : 0.01}
                />
              </div>
              {errors.discountValue && (
                <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.discountValue}</p>
              )}
            </div>
          </div>

          {/* Usage Limit */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              USAGE LIMIT
            </label>
            <select
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black uppercase tracking-wider rounded-lg"
            >
              <option value="Unlimited">Unlimited</option>
              <option value="10">10 uses</option>
              <option value="25">25 uses</option>
              <option value="50">50 uses</option>
              <option value="100">100 uses</option>
              <option value="500">500 uses</option>
            </select>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              EXPIRY DATE
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-12 p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black rounded-lg"
              />
            </div>
            {errors.expiryDate && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.expiryDate}</p>
            )}
          </div>
        </div>

        {/* Duration Settings */}
        <div className="space-y-4 p-5 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#389C9A]" />
            Duration Settings
          </h3>

          {/* Offer Duration */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              OFFER DURATION (DAYS) <span className="text-red-500">*</span>
            </label>
            <select
              value={offerDuration}
              onChange={(e) => setOfferDuration(e.target.value as OfferDuration)}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black uppercase tracking-wider rounded-lg"
            >
              <option value="">Select duration</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="indefinite">Indefinite</option>
            </select>
            {errors.offerDuration && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.offerDuration}</p>
            )}
          </div>

          {/* Stream Deadline */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              STREAM DEADLINE (WEEKS) <span className="text-red-500">*</span>
            </label>
            <select
              value={streamDeadline}
              onChange={(e) => setStreamDeadline(e.target.value as StreamDeadline)}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm font-black uppercase tracking-wider rounded-lg"
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
            {errors.streamDeadline && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.streamDeadline}</p>
            )}
          </div>
        </div>

        {/* Creators */}
        <div className="space-y-4 p-5 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
            <Users className="w-4 h-4 text-[#389C9A]" />
            Creators
          </h3>

          {/* Creator Count */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              NUMBER OF CREATORS <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementCreators}
                disabled={creatorCount <= 1}
                className="w-12 h-12 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
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
                className="w-12 h-12 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {errors.creatorCount && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.creatorCount}</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
              SPECIAL INSTRUCTIONS FOR CREATORS
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any specific requirements or notes for creators..."
              rows={4}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Budget Preview */}
        <div className="p-5 bg-gradient-to-r from-[#1D1D1D] to-gray-800 text-white rounded-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest italic mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#FEDB71]" />
            Estimated Budget
          </h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Platform Fee ({creatorCount} creators)</span>
              <span className="font-black">₦{5 * creatorCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Estimated Discount Impact</span>
              <span className="font-black">₦{budget - (5 * creatorCount)}</span>
            </div>
            <div className="border-t border-white/10 my-2 pt-2">
              <div className="flex justify-between text-lg font-black">
                <span>Total Estimate</span>
                <span className="text-[#FEDB71]">₦{budget}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-40">
            <Info className="w-3 h-3" />
            <span>Estimated reach: {estimatedReach.toLocaleString()} viewers</span>
          </div>
        </div>

        {/* Preview Button */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full py-3 border-2 border-[#1D1D1D]/10 hover:border-[#389C9A] rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-colors"
        >
          {showPreview ? 'Hide Preview' : 'Preview Campaign'}
        </button>

        {/* Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-white border-2 border-[#389C9A] rounded-xl">
                <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3">CAMPAIGN PREVIEW</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-60">Promo Code:</span>
                    <span className="font-black">{promoCode || 'SUMMER20'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Discount:</span>
                    <span className="font-black">
                      {discountValue}{discountType === 'percentage' ? '% OFF' : ' OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Creators:</span>
                    <span className="font-black">{creatorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Duration:</span>
                    <span className="font-black">{offerDuration || '7'} days</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#1D1D1D]/10">
                  <p className="text-[10px] italic text-center opacity-60">
                    Creators will share this code with their audience to drive conversions
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTINUE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        <motion.button
          onClick={handleContinue}
          disabled={isLoading}
          className={`w-full py-4 px-5 flex items-center justify-between rounded-xl transition-all ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
          }`}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
        >
          <span className="text-sm font-black uppercase tracking-widest italic">
            {isLoading ? "CREATING CAMPAIGN..." : "CONTINUE TO CONFIRMATION"}
          </span>
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
}

export default Dashboard;
