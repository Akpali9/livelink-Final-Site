// src/screens/campaign-basic-info.tsx
import React from "react";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  updateData: (updates: Partial<CampaignFormData>) => void;
  onNext: () => void;
}

export function CampaignBasicInfo({ data, updateData, onNext }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name || !data.type || !data.budget) {
      alert("Please fill all required fields");
      return;
    }
    onNext();
  };

  return (
    <div className="px-4 space-y-6 pb-8">
      <form onSubmit={handleSubmit}>
        {/* Campaign Name */}
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            placeholder="Summer Sale Blast"
          />
        </div>

        {/* Campaign Type */}
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Campaign Type <span className="text-red-500">*</span>
          </label>
          <select
            value={data.type}
            onChange={(e) => updateData({ type: e.target.value })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
          >
            <option value="">Select type</option>
            <option value="promo-only">Promo Code Only</option>
            <option value="banner+promo">Banner + Promo Code</option>
            <option value="banner-only">Banner Only</option>
          </select>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={3}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg resize-none"
            placeholder="Brief description of the campaign..."
          />
        </div>

        {/* Budget */}
        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Total Budget (₦) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={data.budget || ""}
            onChange={(e) => updateData({ budget: parseFloat(e.target.value) || 0 })}
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            placeholder="50000"
          />
        </div>

        {/* Start & End Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={data.start_date}
              onChange={(e) => updateData({ start_date: e.target.value })}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
              End Date
            </label>
            <input
              type="date"
              value={data.end_date}
              onChange={(e) => updateData({ end_date: e.target.value })}
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
