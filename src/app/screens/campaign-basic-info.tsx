import React from "react";
import { toast } from "sonner";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  updateData: (updates: Partial<CampaignFormData>) => void;
  onNext: () => void;
}

export function CampaignBasicInfo({ data, updateData, onNext }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name || !data.type || data.budget <= 0) {
      toast.error("Please fill all required fields (name, type, budget > 0)");
      return;
    }
    onNext();
  };

  return (
    <div className="px-4 space-y-6 pb-8">
      <form onSubmit={handleSubmit}>
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

        <div className="mb-4">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">
            Total Budget (₦) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={data.budget || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateData({ budget: isNaN(val) ? 0 : Math.max(0, val) });
            }}
            min="0"
            step="1000"
            className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none rounded-lg"
            placeholder="50000"
          />
        </div>

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
