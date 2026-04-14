import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Building,
  Ticket,
  Smartphone,
  Store,
  Megaphone,
  Globe,
  Upload,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Info,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";

// Categories for "What are you promoting?"
const CATEGORIES = [
  { id: "product", icon: ShoppingBag, label: "Product" },
  { id: "service", icon: Building, label: "Service" },
  { id: "event", icon: Ticket, label: "Event" },
  { id: "app", icon: Smartphone, label: "App or Software" },
  { id: "location", icon: Store, label: "Physical Location" },
  { id: "awareness", icon: Megaphone, label: "Brand Awareness" },
];

export function CampaignCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { user } = useAuth();
  const campaignData = location.state;

  // Determine if we're editing an existing campaign
  const isEditMode = !!campaignId;
  const [loadingCampaign, setLoadingCampaign] = useState(isEditMode);

  // Get campaign details from previous screen (or defaults) - used only in creation
  const campaignTypeFromState = campaignData?.campaignType || "banner";
  const bidAmount = parseInt(campaignData?.bidAmount || "25");
  const creatorCount = campaignData?.creatorCount || 1;

  // For edit mode, we'll store the actual campaign type from DB
  const [campaignType, setCampaignType] = useState(campaignTypeFromState);

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    campaignName: campaignData?.campaignName || "",
    businessName: "",
    businessOffer: "",
    websiteUrl: "",
    keyMessage: "",
    mustMention: "",
    mustAvoid: "",
    bannerFile: null as string | null,
    agreePolicy: false,
    agreeTerms: false,
    agreeFee: false,
  });

  // Promo code state (for campaigns that include promo)
  const [promoCodeData, setPromoCodeData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 20,
    usageLimit: null as number | null,
    expiresAt: null as string | null,
    instructions: "",
    goal: "sales",
    offerDuration: "30",
  });

  // Card details state (only for create mode)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals (only relevant for create mode)
  const subtotal = bidAmount * creatorCount;
  const serviceFee = subtotal * 0.08;
  const totalHeld = subtotal + serviceFee;

  // Validation flags for create mode
  const canContinueToPayment =
    selectedCategory &&
    formData.campaignName &&
    formData.businessName &&
    formData.businessOffer &&
    formData.websiteUrl &&
    formData.keyMessage &&
    formData.bannerFile &&
    formData.agreePolicy;

  const canConfirmPayment = formData.agreeTerms && formData.agreeFee;

  // Validate card details (create mode only)
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

  // Fetch existing campaign data for edit mode
  useEffect(() => {
    if (!isEditMode || !user) return;

    const fetchCampaign = async () => {
      try {
        // 1. Get business ID for current user
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (businessError || !business) {
          toast.error("Business profile not found");
          navigate("/become-business");
          return;
        }

        // 2. Fetch campaign
        const { data: campaign, error: campaignError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaignId)
          .eq("business_id", business.id)
          .single();

        if (campaignError) throw campaignError;

        // 3. Set campaign type from DB
        let dbCampaignType = "banner";
        if (campaign.type === "Banner + Promo Code") dbCampaignType = "banner-promo";
        else if (campaign.type === "Promo Code Only") dbCampaignType = "promo-only";
        setCampaignType(dbCampaignType);

        // 4. Populate form state
        setSelectedCategory(campaign.category || "product");
        setFormData({
          campaignName: campaign.name || "",
          businessName: campaign.business_name || "",
          businessOffer: campaign.business_offer || "",
          websiteUrl: campaign.website_url || "",
          keyMessage: campaign.description || "",
          mustMention: campaign.must_mention || "",
          mustAvoid: campaign.must_avoid || "",
          bannerFile: campaign.banner_url || null,
          agreePolicy: true, // Already agreed when created
          agreeTerms: true,
          agreeFee: true,
        });

        // 5. Fetch promo code if applicable
        if (dbCampaignType === "banner-promo" || dbCampaignType === "promo-only") {
          const { data: promo } = await supabase
            .from("promo_codes")
            .select("*")
            .eq("campaign_id", campaign.id)
            .maybeSingle();

          if (promo) {
            setPromoCodeData({
              code: promo.code || "",
              discountType: promo.discount_type || "percentage",
              discountValue: promo.discount_value || 20,
              usageLimit: promo.usage_limit,
              expiresAt: promo.expires_at,
              instructions: promo.instructions || "",
              goal: promo.goal || "sales",
              offerDuration: promo.offer_duration || "30",
            });
          }
        }
      } catch (error: any) {
        console.error("Error fetching campaign:", error);
        toast.error(error.message || "Failed to load campaign");
        navigate("/business/dashboard");
      } finally {
        setLoadingCampaign(false);
      }
    };

    fetchCampaign();
  }, [isEditMode, campaignId, user, navigate]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "video/mp4"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, GIF, or MP4 files only.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `campaign-banners/${user?.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("campaign-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(percent);
          },
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("campaign-assets").getPublicUrl(filePath);

      setFormData({ ...formData, bannerFile: publicUrl });
      toast.success("Banner uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload banner. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Update existing campaign (edit mode)
  const handleUpdate = async () => {
    if (!selectedCategory || !formData.campaignName || !formData.businessName ||
        !formData.businessOffer || !formData.websiteUrl || !formData.keyMessage) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      // Get business ID
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (businessError || !businessData) {
        toast.error("Business profile not found");
        navigate("/become-business");
        setSubmitting(false);
        return;
      }

      // Update campaign
      const { error: campaignError } = await supabase
        .from("campaigns")
        .update({
          name: formData.campaignName,
          category: selectedCategory,
          business_name: formData.businessName,
          business_offer: formData.businessOffer,
          website_url: formData.websiteUrl,
          description: formData.keyMessage,
          must_mention: formData.mustMention,
          must_avoid: formData.mustAvoid,
          banner_url: formData.bannerFile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (campaignError) throw campaignError;

      // Update promo code if campaign type includes promo
      if (campaignType === "banner-promo" || campaignType === "promo-only") {
        const { data: existingPromo } = await supabase
          .from("promo_codes")
          .select("id")
          .eq("campaign_id", campaignId)
          .maybeSingle();

        if (existingPromo) {
          await supabase
            .from("promo_codes")
            .update({
              code: promoCodeData.code,
              discount_type: promoCodeData.discountType,
              discount_value: promoCodeData.discountValue,
              usage_limit: promoCodeData.usageLimit,
              expires_at: promoCodeData.expiresAt,
              instructions: promoCodeData.instructions,
              goal: promoCodeData.goal,
              offer_duration: promoCodeData.offerDuration,
            })
            .eq("campaign_id", campaignId);
        } else if (promoCodeData.code) {
          await supabase.from("promo_codes").insert({
            campaign_id: campaignId,
            business_id: businessData.id,
            code: promoCodeData.code,
            discount_type: promoCodeData.discountType,
            discount_value: promoCodeData.discountValue,
            usage_limit: promoCodeData.usageLimit,
            expires_at: promoCodeData.expiresAt,
            instructions: promoCodeData.instructions,
            goal: promoCodeData.goal,
            offer_duration: promoCodeData.offerDuration,
          });
        }
      }

      toast.success("Campaign updated successfully!");
      navigate(`/business/campaign/overview/${campaignId}`);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update campaign");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit new campaign (create mode)
  const handleSubmit = async () => {
    if (!validateCard()) {
      toast.error("Please check your card details");
      return;
    }

    if (!canConfirmPayment) {
      toast.error("Please agree to the terms");
      return;
    }

    setSubmitting(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get business ID for the current user
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (businessError || !businessData) {
      toast.error("Business profile not found. Please complete your business registration.");
      navigate("/become-business");
      setSubmitting(false);
      return;
    }

    try {
      // Insert campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          business_id: businessData.id,
          name: formData.campaignName,
          type: campaignType === "banner"
            ? "Banner Only"
            : campaignType === "banner-promo"
            ? "Banner + Promo Code"
            : "Promo Code Only",
          category: selectedCategory,
          business_name: formData.businessName,
          business_offer: formData.businessOffer,
          website_url: formData.websiteUrl,
          description: formData.keyMessage,
          must_mention: formData.mustMention,
          must_avoid: formData.mustAvoid,
          budget: totalHeld,
          status: "pending_review",
          start_date: null,
          end_date: null,
          streams_required: 4,
          banner_url: formData.bannerFile,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert promo code if needed
      if (campaignType === "banner-promo" || campaignType === "promo-only") {
        const { error: promoError } = await supabase
          .from("promo_codes")
          .insert({
            campaign_id: campaign.id,
            business_id: businessData.id,
            code: promoCodeData.code || "WELCOME20",
            discount_type: promoCodeData.discountType,
            discount_value: promoCodeData.discountValue,
            usage_limit: promoCodeData.usageLimit,
            expires_at: promoCodeData.expiresAt,
            instructions: promoCodeData.instructions || "Use this code at checkout",
            goal: promoCodeData.goal,
            offer_duration: promoCodeData.offerDuration,
          });
        if (promoError) throw promoError;
      }

      // Notify admins
      const { data: adminRows } = await supabase
        .from("admins")
        .select("user_id");

      if (adminRows && adminRows.length > 0) {
        await supabase.from("notifications").insert(
          adminRows.map((admin) => ({
            user_id: admin.user_id,
            type: "campaign_pending",
            title: "New Campaign Pending Approval",
            message: `${formData.campaignName} by ${businessData.name} needs review.`,
            data: { campaign_id: campaign.id },
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        );
      }

      toast.success("Payment successful! Your campaign is now under review.");
      navigate(`/business/campaign/overview/${campaign.id}`);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to create campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loadingCampaign) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
      </div>
    );
  }

  // Step 1: Campaign Brief (shared between create and edit)
  if (step === 1) {
    return (
      <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
        <AppHeader 
          showBack 
          title={isEditMode ? "Edit Campaign" : "Campaign Brief"} 
        />
        <Toaster position="top-center" richColors />

        <main className="max-w-[480px] mx-auto w-full">
          {/* STEP INDICATOR - only for create mode */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#1D1D1D]/5">
            <span className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
              {isEditMode ? "Update your campaign details" : "Tell us about your campaign"}
            </span>
            {!isEditMode && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">
                Step 2 of 3
              </span>
            )}
          </div>

          {/* SECTION 1: WHAT ARE YOU PROMOTING? */}
          <div className="px-6 py-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">
              What are you promoting?
            </h2>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-6 italic">
              Select the type of product or service you want the creator to advertise.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-6 border-2 transition-all gap-3 ${
                    selectedCategory === cat.id
                      ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                      : "bg-white border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40"
                  }`}
                >
                  <cat.icon
                    className={`w-6 h-6 ${
                      selectedCategory === cat.id ? "text-[#FEDB71]" : "text-[#1D1D1D]"
                    }`}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center italic">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: ABOUT YOUR BRAND */}
          <div className="px-6 py-10 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">
              About your brand
            </h2>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Summer Sale Blast"
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all italic"
                  value={formData.campaignName}
                  onChange={(e) =>
                    setFormData({ ...formData, campaignName: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Business Name
                </label>
                <input
                  type="text"
                  placeholder="Your trading name"
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all italic"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    What do you sell or offer?
                  </label>
                  <span className="text-[8px] font-bold opacity-30">
                    {formData.businessOffer.length}/200
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={200}
                  placeholder="In 2 to 3 sentences describe your business and what makes it worth promoting to a live audience."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.businessOffer}
                  onChange={(e) =>
                    setFormData({ ...formData, businessOffer: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Website or Landing Page URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/20" />
                  <input
                    type="text"
                    placeholder="Where should viewers go?"
                    className="w-full bg-white border border-[#1D1D1D]/10 p-4 pl-12 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all italic"
                    value={formData.websiteUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, websiteUrl: e.target.value })
                    }
                  />
                </div>
                <p className="text-[8px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                  Make sure this page is live and working before your campaign starts.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: CREATOR INSTRUCTIONS */}
          <div className="px-6 py-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">
              Creator Instructions
            </h2>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
              Be specific. The clearer your instructions the better the creator can represent your brand.
            </p>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Key Message
                  </label>
                  <span className="text-[8px] font-bold opacity-30">
                    {formData.keyMessage.length}/150
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={150}
                  placeholder="What is the one thing you want viewers to take away?"
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.keyMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, keyMessage: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Anything the creator must mention?
                  </label>
                  <span className="text-[8px] font-bold opacity-30">
                    {formData.mustMention.length}/200
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  placeholder="e.g. Mention our free next day delivery. Always show the website URL on screen."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.mustMention}
                  onChange={(e) =>
                    setFormData({ ...formData, mustMention: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Anything the creator must avoid?
                  </label>
                  <span className="text-[8px] font-bold opacity-30">
                    {formData.mustAvoid.length}/200
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  placeholder="e.g. Do not mention competitor brands."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.mustAvoid}
                  onChange={(e) =>
                    setFormData({ ...formData, mustAvoid: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: UPLOAD YOUR BANNER */}
          <div className="px-6 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">
              Upload your banner
            </h2>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
              Your banner will appear on screen during the creator's live streams. All banners are reviewed before going live.
            </p>

            <div className="flex flex-col gap-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,video/mp4"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={triggerFileInput}
                disabled={uploading}
                className="w-full aspect-[4/1] border-2 border-dashed border-[#1D1D1D]/20 bg-white flex flex-col items-center justify-center gap-2 group hover:border-[#1D1D1D] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Uploading...
                      </p>
                      <p className="text-[8px] font-bold text-[#1D1D1D]/30 uppercase tracking-tight">
                        {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[#1D1D1D]/40 group-hover:text-[#389C9A]" />
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        {formData.bannerFile ? "Replace banner" : "Tap to upload your banner"}
                      </p>
                      <p className="text-[8px] font-bold text-[#1D1D1D]/30 uppercase tracking-tight">
                        PNG, GIF or MP4 · Max 2MB · 1920 x 100px
                      </p>
                    </div>
                  </>
                )}
              </button>

              {formData.bannerFile && !uploading && (
                <div className="relative aspect-[4/1] border-2 border-[#1D1D1D] overflow-hidden bg-black group">
                  <ImageWithFallback
                    src={formData.bannerFile}
                    className="w-full h-full object-cover opacity-60 blur-[1px]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-[#1D1D1D]/80 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest italic border border-white/20">
                      Banner Preview
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, bannerFile: null })}
                    className="absolute top-2 right-2 p-1 bg-white border border-[#1D1D1D] active:scale-95 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 justify-center">
                <span className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
                  Don't have a banner yet?
                </span>
                <button className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
                  Use a template →
                </button>
              </div>

              <div className="bg-white border border-[#1D1D1D]/10 p-6 flex items-start gap-3 italic">
                <Info className="w-4 h-4 text-[#389C9A] shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-[#1D1D1D]/60 uppercase tracking-tight">
                  Our team reviews all banners within 2 hours. Banners must not contain misleading claims, competitor references or offensive content.
                </p>
              </div>
            </div>
          </div>

          {/* Promo Code Section (only for banner-promo or promo-only in edit mode, or always in create? We'll show in create as well if needed) */}
          {(isEditMode && (campaignType === "banner-promo" || campaignType === "promo-only")) && (
            <div className="px-6 py-12 border-b border-[#1D1D1D]/10">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                Promo Code Details
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., SAVE20"
                    className="w-full bg-white border border-[#1D1D1D]/10 p-3 text-sm font-medium outline-none focus:border-[#1D1D1D] italic"
                    value={promoCodeData.code}
                    onChange={(e) => setPromoCodeData({ ...promoCodeData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                      Discount Type
                    </label>
                    <select
                      className="w-full bg-white border border-[#1D1D1D]/10 p-3 text-sm font-medium outline-none focus:border-[#1D1D1D] italic"
                      value={promoCodeData.discountType}
                      onChange={(e) => setPromoCodeData({ ...promoCodeData, discountType: e.target.value })}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₦)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      placeholder="20"
                      className="w-full bg-white border border-[#1D1D1D]/10 p-3 text-sm font-medium outline-none focus:border-[#1D1D1D] italic"
                      value={promoCodeData.discountValue}
                      onChange={(e) => setPromoCodeData({ ...promoCodeData, discountValue: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                    Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="How to redeem this offer..."
                    className="w-full bg-white border border-[#1D1D1D]/10 p-3 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none italic"
                    value={promoCodeData.instructions}
                    onChange={(e) => setPromoCodeData({ ...promoCodeData, instructions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: BEFORE YOU CONTINUE - only for create mode */}
          {!isEditMode && (
            <div className="px-6 py-12">
              <div className="bg-[#1D1D1D] p-8 border-2 border-[#FEDB71] mb-8">
                <div className="flex flex-col items-center text-center gap-4 mb-8">
                  <AlertTriangle className="w-8 h-8 text-[#FEDB71]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">
                    Before you continue
                  </h3>
                </div>

                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">
                      1
                    </div>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight leading-relaxed italic">
                      Your campaign will be reviewed by our team within 24 hours before going live to creators.
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">
                      2
                    </div>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight leading-relaxed italic">
                      Payment is collected on the next screen and held securely until streams are verified.
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">
                      3
                    </div>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight leading-relaxed italic">
                      All communication must happen exclusively within the platform. Sharing contact details outside the app results in account closure and loss of funds.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      className="peer hidden"
                      checked={formData.agreePolicy}
                      onChange={(e) =>
                        setFormData({ ...formData, agreePolicy: e.target.checked })
                      }
                    />
                    <div className="w-5 h-5 border-2 border-[#FEDB71] peer-checked:bg-[#FEDB71] transition-all flex items-center justify-center">
                      {formData.agreePolicy && (
                        <CheckCircle2 className="w-4 h-4 text-[#1D1D1D]" />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-white/60 italic group-hover:text-white transition-colors">
                    I confirm my brief and all uploaded assets comply with the platform's Advertiser Policy.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="px-6 pb-12">
            {isEditMode ? (
              <button
                onClick={handleUpdate}
                disabled={submitting}
                className={`w-full py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all ${
                  !submitting
                    ? "bg-[#1D1D1D] text-white active:scale-[0.98]"
                    : "bg-[#1D1D1D]/10 text-[#1D1D1D]/20 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>Save Changes →</>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canContinueToPayment}
                  className={`w-full py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all ${
                    canContinueToPayment
                      ? "bg-[#1D1D1D] text-white active:scale-[0.98]"
                      : "bg-[#1D1D1D]/10 text-[#1D1D1D]/20 cursor-not-allowed"
                  }`}
                >
                  Continue to Payment{" "}
                  <ArrowRight
                    className={`w-6 h-6 ${
                      canContinueToPayment ? "text-[#FEDB71]" : "text-[#1D1D1D]/20"
                    }`}
                  />
                </button>
                <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest text-center mt-6 italic">
                  You will review your order and confirm payment on the next screen.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 2: PAYMENT & ORDER REVIEW (create mode only)
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      <AppHeader showBack title="Confirm & Pay" />

      <main className="max-w-[480px] mx-auto w-full">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1D1D1D]/5">
          <span className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
            Review your details and secure your campaign
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">
            Step 3 of 3
          </span>
        </div>

        {/* BRIEF SUMMARY CARD */}
        <div className="px-6 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">
              Campaign Brief
            </h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Campaign Name
                </span>
                <span className="text-[10px] font-black uppercase text-right max-w-[180px]">
                  {formData.campaignName}
                </span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Campaign Type
                </span>
                <span className="text-[10px] font-black uppercase">
                  {campaignType === "banner"
                    ? "Banner Only"
                    : campaignType === "banner-promo"
                    ? "Banner + Promo Code"
                    : "Promo Code Only"}
                </span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Promoting
                </span>
                <span className="text-[10px] font-black uppercase">
                  {selectedCategory?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Business
                </span>
                <span className="text-[10px] font-black uppercase text-right max-w-[180px]">
                  {formData.businessName}
                </span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Number of Creators
                </span>
                <span className="text-[10px] font-black uppercase">
                  {creatorCount}
                </span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Banner
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-4 bg-black border border-[#1D1D1D]/10 overflow-hidden">
                    <ImageWithFallback
                      src={formData.bannerFile || ""}
                      className="w-full h-full object-cover grayscale opacity-60"
                    />
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(1)}
                className="text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 underline italic hover:text-[#1D1D1D] transition-colors"
              >
                Edit Brief →
              </button>
            </div>
          </div>
        </div>

        {/* ORDER SUMMARY CARD */}
        <div className="px-6 pb-8">
          <div className="bg-[#1D1D1D] p-8 text-white border-2 border-[#1D1D1D]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-white/40 italic">
              Order Summary
            </h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Campaign Type
                </span>
                <span className="text-[11px] font-black uppercase">
                  {campaignType === "banner"
                    ? "Banner Only"
                    : campaignType === "banner-promo"
                    ? "Banner + Promo Code"
                    : "Promo Code Only"}
                </span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Bid per 4 Streams
                </span>
                <span className="text-sm font-black italic">
                  ₦{bidAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Number of Creators
                </span>
                <span className="text-sm font-black italic">{creatorCount}</span>
              </div>

              <div className="h-px bg-white/10 w-full" />

              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                  Subtotal
                </span>
                <span className="text-sm font-black italic">
                  ₦{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-start italic">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#FEDB71]">
                    Service Fee (8%)
                  </span>
                  <span className="text-[7px] font-bold opacity-30 uppercase tracking-widest max-w-[150px] leading-tight mt-1">
                    Payment processing, verification & support
                  </span>
                </div>
                <span className="text-sm font-black italic text-[#FEDB71]">
                  ₦{serviceFee.toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-white/10 w-full" />

              <div className="flex justify-between items-center italic pt-2">
                <span className="text-[12px] font-black uppercase tracking-widest">
                  Total Held Today
                </span>
                <span className="text-3xl font-black italic text-[#FEDB71]">
                  ₦{totalHeld.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-[8px] font-medium opacity-30 italic uppercase leading-relaxed text-center">
              Released to creators per verified stream cycle. Full refund guaranteed if no creators match or streams are not completed.
            </p>
          </div>
        </div>

        {/* SERVICE FEE EXPLANATION BOX */}
        <div className="px-6 pb-12">
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-5 h-5 text-[#389C9A]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic">
                About the Service Fee
              </h4>
            </div>

            <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic mb-6">
              An 8% service fee applies to all campaigns. This covers:
            </p>

            <ul className="space-y-3 mb-6">
              {[
                "Secure payment processing and holding",
                "Campaign and banner review",
                "Stream verification by our team",
                "Creator reliability monitoring",
                "Platform support for both parties",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#389C9A] mt-1">·</span>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-[#1D1D1D]/60 italic">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-tight leading-relaxed italic">
              The service fee is non-refundable once a creator accepts your campaign. If no creator accepts, your full payment including the service fee is refunded.
            </p>
          </div>
        </div>

        {/* PAYMENT METHOD SECTION - NEW CARD FORM */}
        <div className="px-6 pb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">
            Payment Method
          </h3>

          <div className="bg-white border-2 border-[#1D1D1D] p-6 space-y-5">
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
        </div>

        {/* PAYMENT PROTECTION REMINDER */}
        <div className="px-6 pb-12">
          <div className="bg-[#FFF8DC] border border-[#D2691E]/20 p-6 flex items-start gap-4 italic">
            <ShieldCheck className="w-6 h-6 text-[#D2691E] shrink-0" />
            <p className="text-[10px] font-bold text-[#D2691E] leading-relaxed uppercase tracking-tight">
              Your ₦{totalHeld.toFixed(2)} is held securely. Released only after each verified stream cycle. Full refund guaranteed if work is not completed. Service fee is refunded if no creator accepts.
            </p>
          </div>
        </div>

        {/* CHECKBOXES & CONFIRM BUTTON */}
        <div className="px-6 pb-24">
          <div className="flex flex-col gap-6 mb-10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  className="peer hidden"
                  checked={formData.agreeTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeTerms: e.target.checked })
                  }
                />
                <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                  {formData.agreeTerms && (
                    <CheckCircle2 className="w-4 h-4 text-[#FEDB71]" />
                  )}
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
                  checked={formData.agreeFee}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeFee: e.target.checked })
                  }
                />
                <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                  {formData.agreeFee && (
                    <CheckCircle2 className="w-4 h-4 text-[#FEDB71]" />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight text-[#1D1D1D]/40 italic group-hover:text-[#1D1D1D] transition-colors">
                I understand the total includes an 8% service fee. I agree that the service fee is refunded if no creator accepts and non-refundable once accepted.
              </span>
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canConfirmPayment || submitting}
            className={`w-full py-8 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all ${
              canConfirmPayment && !submitting
                ? "bg-[#1D1D1D] text-white active:scale-[0.98]"
                : "bg-[#1D1D1D]/10 text-[#1D1D1D]/20 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processing...
              </>
            ) : (
              <>Confirm & Hold ₦{totalHeld.toFixed(2)} →</>
            )}
          </button>

          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest text-center mt-6 italic max-w-[300px] mx-auto leading-relaxed">
            Your campaign goes to admin review after payment is held. It will be live to creators within 24 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
