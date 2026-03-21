import React from "react";
import { ImageWithFallback } from "./ImageWithFallback";
import { CheckCircle2 } from "lucide-react";

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avg_viewers?: number;
  rating?: number;
}

interface Props {
  creators: Creator[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}

export function CreatorSelector({ creators, selectedIds, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {creators.map((creator) => {
        const isSelected = selectedIds.includes(creator.id);
        return (
          <button
            key={creator.id}
            onClick={() => onSelect(creator.id)}
            className={`relative bg-white border-2 p-4 flex items-center gap-4 text-left transition-all rounded-xl ${
              isSelected
                ? "border-[#389C9A] bg-[#389C9A]/5"
                : "border-[#1D1D1D]/10 hover:border-[#389C9A]"
            }`}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#1D1D1D]/10">
              <ImageWithFallback
                src={creator.avatar_url || "https://via.placeholder.com/100"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-sm uppercase tracking-tight">{creator.full_name}</h4>
              {creator.avg_viewers !== undefined && (
                <p className="text-[9px] opacity-40">~{creator.avg_viewers} avg viewers</p>
              )}
            </div>
            {isSelected && (
              <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />
            )}
          </button>
        );
      })}
      {creators.length === 0 && (
        <p className="text-center text-gray-400 py-8">No creators found</p>
      )}
    </div>
  );
}
