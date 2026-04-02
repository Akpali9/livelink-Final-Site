import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Bell,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Info,
  Shield,
  X,
  Lock,
} from "lucide-react";
import { Toaster } from "sonner";

export interface CampaignFormData {
  name: string;
  type: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  streams_required: number;
  promoCode: string;
  discountType: "percentage" | "fixed_amount" | "bogo" | "free_shipping";
  discountValue: number;
  usageLimit: number | null;
  expiryDate: string | null;
  instructions: string;
}

export function BusinessCreateCampaign() {
  const navigate = useNavigate();
  const { id: editCampaignId } = useParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    type: "",
    description: "",
    budget: 0,
    start_date: "",
    end_date: "",
    streams_required: 4,
    promoCode: "",
    discountType: "percentage",
    discountValue: 0,
    usageLimit: null,
    expiryDate: null,
    instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");

  // Card details state (for the payment step – we'll add a mock payment)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeFee, setAgreeFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Business fetch error:", error);
        toast.error("Failed to load business profile");
        return;
      }

      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.name || "Your Business");
      } else {
        toast.error("No business profile found. Please register your business first.");
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user, navigate]);

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const validateCard = () => {
    const errors: { [key: string]: string } = {};
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (!/^\d{16}$/.test(cleanCard)) {
      errors.cardNumber = "Enter a valid 16-digit card number";
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      errors.cardExpiry = "Use MM/YY format";
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      errors.cardCvc = "Enter 3 or 4 digits";
    }
    if (!cardholderName.trim()) {
      errors.cardholderName = "Enter cardholder name";
    }
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!businessId) {
      toast.error("Business profile not found");
      return;
    }

    if (step === 4) {
      if (!validateCard()) {
        toast.error("Please check your card details");
        return;
      }
      if (!agreeTerms || !agreeFee) {
        toast.error("Please agree to the terms and fee policy");
        return;
      }
    }

    setSubmitting(true);

    // Simulate payment processing (replace with real gateway later)
    if (step === 4) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    try {
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          business_id: businessId,
          name: formData.name,
          type: formData.type,
          description: formData.description,
          budget: formData.budget,
          status: "pending_review",
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          streams_required: formData.streams_required,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      if (formData.promoCode && (formData.type.includes("Promo Code"))) {
        const { error: promoError } = await supabase
          .from("promo_codes")
          .insert({
            campaign_id: campaign.id,
            business_id: businessId,
            code: formData.promoCode.toUpperCase(),
            discount_type: formData.discountType,
            discount_value: formData.discountValue,
            usage_limit: formData.usageLimit,
            expires_at: formData.expiryDate,
            instructions: formData.instructions,
            goal: "sales",
            offer_duration: "30",
          });
        if (promoError) throw promoError;
      }

      const { data: adminRows } = await supabase
        .from("admins")
        .select("user_id");

      if (adminRows && adminRows.length > 0) {
        await supabase.from("notifications").insert(
          adminRows.map((admin) => ({
            user_id: admin.user_id,
            type: "campaign_pending",
            title: "New Campaign Pending Approval",
            message: `${formData.name} by ${businessName} needs review.`,
            data: { campaign_id: campaign.id },
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        );
      }

      toast.success("Campaign created successfully! It will be reviewed by our team.");
      navigate(`/business/campaign/${campaign.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  // Step components (simplified content, but styled consistently)
  const BasicInfoStep = () => (
    <div className="px-6 py-10 space-y-8">
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Campaign Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none transition-colors"
          placeholder="e.g., SUMMER SALE BLAST"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Campaign Type
        </label>
        <select
          value={formData.type}
          onChange={(e) => updateFormData({ type: e.target.value })}
          className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none bg-white"
          required
        >
          <option value="">Select type</option>
          <option value="Banner Only">Banner Only</option>
          <option value="Banner + Promo Code">Banner + Promo Code</option>
          <option value="Promo Code Only">Promo Code Only</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          rows={3}
          className="w-full border-2 border-[#1D1D1D] p-4 text-sm italic focus:border-[#389C9A] outline-none"
          placeholder="What's your campaign about? What's the offer?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            Budget (₦)
          </label>
          <input
            type="number"
            value={formData.budget || ""}
            onChange={(e) => updateFormData({ budget: parseFloat(e.target.value) || 0 })}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            Streams Required
          </label>
          <input
            type="number"
            value={formData.streams_required || ""}
            onChange={(e) => updateFormData({ streams_required: parseInt(e.target.value) || 0 })}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
            placeholder="e.g., 4"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            Start Date
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => updateFormData({ start_date: e.target.value })}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm uppercase italic focus:border-[#389C9A] outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            End Date
          </label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => updateFormData({ end_date: e.target.value })}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm uppercase italic focus:border-[#389C9A] outline-none"
          />
        </div>
      </div>

      <div className="bg-[#F8F8F8] p-4 border-2 border-[#1D1D1D]/10 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#389C9A] flex-shrink-0 mt-0.5" />
        <p className="text-[9px] font-bold uppercase leading-relaxed text-[#1D1D1D]/60">
          Creators will be able to apply to your campaign after it's approved. You'll be notified when creators apply.
        </p>
      </div>
    </div>
  );

  const CampaignSettingsStep = () => (
    <div className="px-6 py-10 space-y-8">
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Streams per Creator
        </label>
        <input
          type="number"
          value={formData.streams_required || ""}
          onChange={(e) => updateFormData({ streams_required: parseInt(e.target.value) || 0 })}
          className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
          placeholder="Number of streams each creator must complete"
          required
        />
        <p className="text-[8px] italic opacity-50">
          Each creator will be required to complete this many streams to earn their payout.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Budget Allocation
        </label>
        <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 p-4">
          <p className="text-sm font-black">₦{formData.budget.toLocaleString()}</p>
          <p className="text-[8px] italic opacity-50">
            Total campaign budget. Funds are held securely and released per stream completed.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
          Creator Payout per Stream
        </label>
        <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 p-4">
          <p className="text-sm font-black">
            ₦{formData.streams_required ? Math.floor(formData.budget / (formData.streams_required * 10)) : 0}
          </p>
          <p className="text-[8px] italic opacity-50">
            Estimated per stream per creator (based on 10 creators). Actual payout will depend on number of creators selected.
          </p>
        </div>
      </div>

      <div className="bg-[#1D1D1D] text-white p-5 flex items-start gap-3 border-2 border-[#1D1D1D]">
        <Shield className="w-4 h-4 text-[#FEDB71] flex-shrink-0 mt-0.5" />
        <p className="text-[9px] font-bold uppercase leading-relaxed">
          Creators will apply to your campaign. You can approve or reject applications. You only pay for approved creators after they complete streams.
        </p>
      </div>
    </div>
  );

  const OfferDetailsStep = () => {
    const showPromo = formData.type.includes("Promo Code");
    if (!showPromo) {
      return (
        <div className="px-6 py-10 text-center">
          <p className="text-sm italic opacity-50">No promo code details needed for this campaign type.</p>
          <div className="mt-6 bg-[#F8F8F8] p-5 border-2 border-[#1D1D1D]/10">
            <p className="text-[9px] font-bold uppercase">Your campaign will run with banner advertising only.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-10 space-y-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            Promo Code
          </label>
          <input
            type="text"
            value={formData.promoCode}
            onChange={(e) => updateFormData({ promoCode: e.target.value.toUpperCase() })}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
            placeholder="e.g., SUMMER20"
            required={showPromo}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
              Discount Type
            </label>
            <select
              value={formData.discountType}
              onChange={(e) => updateFormData({ discountType: e.target.value as any })}
              className="w-full border-2 border-[#1D1D1D] p-4 text-sm uppercase italic focus:border-[#389C9A] outline-none bg-white"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount (₦)</option>
              <option value="bogo">Buy One Get One</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
              Discount Value
            </label>
            <input
              type="number"
              value={formData.discountValue || ""}
              onChange={(e) => updateFormData({ discountValue: parseFloat(e.target.value) || 0 })}
              className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
              Usage Limit (optional)
            </label>
            <input
              type="number"
              value={formData.usageLimit || ""}
              onChange={(e) => updateFormData({ usageLimit: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full border-2 border-[#1D1D1D] p-4 text-sm font-black uppercase tracking-tight italic focus:border-[#389C9A] outline-none"
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate || ""}
              onChange={(e) => updateFormData({ expiryDate: e.target.value || null })}
              className="w-full border-2 border-[#1D1D1D] p-4 text-sm uppercase italic focus:border-[#389C9A] outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
            Instructions for Creators
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => updateFormData({ instructions: e.target.value })}
            rows={3}
            className="w-full border-2 border-[#1D1D1D] p-4 text-sm italic focus:border-[#389C9A] outline-none"
            placeholder="How should creators share the promo code? Any special notes?"
          />
        </div>
      </div>
    );
  };

  const ConfirmationStep = () => {
    const showPromo = formData.type.includes("Promo Code");
    const subtotal = formData.budget;
    const serviceFee = subtotal * 0.08;
    const totalHeld = subtotal + serviceFee;

    return (
      <div className="px-6 py-10 space-y-8">
        <div className="border-2 border-[#1D1D1D] p-6 bg-white">
          <h3 className="text-lg font-black uppercase tracking-tighter italic mb-4">Campaign Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
              <span className="font-bold uppercase italic">Name</span>
              <span className="font-black uppercase tracking-tight">{formData.name || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
              <span className="font-bold uppercase italic">Type</span>
              <span className="font-black uppercase tracking-tight">{formData.type || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
              <span className="font-bold uppercase italic">Budget</span>
              <span className="font-black">₦{formData.budget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
              <span className="font-bold uppercase italic">Streams per Creator</span>
              <span className="font-black">{formData.streams_required}</span>
            </div>
            <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
              <span className="font-bold uppercase italic">Date Range</span>
              <span className="font-black">
                {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : "—"} →{" "}
                {formData.end_date ? new Date(formData.end_date).toLocaleDateString() : "—"}
              </span>
            </div>
            {showPromo && formData.promoCode && (
              <>
                <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
                  <span className="font-bold uppercase italic">Promo Code</span>
                  <span className="font-black">{formData.promoCode}</span>
                </div>
                <div className="flex justify-between border-b border-[#1D1D1D]/10 pb-2">
                  <span className="font-bold uppercase italic">Discount</span>
                  <span className="font-black">
                    {formData.discountValue}{formData.discountType === "percentage" ? "%" : "₦"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment summary (from second code) */}
        <div className="bg-[#1D1D1D] p-8 text-white border-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-white/40 italic">
            Order Summary
          </h3>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center italic">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Subtotal</span>
              <span className="text-sm font-black italic">₦{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-start italic">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#FEDB71]">Service Fee (8%)</span>
                <span className="text-[7px] font-bold opacity-30 uppercase tracking-widest max-w-[150px] leading-tight mt-1">
                  Payment processing, verification & support
                </span>
              </div>
              <span className="text-sm font-black italic text-[#FEDB71]">₦{serviceFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/10 w-full" />
            <div className="flex justify-between items-center italic pt-2">
              <span className="text-[12px] font-black uppercase tracking-widest">Total Held Today</span>
              <span className="text-3xl font-black italic text-[#FEDB71]">₦{totalHeld.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[8px] font-medium opacity-30 italic uppercase leading-relaxed text-center">
            Released to creators per verified stream cycle. Full refund guaranteed if no creators match or streams are not completed.
          </p>
        </div>

        {/* Card input (from second code) */}
        <div className="border-2 border-[#1D1D1D] p-6 space-y-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-40 italic">Payment Method</h3>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              placeholder="Name on card"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="w-full border border-[#1D1D1D]/20 p-3 text-sm uppercase italic focus:border-[#1D1D1D] outline-none"
            />
            {cardErrors.cardholderName && (
              <p className="text-[8px] text-red-500 mt-1">{cardErrors.cardholderName}</p>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-1">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})/g, "$1 ").trim())}
              className="w-full border border-[#1D1D1D]/20 p-3 text-sm uppercase italic focus:border-[#1D1D1D] outline-none"
            />
            {cardErrors.cardNumber && (
              <p className="text-[8px] text-red-500 mt-1">{cardErrors.cardNumber}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-1">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length >= 2) val = val.slice(0,2) + "/" + val.slice(2,4);
                  setCardExpiry(val.slice(0,5));
                }}
                className="w-full border border-[#1D1D1D]/20 p-3 text-sm uppercase italic focus:border-[#1D1D1D] outline-none"
              />
              {cardErrors.cardExpiry && (
                <p className="text-[8px] text-red-500 mt-1">{cardErrors.cardExpiry}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-1">
                CVC
              </label>
              <input
                type="text"
                placeholder="123"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0,4))}
                className="w-full border border-[#1D1D1D]/20 p-3 text-sm uppercase italic focus:border-[#1D1D1D] outline-none"
              />
              {cardErrors.cardCvc && (
                <p className="text-[8px] text-red-500 mt-1">{cardErrors.cardCvc}</p>
              )}
            </div>
          </div>
          <div className="bg-[#F8F8F8] p-3 border border-[#1D1D1D]/10 flex items-center gap-2 text-[8px] font-bold uppercase tracking-tight italic">
            <Lock className="w-3 h-3 text-[#389C9A]" />
            <span>Your payment is encrypted and secure</span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="peer hidden"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                {agreeTerms && <Check className="w-4 h-4 text-[#FEDB71]" />}
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight text-[#1D1D1D]/40 italic group-hover:text-[#1D1D1D] transition-colors">
              I confirm my campaign brief and banner comply with the platform's Advertiser Policy.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="peer hidden"
                checked={agreeFee}
                onChange={(e) => setAgreeFee(e.target.checked)}
              />
              <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                {agreeFee && <Check className="w-4 h-4 text-[#FEDB71]" />}
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight text-[#1D1D1D]/40 italic group-hover:text-[#1D1D1D] transition-colors">
              I understand the total includes an 8% service fee. I agree that the service fee is refunded if no creator accepts and non-refundable once accepted.
            </span>
          </label>
        </div>

        <div className="bg-[#FFF8DC] border border-[#D2691E]/20 p-6 flex items-start gap-4 italic">
          <Shield className="w-6 h-6 text-[#D2691E] shrink-0" />
          <p className="text-[10px] font-bold text-[#D2691E] leading-relaxed uppercase tracking-tight">
            Your ₦{totalHeld.toFixed(2)} is held securely. Released only after each verified stream cycle. Full refund guaranteed if work is not completed. Service fee is refunded if no creator accepts.
          </p>
        </div>
      </div>
    );
  };

  const steps = [
    { number: 1, title: "Basic Info", component: BasicInfoStep },
    { number: 2, title: "Campaign Settings", component: CampaignSettingsStep },
    { number: 3, title: "Offer Details", component: OfferDetailsStep },
    { number: 4, title: "Confirm & Pay", component: ConfirmationStep },
  ];

  const CurrentStepComponent = steps[step - 1].component;

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      <Toaster position="top-center" richColors />

      {/* Fixed Header (exactly as CampaignCreation) */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
            </button>
            <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
              UPDATE CAMPAIGN
            </h1>
          </div>
        </div>
      </header>

      {/* Progress Section (exactly as CampaignCreation) */}
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
              {steps.map((s) => (
                <div
                  key={s.number}
                  className={`h-1.5 flex-1 transition-colors ${
                    step >= s.number ? "bg-[#1D1D1D]" : "bg-[#1D1D1D]/20"
                  }`}
                />
              ))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
              Step {step} of {steps.length}: {steps[step - 1].title}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* Page Heading (exactly as CampaignCreation) */}
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

      {/* Step Content */}
      <CurrentStepComponent />

      {/* Fixed Bottom Button (exactly as CampaignCreation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1D1D]/10 p-4 max-w-md mx-auto">
        <div className="flex gap-3">
          {step > 1 && (
            <motion.button
              onClick={handleBack}
              className="flex-1 py-3.5 px-5 flex items-center justify-center gap-2 border-2 border-[#1D1D1D] bg-white text-[#1D1D1D] text-sm font-black uppercase tracking-widest italic hover:bg-[#F8F8F8] transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </motion.button>
          )}

          {step < steps.length ? (
            <motion.button
              onClick={handleNext}
              className={`flex-1 py-3.5 px-5 flex items-center justify-center gap-2 ${
                step === 1 ? "w-full" : ""
              } bg-[#1D1D1D] text-white text-sm font-black uppercase tracking-widest italic hover:bg-[#2A2A2A] transition-colors`}
              whileTap={{ scale: 0.98 }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSubmit}
              disabled={loading || submitting}
              className="flex-1 py-3.5 px-5 flex items-center justify-center gap-2 bg-[#1D1D1D] text-white text-sm font-black uppercase tracking-widest italic hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Create Campaign
                  <Check className="w-4 h-4" />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
