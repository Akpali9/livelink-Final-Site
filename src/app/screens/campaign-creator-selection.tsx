import React, { useState, useEffect } from "react";
import { CampaignFormData } from "./business-create-campaign";
import { CreatorSelector } from "../components/creator-selector";
import { supabase } from "../lib/supabase";

interface Props {
  data: CampaignFormData;
  updateData: (updates: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CampaignCreatorSelection({ data, updateData, onNext, onBack }: Props) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      // ✅ CHANGE: Filter by status = 'active' instead of 'approved'
      const { data: profiles, error } = await supabase
        .from("creator_profiles")
        .select("id, full_name, avatar_url, avg_viewers, rating")
        .eq("status", "active");   // or "active" if that's the correct field
      if (error) console.error(error);
      else setCreators(profiles || []);
      setLoading(false);
    };
    fetchCreators();
  }, []);

  const handleSelect = (creatorId: string) => {
    const newIds = data.creatorIds.includes(creatorId)
      ? data.creatorIds.filter((id) => id !== creatorId)
      : [...data.creatorIds, creatorId];
    updateData({ creatorIds: newIds });
  };

  const handleNext = () => {
    if (data.creatorIds.length === 0) {
      alert("Please select at least one creator");
      return;
    }
    onNext();
  };

  return (
    <div className="px-4 space-y-6 pb-8">
      <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-4">
        Select Creators
      </h2>
      <p className="text-[10px] text-[#1D1D1D]/50 mb-4">
        Choose the creators who will participate in this campaign.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
        </div>
      ) : (
        <CreatorSelector
          creators={creators}
          selectedIds={data.creatorIds}
          onSelect={handleSelect}
        />
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
