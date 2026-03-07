import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
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
  Tag, 
  Clock, 
  Calendar, 
  Upload, 
  Lock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight,
  Info,
  CreditCard,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { toast, Toaster } from "sonner";

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
  const campaignData = location.state;

  // Get campaign details from previous screen (or defaults for testing)
  const campaignType = campaignData?.campaignType || "banner";
  const bidAmount = parseInt(campaignData?.bidAmount || "25");
  const creatorCount = campaignData?.creatorCount || 1;
  const campaignNamePrefilled = campaignData?.campaignName || "";
  
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    campaignName: campaignNamePrefilled,
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

  const handleFileUpload = () => {
    // Mock file upload
    setFormData({ ...formData, bannerFile: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=100&fit=crop" });
    toast.success("Banner uploaded successfully!");
  };

  // Calculate totals based on bid and creator count
  const subtotal = bidAmount * creatorCount;
  const serviceFee = subtotal * 0.08;
  const totalHeld = subtotal + serviceFee;

  const canContinueToPayment = 
    selectedCategory && 
    formData.campaignName &&
    formData.businessName && 
    formData.businessOffer && 
    formData.websiteUrl && 
    formData.keyMessage && 
    formData.bannerFile && 
    formData.agreePolicy;

  const canConfirmPayment = 
    formData.agreeTerms && 
    formData.agreeFee;

  if (step === 1) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
        <AppHeader showBack title="Campaign Brief" />
        <Toaster position="top-center" richColors />
        
        <main className="max-w-[480px] mx-auto w-full">
          {/* STEP INDICATOR */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#1D1D1D]/5">
            <span className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">Tell us about your campaign</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">Step 2 of 3</span>
          </div>

          {/* SECTION 1: WHAT ARE YOU PROMOTING? */}
          <div className="px-6 py-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">What are you promoting?</h2>
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
                  <cat.icon className={`w-6 h-6 ${selectedCategory === cat.id ? "text-[#FEDB71]" : "text-[#1D1D1D]"}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center italic">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: ABOUT YOUR BRAND */}
          <div className="px-6 py-10 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">About your brand</h2>
            
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Business Name</label>
                <input 
                  type="text"
                  placeholder="Your trading name"
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all italic"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">What do you sell or offer?</label>
                  <span className="text-[8px] font-bold opacity-30">{formData.businessOffer.length}/200</span>
                </div>
                <textarea 
                  rows={3}
                  maxLength={200}
                  placeholder="In 2 to 3 sentences describe your business and what makes it worth promoting to a live audience."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.businessOffer}
                  onChange={(e) => setFormData({...formData, businessOffer: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Website or Landing Page URL</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/20" />
                  <input 
                    type="text"
                    placeholder="Where should viewers go?"
                    className="w-full bg-white border border-[#1D1D1D]/10 p-4 pl-12 text-sm font-medium outline-none focus:border-[#1D1D1D] transition-all italic"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                  />
                </div>
                <p className="text-[8px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">Make sure this page is live and working before your campaign starts.</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: CREATOR INSTRUCTIONS */}
          <div className="px-6 py-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Creator Instructions</h2>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
              Be specific. The clearer your instructions the better the creator can represent your brand.
            </p>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Key Message</label>
                  <span className="text-[8px] font-bold opacity-30">{formData.keyMessage.length}/150</span>
                </div>
                <textarea 
                  rows={2}
                  maxLength={150}
                  placeholder="What is the one thing you want viewers to take away?"
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.keyMessage}
                  onChange={(e) => setFormData({...formData, keyMessage: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Anything the creator must mention?</label>
                  <span className="text-[8px] font-bold opacity-30">{formData.mustMention.length}/200</span>
                </div>
                <textarea 
                  rows={2}
                  maxLength={200}
                  placeholder="e.g. Mention our free next day delivery. Always show the website URL on screen."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.mustMention}
                  onChange={(e) => setFormData({...formData, mustMention: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">Anything the creator must avoid?</label>
                  <span className="text-[8px] font-bold opacity-30">{formData.mustAvoid.length}/200</span>
                </div>
                <textarea 
                  rows={2}
                  maxLength={200}
                  placeholder="e.g. Do not mention competitor brands."
                  className="w-full bg-white border border-[#1D1D1D]/10 p-4 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic"
                  value={formData.mustAvoid}
                  onChange={(e) => setFormData({...formData, mustAvoid: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: UPLOAD YOUR BANNER */}
          <div className="px-6 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Upload your banner</h2>
            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">
              Your banner will appear on screen during the creator's live streams. All banners are reviewed before going live.
            </p>

            <div className="flex flex-col gap-6">
              <button 
                onClick={handleFileUpload}
                className="w-full aspect-[4/1] border-2 border-dashed border-[#1D1D1D]/20 bg-white flex flex-col items-center justify-center gap-2 group hover:border-[#1D1D1D] transition-all cursor-pointer"
              >
                <Upload className="w-6 h-6 text-[#1D1D1D]/40 group-hover:text-[#389C9A]" />
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest">Tap to upload your banner</p>
                  <p className="text-[8px] font-bold text-[#1D1D1D]/30 uppercase tracking-tight">PNG, GIF or MP4 · Max 2MB · 1920 x 100px</p>
                </div>
              </button>

              {formData.bannerFile && (
                <div className="relative aspect-[4/1] border-2 border-[#1D1D1D] overflow-hidden bg-black group">
                  <ImageWithFallback src={formData.bannerFile} className="w-full h-full object-cover opacity-60 blur-[1px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-[#1D1D1D]/80 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest italic border border-white/20">
                      Banner Preview
                    </div>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, bannerFile: null})}
                    className="absolute top-2 right-2 p-1 bg-white border border-[#1D1D1D] active:scale-95 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 justify-center">
                <span className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">Don't have a banner yet?</span>
                <button className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline italic">Use a template →</button>
              </div>

              <div className="bg-white border border-[#1D1D1D]/10 p-6 flex items-start gap-3 italic">
                <Info className="w-4 h-4 text-[#389C9A] shrink-0" />
                <p className="text-[9px] font-bold leading-relaxed text-[#1D1D1D]/60 uppercase tracking-tight">
                  Our team reviews all banners within 2 hours. Banners must not contain misleading claims, competitor references or offensive content.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 5: BEFORE YOU CONTINUE */}
          <div className="px-6 py-12">
            <div className="bg-[#1D1D1D] p-8 border-2 border-[#FEDB71] mb-8">
              <div className="flex flex-col items-center text-center gap-4 mb-8">
                <AlertTriangle className="w-8 h-8 text-[#FEDB71]" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Before you continue</h3>
              </div>
              
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight leading-relaxed italic">
                    Your campaign will be reviewed by our team within 24 hours before going live to creators.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight leading-relaxed italic">
                    Payment is collected on the next screen and held securely until streams are verified.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 bg-[#FEDB71] text-[#1D1D1D] flex items-center justify-center text-[10px] font-black shrink-0">3</div>
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
                    onChange={(e) => setFormData({...formData, agreePolicy: e.target.checked})}
                  />
                  <div className="w-5 h-5 border-2 border-[#FEDB71] peer-checked:bg-[#FEDB71] transition-all flex items-center justify-center">
                    {formData.agreePolicy && <CheckCircle2 className="w-4 h-4 text-[#1D1D1D]" />}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-white/60 italic group-hover:text-white transition-colors">
                  I confirm my brief and all uploaded assets comply with the platform's Advertiser Policy.
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setStep(2)}
                disabled={!canContinueToPayment}
                className={`w-full py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all ${
                  canContinueToPayment ? "bg-[#1D1D1D] text-white active:scale-[0.98]" : "bg-[#1D1D1D]/10 text-[#1D1D1D]/20 cursor-not-allowed"
                }`}
              >
                Continue to Payment <ArrowRight className={`w-6 h-6 ${canContinueToPayment ? "text-[#FEDB71]" : "text-[#1D1D1D]/20"}`} />
              </button>
              <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest text-center italic">
                You will review your order and confirm payment on the next screen.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 2: PAYMENT & ORDER REVIEW
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      <AppHeader showBack title="Confirm & Pay" />
      
      <main className="max-w-[480px] mx-auto w-full">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1D1D1D]/5">
          <span className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">Review your details and secure your campaign</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">Step 3 of 3</span>
        </div>

        {/* BRIEF SUMMARY CARD */}
        <div className="px-6 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">Campaign Brief</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Campaign Name</span>
                <span className="text-[10px] font-black uppercase text-right max-w-[180px]">{formData.campaignName}</span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Campaign Type</span>
                <span className="text-[10px] font-black uppercase">Banner Only</span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Promoting</span>
                <span className="text-[10px] font-black uppercase">{selectedCategory?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Business</span>
                <span className="text-[10px] font-black uppercase text-right max-w-[180px]">{formData.businessName}</span>
              </div>
              <div className="flex justify-between items-start italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Number of Creators</span>
                <span className="text-[10px] font-black uppercase">{creatorCount}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Banner</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-4 bg-black border border-[#1D1D1D]/10 overflow-hidden">
                    <ImageWithFallback src={formData.bannerFile || ""} className="w-full h-full object-cover grayscale opacity-60" />
                  </div>
                  <button onClick={() => setStep(1)} className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline">Change</button>
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-white/40 italic">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Campaign Type</span>
                <span className="text-[11px] font-black uppercase">Banner Only</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Bid per 4 Streams</span>
                <span className="text-sm font-black italic">${bidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Number of Creators</span>
                <span className="text-sm font-black italic">{creatorCount}</span>
              </div>
              
              <div className="h-px bg-white/10 w-full" />
              
              <div className="flex justify-between items-center italic">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Subtotal</span>
                <span className="text-sm font-black italic">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-start italic">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#FEDB71]">Service Fee (8%)</span>
                  <span className="text-[7px] font-bold opacity-30 uppercase tracking-widest max-w-[150px] leading-tight mt-1">
                    Payment processing, verification & support
                  </span>
                </div>
                <span className="text-sm font-black italic text-[#FEDB71]">${serviceFee.toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-white/10 w-full" />
              
              <div className="flex justify-between items-center italic pt-2">
                <span className="text-[12px] font-black uppercase tracking-widest">Total Held Today</span>
                <span className="text-3xl font-black italic text-[#FEDB71]">${totalHeld.toFixed(2)}</span>
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
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic">About the Service Fee</h4>
            </div>
            
            <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic mb-6">
              An 8% service fee applies to all campaigns. This covers:
            </p>
            
            <ul className="space-y-3 mb-6">
              {["Secure payment processing and holding", "Campaign and banner review", "Stream verification by our team", "Creator reliability monitoring", "Platform support for both parties"].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#389C9A] mt-1">·</span>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-[#1D1D1D]/60 italic">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-tight leading-relaxed italic">
              The service fee is non-refundable once a creator accepts your campaign. If no creator accepts your full payment including the service fee is refunded.
            </p>
          </div>
        </div>

        {/* PAYMENT METHOD SECTION */}
        <div className="px-6 pb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">Payment Method</h3>
          
          <div className="flex flex-col gap-4">
            <div className="bg-white border-2 border-[#1D1D1D] p-5 flex items-center justify-between group cursor-pointer hover:bg-[#F8F8F8] transition-all italic">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#F8F8F8] border border-[#1D1D1D]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#389C9A]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tight">VISA ···· 4242</p>
                  <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">EXP 04/28</p>
                </div>
              </div>
              <button className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline">Change</button>
            </div>
            
            <button className="w-full py-4 border-2 border-dashed border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic hover:border-[#1D1D1D] hover:text-[#1D1D1D] transition-all">
              + Use a different card
            </button>
          </div>
        </div>

        {/* PAYMENT PROTECTION REMINDER */}
        <div className="px-6 pb-12">
          <div className="bg-[#FFF8DC] border border-[#D2691E]/20 p-6 flex items-start gap-4 italic">
            <ShieldCheck className="w-6 h-6 text-[#D2691E] shrink-0" />
            <p className="text-[10px] font-bold text-[#D2691E] leading-relaxed uppercase tracking-tight">
              Your ${totalHeld.toFixed(2)} is held securely. Released only after each verified stream cycle. Full refund guaranteed if work is not completed. Service fee is refunded if no creator accepts.
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
                  onChange={(e) => setFormData({...formData, agreeTerms: e.target.checked})}
                />
                <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                  {formData.agreeTerms && <CheckCircle2 className="w-4 h-4 text-[#FEDB71]" />}
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
                  onChange={(e) => setFormData({...formData, agreeFee: e.target.checked})}
                />
                <div className="w-5 h-5 border-2 border-[#1D1D1D] peer-checked:bg-[#1D1D1D] transition-all flex items-center justify-center">
                  {formData.agreeFee && <CheckCircle2 className="w-4 h-4 text-[#FEDB71]" />}
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight text-[#1D1D1D]/40 italic group-hover:text-[#1D1D1D] transition-colors">
                I understand the total includes an 8% service fee. I agree that the service fee is refunded if no creator accepts and non-refundable once accepted.
              </span>
            </label>
          </div>

          <button 
            onClick={() => navigate("/business/submission-success")}
            disabled={!canConfirmPayment}
            className={`w-full py-8 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all ${
              canConfirmPayment ? "bg-[#1D1D1D] text-white active:scale-[0.98]" : "bg-[#1D1D1D]/10 text-[#1D1D1D]/20 cursor-not-allowed"
            }`}
          >
            Confirm & Hold ${totalHeld.toFixed(2)} →
          </button>
          
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest text-center mt-6 italic max-w-[300px] mx-auto leading-relaxed">
            Your campaign goes to admin review after payment is held. It will be live to creators within 24 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
