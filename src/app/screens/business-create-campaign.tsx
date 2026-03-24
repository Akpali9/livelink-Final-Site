import React, { useState } from "react";
import { Shield, Info, CreditCard, ChevronRight } from "lucide-react";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  businessName: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => Promise<string | undefined>;
}

const SERVICE_FEE_RATE = 0.08;

const TYPE_LABELS: Record<string, string> = {
  banner: "Banner Advertising",
  banner_promo: "Banner + Promo Code",
  promo_only: "Promo Code Promotion",
};

const BASE_PRICES: Record<string, number> = {
  banner: 2500,
  banner_promo: 3500,
  promo_only: 500,
};

export function CampaignConfirmPayStep({ data, businessName, loading, onBack, onSubmit }: Props) {
  const [agreedPolicy, setAgreedPolicy]     = useState(false);
  const [agreedService, setAgreedService]   = useState(false);

  const packagePrice = BASE_PRICES[data.campaignType] ?? 0;
  const serviceFee   = Math.round(packagePrice * SERVICE_FEE_RATE);
  const total        = packagePrice + serviceFee;

  const canSubmit = agreedPolicy && agreedService;

  const Row = ({ label, val, highlight }: { label: string; val: string; highlight?: boolean }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-white/10 last:border-0">
      <span className={`text-[9px] uppercase tracking-widest font-bold ${highlight ? "text-[#FEDB71]" : "text-white/50"}`}>
        {label}
      </span>
      <span className={`text-[10px] font-black uppercase text-right max-w-[55%] ${highlight ? "text-[#FEDB71]" : "text-white"}`}>
        {val}
      </span>
    </div>
  );

  return (
    <div className="px-4 pt-2 pb-10">

      {/* ── Campaign Brief summary ── */}
      <section className="border border-[#1D1D1D]/15 p-5 mb-4">
        <h2 className="text-[9px] font-black uppercase tracking-[0.25em] mb-4 text-[#1D1D1D]/50">Campaign Brief</h2>
        {[
          { label: "Promoting",     val: data.promotingCategory.replace("_", " ") },
          { label: "Business",      val: data.businessName || businessName },
          { label: "Campaign Type", val: TYPE_LABELS[data.campaignType] || data.campaignType },
          data.promoCode && { label: "Promo Code", val: `${data.promoCode} — ${data.discountValue}${data.discountType} OFF` },
        ].filter(Boolean).map((row: any) => (
          <div key={row.label} className="flex justify-between py-2 border-b border-[#1D1D1D]/8 last:border-0">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#1D1D1D]/40">{row.label}</span>
            <span className="text-[10px] font-black uppercase text-right max-w-[55%]">{row.val}</span>
          </div>
        ))}
        {data.bannerUrl && (
          <div className="flex justify-between items-center py-2">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#1D1D1D]/40">Banner</span>
            <div className="flex items-center gap-2">
              <img src={data.bannerUrl} alt="banner" className="w-12 h-7 object-cover border border-[#1D1D1D]/15" />
              <button className="text-[9px] font-black uppercase text-[#389C9A] underline">Change</button>
            </div>
          </div>
        )}
        <button
          onClick={onBack}
          className="mt-3 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/30 underline hover:text-[#1D1D1D] transition-colors"
        >
          Edit Brief
        </button>
      </section>

      {/* ── Order Summary ── */}
      <section className="bg-[#1D1D1D] text-white p-5 mb-4">
        <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-4">Order Summary</h2>
        <Row label="Package" val={TYPE_LABELS[data.campaignType] || "—"} />
        <Row label="Package Price" val={`₦${packagePrice.toLocaleString()}.00`} />
        <Row label="Subtotal" val={`₦${packagePrice.toLocaleString()}.00`} />
        <div className="flex justify-between items-start py-2.5 border-b border-white/10">
          <div>
            <span className="block text-[9px] uppercase tracking-widest font-bold text-[#FEDB71]">
              Service Fee (8%)
            </span>
            <span className="text-[7px] text-white/30 uppercase tracking-wider">
              Fraud prevention, verification & support
            </span>
          </div>
          <span className="text-[10px] font-black text-[#FEDB71]">₦{serviceFee.toLocaleString()}.00</span>
        </div>
        <div className="flex justify-between items-center pt-4">
          <span className="text-[11px] font-black uppercase tracking-widest">Total Held Today</span>
          <span className="text-[22px] font-black italic">₦{total.toLocaleString()}.00</span>
        </div>
        <p className="text-[8px] text-white/30 mt-2 leading-relaxed">
          Released to creator for verified stream cycle. Full refund guaranteed if creator declines or work is not completed.
        </p>
      </section>

      {/* ── About the service fee ── */}
      <section className="border border-[#1D1D1D]/10 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-[#1D1D1D]/40" />
          <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/60">About the Service Fee</h2>
        </div>
        <p className="text-[9px] text-[#1D1D1D]/50 mb-3">LiveLink charges an 8% service fee on all campaigns. This fee covers:</p>
        <ul className="flex flex-col gap-1.5">
          {[
            "Secure payment processing and holding",
            "Campaign and banner review",
            "Stream verification by our team",
            "Creator reliability monitoring",
            "Platform support for both parties",
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 bg-[#389C9A] flex-shrink-0" />
              <span className="text-[9px] uppercase tracking-wider font-bold text-[#1D1D1D]/50">{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-[8px] text-[#1D1D1D]/30 mt-3 leading-relaxed">
          The service fee is non-refundable once a creator accepts your campaign. If the creator declines before accepting, you receive a full payment refund including the service fee.
        </p>
      </section>

      {/* ── Payment Method ── */}
      <section className="mb-4">
        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-3">Payment Method</h2>
        <div className="border-2 border-[#1D1D1D] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-[#1D1D1D]/50" />
            <div>
              <p className="text-[10px] font-black uppercase">Visa — 4242</p>
              <p className="text-[8px] text-[#1D1D1D]/40 uppercase tracking-wider">Default</p>
            </div>
          </div>
          <button className="text-[9px] font-black uppercase text-[#389C9A] underline">Change</button>
        </div>
        <button className="w-full border border-dashed border-[#1D1D1D]/20 py-3 mt-2 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:border-[#1D1D1D]/40 transition-colors">
          + Use a different card
        </button>
      </section>

      {/* ── Security notice ── */}
      <div className="border border-[#FEDB71]/40 bg-[#FEDB71]/5 p-4 mb-6 flex items-start gap-2">
        <Shield className="w-4 h-4 text-[#FEDB71] flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
          Your payment is held securely by LiveLink. Released only after each verified stream cycle. Full refund guaranteed if creator declines or work is not completed. Service fee is refunded if creator declines before accepting.
        </p>
      </div>

      {/* ── Checkboxes ── */}
      <div className="flex flex-col gap-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPolicy}
            onChange={e => setAgreedPolicy(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#1D1D1D] flex-shrink-0"
          />
          <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
            I confirm my campaign brief and banner comply with LiveLink's Advertiser Policy.
          </p>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedService}
            onChange={e => setAgreedService(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#1D1D1D] flex-shrink-0"
          />
          <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
            I understand the total of ₦{total.toLocaleString()} includes an 8% service fee of ₦{serviceFee.toLocaleString()}. I agree that the service fee is refunded if the creator declines and non-refundable once accepted.
          </p>
        </label>
      </div>

      {/* ── Submit ── */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className={`w-full flex items-center justify-between px-6 py-5 text-[11px] font-black uppercase tracking-widest transition-all ${
          canSubmit && !loading
            ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
            : "bg-[#1D1D1D]/10 text-[#1D1D1D]/30 cursor-not-allowed"
        }`}
      >
        {loading ? "Submitting..." : `Confirm & Hold ₦${total.toLocaleString()} →`}
      </button>
      <p className="text-[8px] text-center text-[#1D1D1D]/30 uppercase tracking-wider mt-2">
        Your brief will be sent to the creator. They have 3 days to accept. Full refund including service fee if they decline.
      </p>
    </div>
  );
}
