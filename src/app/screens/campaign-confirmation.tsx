import React, { useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CampaignFormData } from "./business-create-campaign";

interface Props {
  data: CampaignFormData;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  loading: boolean;
  isLastStep: boolean;
}

export function CampaignConfirmation({ data, onBack, onSubmit, loading }: Props) {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async () => {
    await onSubmit();
    setShowSuccessModal(true);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/business/campaigns?status=pending");
  };

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
          <p className="font-black">₦{Math.max(0, data.budget).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Creators</p>
          <p className="font-black">{data.creatorIds.length} creator(s) selected</p>
        </div>
        {data.promoCode && data.discountValue > 0 && (
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
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? "Creating..." : "Launch Campaign"}
        </button>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90%] bg-white z-50 p-6 rounded-xl text-center shadow-2xl border-2 border-[#1D1D1D]"
            >
              <div className="w-16 h-16 bg-[#389C9A] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Campaign Created!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your campaign has been submitted for admin approval. You'll be notified once it's live.
              </p>
              <button
                onClick={handleCloseModal}
                className="w-full bg-[#1D1D1D] text-white py-3 text-sm font-black uppercase tracking-widest rounded-xl"
              >
                Go to My Campaigns
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
