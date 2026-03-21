// src/screens/business-create-campaign.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

import { CampaignBasicInfo } from "./campaign-basic-info";
import { CampaignCreatorSelection } from "./campaign-creator-selection";
import { CampaignOfferDetails } from "./campaign-offer-details";
import { CampaignConfirmation } from "./campaign-confirmation";

// Types
export interface CampaignFormData {
  // Step 1: Basic info
  name: string;
  type: string;          // e.g., "promo-only", "banner+promo"
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  // Step 2: Creators
  creatorIds: string[];  // selected creator IDs
  // Step 3: Offer details
  promoCode: string;
  discountType: "percentage" | "fixed_amount" | "bogo" | "free_shipping";
  discountValue: number;
  usageLimit: number | null;
  expiryDate: string | null;
  instructions: string;
  // Additional
  status: "draft" | "active" | "paused";
}

export function BusinessCreateCampaign() {
  const navigate = useNavigate();
  const { id: editCampaignId } = useParams(); // if editing
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    type: "",
    description: "",
    budget: 0,
    start_date: "",
    end_date: "",
    creatorIds: [],
    promoCode: "",
    discountType: "percentage",
    discountValue: 0,
    usageLimit: null,
    expiryDate: null,
    instructions: "",
    status: "draft",
  });

  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch business ID from profile
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setBusinessId(data.id);
    };
    fetchBusiness();
  }, [user]);

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!businessId) {
      toast.error("Business profile not found");
      return;
    }

    setLoading(true);
    try {
      // 1. Insert campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          business_id: businessId,
          name: formData.name,
          type: formData.type,
          description: formData.description,
          budget: formData.budget,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          streams_required: 4, // you can make this dynamic
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Insert promo code details (if provided)
      if (formData.promoCode) {
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
            goal: "sales", // you might want to capture goal earlier
            offer_duration: "30", // placeholder
          });
        if (promoError) throw promoError;
      }

      // 3. Insert campaign_creators entries for each selected creator
      const creatorEntries = formData.creatorIds.map((creatorId) => ({
        campaign_id: campaign.id,
        creator_id: creatorId,
        status: "pending",
        streams_target: 4, // default, can be customized per creator later
        streams_completed: 0,
        created_at: new Date().toISOString(),
      }));

      if (creatorEntries.length > 0) {
        const { error: creatorsError } = await supabase
          .from("campaign_creators")
          .insert(creatorEntries);
        if (creatorsError) throw creatorsError;
      }

      toast.success("Campaign created successfully!");
      navigate(`/business/campaign/overview/${campaign.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Basic Info", component: CampaignBasicInfo },
    { number: 2, title: "Select Creators", component: CampaignCreatorSelection },
    { number: 3, title: "Offer Details", component: CampaignOfferDetails },
    { number: 4, title: "Confirm", component: CampaignConfirmation },
  ];

  const CurrentStepComponent = steps[step - 1].component;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader
        showBack
        backPath="/business/dashboard"
        title={`${editCampaignId ? "Edit" : "Create"} Campaign`}
        userType="business"
      />

      {/* Step indicator */}
      <div className="px-4 py-6">
        <div className="flex gap-1.5 mb-2">
          {steps.map((s) => (
            <div
              key={s.number}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= s.number ? "bg-[#1D1D1D]" : "bg-[#1D1D1D]/20"
              }`}
            />
          ))}
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 text-center italic">
          STEP {step} OF {steps.length}: {steps[step - 1].title}
        </p>
      </div>

      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

      {/* Step component */}
      <CurrentStepComponent
        data={formData}
        updateData={updateFormData}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        loading={loading}
        isLastStep={step === steps.length}
      />
    </div>
  );
}
