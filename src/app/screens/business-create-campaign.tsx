import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { CampaignBasicInfo } from "./campaign-basic-info";
import { CampaignCreatorSelection } from "./campaign-creator-selection";
import { CampaignOfferDetails } from "./campaign-offer-details";
import { CampaignConfirmation } from "./campaign-confirmation";

export interface CampaignFormData {
  name: string;
  type: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  creatorIds: string[];
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
    creatorIds: [],
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

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")           // ✅ "name" not "business_name"
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Business fetch error:", error);
        toast.error("Failed to load business profile");
        return;
      }

      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.name || "Your Business");  // ✅ "name" not "business_name"
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
          status: "pending_review",
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          streams_required: 4,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Insert promo code if provided
      if (formData.promoCode) {
        const { error: promoError } = await supabase
          .from("promo_codes")
          .insert({
            campaign_id: campaign.id,
            business_id: businessId,  // ✅ now correctly set
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

      // 3. Insert campaign_creators entries
      if (formData.creatorIds.length > 0) {
        const { error: creatorsError } = await supabase
          .from("campaign_creators")
          .insert(
            formData.creatorIds.map((creatorId) => ({
              campaign_id: campaign.id,
              creator_id: creatorId,
              status: "NOT STARTED",
              streams_target: 4,
              streams_completed: 0,
              created_at: new Date().toISOString(),
            }))
          );
        if (creatorsError) throw creatorsError;
      }

      // 4. Notify admins
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

      return campaign.id;
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create campaign");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Basic Info",        component: CampaignBasicInfo },
    { number: 2, title: "Select Creators",   component: CampaignCreatorSelection },
    { number: 3, title: "Offer Details",     component: CampaignOfferDetails },
    { number: 4, title: "Confirm",           component: CampaignConfirmation },
  ];

  const CurrentStepComponent = steps[step - 1].component;

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      <AppHeader
        showBack
        backPath="/business/dashboard"
        title={editCampaignId ? "Edit Campaign" : "Create Campaign"}
        userType="business"
      />

      {/* Step indicator */}
      <div className="px-4 py-6">
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

      <div className="w-full h-px bg-[#1D1D1D]/10 mb-6" />

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
