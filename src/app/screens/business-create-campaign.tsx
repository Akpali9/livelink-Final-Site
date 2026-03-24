import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { CampaignTypeStep } from "./campaign-type-step";
import { CampaignBriefStep } from "./campaign-brief-step";
import { CampaignConfirmPayStep } from "./campaign-confirm-pay-step";

export interface CampaignFormData {
  // Step 1
  campaignType: "banner" | "banner_promo" | "promo_only" | "";
  // Step 2
  promotingCategory: "product" | "service" | "event" | "app" | "physical_location" | "brand_awareness" | "";
  businessName: string;
  description: string;
  websiteUrl: string;
  promoCode: string;
  discountType: "%" | "£";
  discountValue: string;
  keyMessage: string;
  mustMention: string;
  mustAvoid: string;
  bannerFile: File | null;
  bannerUrl: string;
  agreedToPolicy: boolean;
  // Meta
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  creatorIds: string[];
}

export function BusinessCreateCampaign() {
  const navigate = useNavigate();
  const { id: editCampaignId } = useParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    campaignType: "",
    promotingCategory: "",
    businessName: "",
    description: "",
    websiteUrl: "",
    promoCode: "",
    discountType: "%",
    discountValue: "",
    keyMessage: "",
    mustMention: "",
    mustAvoid: "",
    bannerFile: null,
    bannerUrl: "",
    agreedToPolicy: false,
    name: "",
    budget: 0,
    start_date: "",
    end_date: "",
    creatorIds: [],
  });

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) { toast.error("Failed to load business profile"); return; }
      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.name || "Your Business");
        setFormData(prev => ({ ...prev, businessName: data.name || "" }));
      } else {
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user]);

  const update = (updates: Partial<CampaignFormData>) =>
    setFormData(prev => ({ ...prev, ...updates }));

  const handleSubmit = async (): Promise<string | undefined> => {
    if (!businessId) { toast.error("Business profile not found"); return; }
    setLoading(true);
    try {
      // Upload banner if provided
      let bannerUrl = formData.bannerUrl;
      if (formData.bannerFile) {
        const ext = formData.bannerFile.name.split(".").pop();
        const path = `banners/${businessId}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("campaign-assets")
          .upload(path, formData.bannerFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("campaign-assets").getPublicUrl(path);
          bannerUrl = urlData.publicUrl;
        }
      }

      const campaignName = formData.businessName
        ? `${formData.businessName} — ${formData.campaignType}`
        : businessName;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          business_id: businessId,
          name: campaignName,
          type: formData.campaignType,
          description: formData.description,
          budget: formData.budget,
          status: "pending_review",
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          streams_required: 4,
          banner_url: bannerUrl || null,
          instructions: [
            formData.keyMessage && `Key message: ${formData.keyMessage}`,
            formData.mustMention && `Must mention: ${formData.mustMention}`,
            formData.mustAvoid && `Must avoid: ${formData.mustAvoid}`,
          ].filter(Boolean).join("\n") || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      if (formData.promoCode) {
        const { error: promoError } = await supabase
          .from("promo_codes")
          .insert({
            campaign_id: campaign.id,
            business_id: businessId,
            code: formData.promoCode.toUpperCase(),
            discount_type: formData.discountType === "%" ? "percentage" : "fixed_amount",
            discount_value: parseFloat(formData.discountValue) || 0,
            usage_limit: null,
            expires_at: null,
            instructions: formData.keyMessage,
            goal: "sales",
          });
        if (promoError) throw promoError;
      }

      // Notify admins
      const { data: adminRows } = await supabase.from("admins").select("user_id");
      if (adminRows?.length) {
        await supabase.from("notifications").insert(
          adminRows.map(admin => ({
            user_id: admin.user_id,
            type: "campaign_pending",
            title: "New Campaign Pending Approval",
            message: `${campaignName} by ${businessName} needs review.`,
            data: { campaign_id: campaign.id },
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        );
      }

      toast.success("Campaign submitted for review!");
      navigate("/business/dashboard");
      return campaign.id;
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["Campaign Type", "Campaign Brief", "Confirm & Pay"];

  return (
    <div className="min-h-screen bg-white pb-24 max-w-[480px] mx-auto">
      <AppHeader
        showBack
        backPath={step === 1 ? "/business/dashboard" : undefined}
        onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
        title={step === 3 ? "Confirm & Pay" : step === 2 ? "Campaign Brief" : "Create Campaign"}
        userType="business"
      />

      {/* Step indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1 mb-1.5">
          {stepTitles.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 transition-colors ${
                step > i ? "bg-[#1D1D1D]" : step === i + 1 ? "bg-[#1D1D1D]" : "bg-[#1D1D1D]/15"
              }`}
            />
          ))}
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 text-right italic">
          Step {step} of {stepTitles.length}
        </p>
      </div>

      {step === 1 && (
        <CampaignTypeStep
          selected={formData.campaignType}
          onSelect={type => update({ campaignType: type })}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <CampaignBriefStep
          data={formData}
          update={update}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <CampaignConfirmPayStep
          data={formData}
          businessName={businessName}
          loading={loading}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
