import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Tag, 
  Tv, 
  PoundSterling as Pound, 
  Info, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle, 
  ChevronRight, 
  RefreshCcw,
  X,
  FileText,
  Flag,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";

export function BusinessCampaignDetail() {
  const navigate = useNavigate();
  const { campaignId, creatorId } = useParams();
  const [selectedProof, setSelectedProof] = useState<number | null>(null);

  // In a real app we'd fetch based on campaignId and creatorId
  const campaign = {
    id: "1",
    name: "Summer Sale Blast",
    creator: "Alex Rivers",
    creatorAvatar: "https://images.unsplash.com/photo-1758179759979-c0c2235ae172?w=100&h=100&fit=crop",
    status: "ACTIVE",
    completedStreams: 6,
    totalStreams: 12,
    startDate: "24 Feb 2026",
    endDate: "24 Mar 2026",
    package: "Silver — 12 Streams",
    type: "Banner + Promo Code",
    totalBudget: 252.00,
    releasedSoFar: 126.00,
    remainingHeld: 126.00,
    promoCode: "ALEX-STREAM-20",
    bannerImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=200&fit=crop",
    lastMessage: {
      text: "The banner looks great on the stream, I'll be live again tomorrow...",
      time: "2h ago"
    }
  };

  const streams = Array.from({ length: 12 }, (_, i) => {
    const streamNum = i + 1;
    let status: "Verified" | "Awaiting Proof" | "Upcoming" = "Upcoming";
    let date = "TBC";
    let duration = "";

    if (streamNum <= 6) {
      status = "Verified";
      date = "24 Feb 2026"; 
      duration = "1h 15mins";
    } else if (streamNum === 7) {
      status = "Awaiting Proof";
      date = "Today";
    }

    return { id: streamNum, num: streamNum, date, duration, status };
  });

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24">
      <AppHeader showBack backPath={`/business/campaign/${campaignId}`} title="Creator Breakdown" />
      <main className="flex-1">
        <section className="px-6 py-8 border-b-2 border-[#1D1D1D]">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-[#1D1D1D] overflow-hidden">
                <ImageWithFallback src={campaign.creatorAvatar} className="w-full h-full object-cover grayscale" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-1">{campaign.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#389C9A] italic">{campaign.creator}</p>
              </div>
            </div>
            <div className="bg-[#389C9A] text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 italic">{campaign.status}</div>
          </div>
          <div className="space-y-3">
            <div className="h-1 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "50%" }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-[#389C9A]" />
            </div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest italic opacity-40">
              <span>Stream {campaign.completedStreams} of {campaign.totalStreams} completed</span>
              <span>50% complete</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Campaign Overview</h3>
          <div className="grid grid-cols-2 gap-[2px] bg-[#1D1D1D]/10 border border-[#1D1D1D]/10">
            {[
              { icon: Calendar, label: "Start Date", val: campaign.startDate },
              { icon: Calendar, label: "End Date", val: campaign.endDate },
              { icon: Tag, label: "Package", val: campaign.package },
              { icon: Tv, label: "Campaign Type", val: campaign.type },
              { icon: Pound, label: "Total Budget", val: `£${campaign.totalBudget.toFixed(2)}` },
              { icon: Pound, label: "Released So Far", val: `£${campaign.releasedSoFar.toFixed(2)}` },
            ].map((tile, i) => (
              <div key={i} className="bg-white p-5 flex items-start gap-4">
                <tile.icon className="w-4 h-4 mt-0.5 text-[#389C9A]" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1 italic">{tile.label}</p>
                  <p className="text-[10px] font-black uppercase tracking-tight italic">{tile.val}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Stream Log</h3>
          <div className="flex flex-col gap-4">
            {streams.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-5 flex items-center justify-between group">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black uppercase italic tracking-tight">Stream {stream.num}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">{stream.date}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                    stream.status === 'Verified' ? 'bg-[#389C9A] text-white border-[#389C9A]' :
                    stream.status === 'Awaiting Proof' ? 'bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10' : 'bg-white text-[#1D1D1D]/20 border-[#1D1D1D]/10'
                  }`}>
                    {stream.status === 'Verified' ? '✓ Verified' : stream.status === 'Awaiting Proof' ? '⏳ Awaiting Proof' : 'Upcoming'}
                  </div>
                  {stream.status === 'Verified' && (
                    <button onClick={() => setSelectedProof(stream.num)} className="text-[8px] font-black uppercase tracking-widest text-[#389C9A] underline italic">View Proof</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-8 italic">Communication</h3>
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <Link to="/messages" className="w-full flex items-center justify-center gap-3 p-5 bg-[#F8F8F8] border border-[#1D1D1D]/10 text-[10px] font-black uppercase tracking-widest italic hover:bg-[#1D1D1D] hover:text-white transition-all">
              <MessageSquare className="w-4 h-4 text-[#389C9A]" />
              Message {campaign.creator}
            </Link>
          </div>
        </section>
      </main>
      <BottomNav />

      <AnimatePresence>
        {selectedProof && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProof(null)} className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[32px] max-w-[480px] mx-auto overflow-hidden border-t-4 border-[#1D1D1D]">
              <div className="w-12 h-1 bg-[#1D1D1D]/10 mx-auto mt-4 rounded-full" />
              <div className="p-8 text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Stream Proof — Stream {selectedProof}</h3>
                <div className="mb-8 border-2 border-[#1D1D1D] aspect-video bg-black overflow-hidden">
                  <ImageWithFallback src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop" className="w-full h-full object-cover grayscale opacity-80" />
                </div>
                <button onClick={() => setSelectedProof(null)} className="w-full py-6 bg-[#1D1D1D] text-white font-black uppercase tracking-widest italic active:scale-[0.98] transition-all">Close</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
