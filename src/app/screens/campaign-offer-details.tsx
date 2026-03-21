import React from "react";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  updateData: (updates: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CampaignOfferDetails({ data, updateData, onNext, onBack }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.promoCode || data.discountValue <= 0) {
      alert("Please fill promo code and discount value > 0");
      return;
    }
    onNext();
  };

  return (
    <div className="px-4 space-y-6 pb-8">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Promo Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.promoCode}
            onChange={(e) => updateData({ promoCode: e.target.value.toUpperCase() })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg uppercase"
            placeholder="SUMMER20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
              Discount Type
            </label>
            <select
              value={data.discountType}
              onChange={(e) => updateData({ discountType: e.target.value as any })}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            >
              <option value="percentage">Percentage Off</option>
              <option value="fixed_amount">Fixed Amount Off</option>
              <option value="bogo">Buy One Get One</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
              Discount Value <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={data.discountValue || ""}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                if (data.discountType === "percentage") {
                  val = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
                } else {
                  val = Math.max(0, isNaN(val) ? 0 : val);
                }
                updateData({ discountValue: val });
              }}
              min="0"
              step={data.discountType === "percentage" ? "1" : "0.01"}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
              placeholder={data.discountType === "percentage" ? "20" : "10"}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Usage Limit
          </label>
          <select
            value={data.usageLimit ?? "Unlimited"}
            onChange={(e) => updateData({ usageLimit: e.target.value === "Unlimited" ? null : parseInt(e.target.value) })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
          >
            <option value="Unlimited">Unlimited</option>
            <option value="10">10 uses</option>
            <option value="25">25 uses</option>
            <option value="50">50 uses</option>
            <option value="100">100 uses</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Expiry Date
          </label>
          <input
            type="date"
            value={data.expiryDate || ""}
            onChange={(e) => updateData({ expiryDate: e.target.value || null })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
          />
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Instructions for Creators
          </label>
          <textarea
            value={data.instructions}
            onChange={(e) => updateData({ instructions: e.target.value })}
            rows={3}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg resize-none"
            placeholder="Any special instructions for creators..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
