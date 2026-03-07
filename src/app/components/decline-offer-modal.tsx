import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertCircle, ChevronDown } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface DeclineOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  offerDetails: {
    partnerName: string;
    offerName: string;
    campaignType: string;
    amount: string;
    logo: string;
    partnerType: "Business" | "Creator";
  };
}

export function DeclineOfferModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  offerDetails 
}: DeclineOfferModalProps) {
  const [reason, setReason] = useState("");
  
  const declineReasons = [
    "Schedule conflict",
    "Budget does not meet my requirements",
    "Brand is not a good fit for my content",
    "Campaign requirements too demanding",
    "Already working with a similar brand",
    "Other"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" 
          />
          
          {/* Modal Card */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[400px] bg-white border-2 border-[#1D1D1D] rounded-none shadow-none overflow-hidden"
          >
            <div className="p-8">
              {/* Top Section */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-red-50 flex items-center justify-center mb-6 border border-red-100">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Decline This Offer?</h2>
                <p className="text-[11px] font-medium leading-relaxed italic opacity-60 px-4">
                  Are you sure you want to decline this offer from {offerDetails.partnerName}? This action cannot be undone.
                </p>
              </div>

              {/* Offer Summary Strip */}
              <div className="bg-[#F8F8F8] border-y border-[#1D1D1D]/10 p-4 -mx-8 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[#1D1D1D]/10 bg-white shrink-0 overflow-hidden">
                    <ImageWithFallback src={offerDetails.logo} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-tight italic truncate max-w-[120px]">
                      {offerDetails.offerName}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 italic">
                      {offerDetails.campaignType}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black italic text-[#389C9A]">
                    {offerDetails.amount}
                  </span>
                </div>
              </div>

              {/* Decline Reason (Optional) */}
              <div className="space-y-4 mb-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">
                    Reason for declining (optional)
                  </label>
                  <div className="relative">
                    <select 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-white border-2 border-[#1D1D1D] p-4 text-[11px] font-black uppercase tracking-widest outline-none appearance-none rounded-none italic pr-12 cursor-pointer"
                    >
                      <option value="" disabled>Select a reason</option>
                      {declineReasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A] pointer-events-none" />
                  </div>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/30 italic leading-relaxed">
                  This helps us improve matches for you in the future. You will not be penalised for declining.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => onConfirm(reason)}
                  className="w-full py-5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-[0.2em] italic active:scale-[0.98] transition-all border-2 border-[#1D1D1D]"
                >
                  Yes, Decline Offer
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-white border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-[0.2em] italic active:bg-[#F8F8F8] transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
