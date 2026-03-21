// src/screens/campaign-confirmation.tsx
import React from "react";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  updateData: (updates: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
  isLastStep: boolean;
}

export function CampaignConfirmation({ data, onBack, onSubmit, loading }: Props) {
  return (
    <div className="px-4 space-y-6 pb-8">
      <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4">
        Review & Launch
      </h2>

      <div className="bg-[#F8F8F8] p-5 rounded-xl space-y-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Campaign Name</p>
          <p className="font-black">{data.name || "—"}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Type</p>
          <p className="font-black">{data.type || "—"}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Budget</p>
          <p className="font-black">₦{data.budget.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Creators</p>
          <p className="font-black">{data.creatorIds.length} creator(s) selected</p>
        </div>
        {data.promoCode && (
          <>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Promo Code</p>
              <p className="font-black">{data.promoCode}</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Discount</p>
              <p className="font-black">
                {data.discountValue}{data.discountType === "percentage" ? "% OFF" : " OFF"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? "Creating..." : "Launch Campaign"}
        </button>
      </div>
    </div>
  );
}
