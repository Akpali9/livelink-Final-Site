import React from "react";
import { useNavigate, Link } from "react-router";
import { 
  X, 
  RefreshCcw, 
  Search, 
  UserPlus, 
  ChevronRight, 
  AlertTriangle,
  CreditCard,
  ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function CampaignDeclined() {
  const navigate = useNavigate();
  const creatorName = "Jordan Plays";
  const isExpired = false; // Toggle this to test different states

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <AppHeader showBack title="Declined" />
      
      <main className="flex-1 flex flex-col items-center justify-center px-8 pt-12">
        {/* Centered Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-[#1D1D1D]/5 rounded-none flex items-center justify-center border-4 border-[#1D1D1D]/10">
            <X className="w-10 h-10 text-[#1D1D1D]/20" />
          </div>
        </motion.div>

        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2 text-center leading-tight">
          Campaign Not Accepted
        </h1>
        <p className="text-sm text-[#1D1D1D]/40 mb-12 text-center font-medium italic">
          {isExpired 
            ? "Your campaign request expired after 3 days with no response from the creator."
            : `${creatorName} has declined your campaign request.`
          }
        </p>

        {/* Refund Confirmation Card */}
        <section className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 mb-12 rounded-none relative">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-white border border-[#1D1D1D]/10 mb-6">
              <RefreshCcw className="w-6 h-6 text-[#389C9A]" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-tight italic mb-4">Your Refund</h2>
            <p className="text-[10px] font-bold uppercase tracking-tight italic opacity-60 leading-relaxed mb-6">
              Your held payment of £240 will be returned to your original payment method within 3 to 5 business days. No charges have been applied.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#389C9A] text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[8px] font-black uppercase italic tracking-widest">Refund Initiated</span>
            </div>
          </div>
        </section>

        {/* Suggestion Section */}
        <section className="w-full">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-[#1D1D1D]/40 italic text-center">What Would You Like to Do?</h2>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate("/browse")}
              className="flex items-center justify-between p-6 bg-white border-2 border-[#1D1D1D] active:bg-[#F8F8F8] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center text-[#FEDB71]">
                  <Search className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-tight italic">Find Another Creator</p>
                  <p className="text-[8px] font-bold uppercase opacity-40 italic">Browse creators in the same niche</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#389C9A] group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => navigate("/browse")}
              className="flex items-center justify-between p-6 bg-white border-2 border-[#1D1D1D] active:bg-[#F8F8F8] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center text-[#FEDB71]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-tight italic">Send to a Different Creator</p>
                  <p className="text-[8px] font-bold uppercase opacity-40 italic">Use the same campaign details</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#389C9A] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        <Link to="/business/dashboard" className="mt-12 text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] underline transition-colors italic">
          Back to Dashboard
        </Link>
      </main>
    </div>
  );
}
