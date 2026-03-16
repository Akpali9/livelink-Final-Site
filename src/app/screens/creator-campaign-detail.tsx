import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Calendar, 
  Video as VideoIcon, 
  Tag, 
  PoundSterling as Pound, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Download,
  MessageSquare,
  X,
  Upload,
  Check,
  ChevronRight,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";

type StreamStatus = "Verified" | "Under Review" | "Upload Required";

interface StreamUpdate {
  id: number;
  number: number;
  status: StreamStatus;
  date: string;
  duration: string;
}

export function CreatorCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [streamUpdates, setStreamUpdates] = useState<StreamUpdate[]>([
    { id: 1, number: 1, status: "Verified", date: "24 Feb 2026", duration: "1h 12mins" },
    { id: 2, number: 2, status: "Under Review", date: "26 Feb 2026", duration: "58mins" },
    { id: 3, number: 3, status: "Upload Required", date: "28 Feb 2026", duration: "Not yet streamed" },
  ]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamUpdate | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStream) {
      setStreamUpdates(prev => prev.map(s => 
        s.id === selectedStream.id ? { ...s, status: "Under Review" } : s
      ));
      setIsUploadModalOpen(false);
      toast.success("Stream proof submitted! We'll verify within 24 hours.");
    }
  };

  const campaign = {
    id: "1",
    business: "CloudSaaS",
    name: "API Tool Promo",
    status: "Active",
    type: "Banner + Promo Code",
    startDate: "Feb 24, 2026",
    streamsTotal: 12,
    streamsCompleted: 4,
    pricePerPackage: 180,
    totalEarnings: 720,
    logo: "https://images.unsplash.com/photo-1644088379091-d574269d422f?w=200&h=200&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=400&fit=crop",
    promoCode: "ALEX-STREAM-20",
    description: "Promoting our new API documentation tool for developers. The banner should be placed in the bottom-left or bottom-right corner of your stream.",
    requirements: [
      "Minimum stream duration: 45 minutes",
      "Banner must be clearly visible throughout the stream",
      "Promo code must be mentioned at least once per hour",
      "No offensive content during the sponsored stream"
    ]
  };

  const progress = (campaign.streamsCompleted / campaign.streamsTotal) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Campaign Details" />
      <Toaster position="top-center" expand={false} richColors />

      <main className="max-w-[480px] mx-auto w-full pt-8">
        <div className="flex justify-center mb-8">
          <div className="bg-[#1D1D1D] text-white px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] italic">
            {campaign.status} Campaign
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-10 px-6">
          <div className="w-24 h-24 border-2 border-[#1D1D1D] bg-white p-2 mb-6">
            <ImageWithFallback src={campaign.logo} className="w-full h-full object-contain grayscale" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic mb-2">{campaign.business}</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">{campaign.name}</p>
        </div>

        <div className="px-6 mb-8">
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Streams Progress</p>
                <h3 className="text-2xl font-black italic">{campaign.streamsCompleted} / {campaign.streamsTotal}</h3>
              </div>
              <p className="text-lg font-black italic text-[#389C9A]">£{((campaign.streamsCompleted / campaign.streamsTotal) * campaign.totalEarnings).toFixed(2)}</p>
            </div>
            
            <div className="h-2 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-[#389C9A]"
              />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 text-center italic">
              {Math.round(progress)}% of campaign completed
            </p>
          </div>
        </div>

        <div className="px-6 mb-8">
          <div className="grid grid-cols-2 gap-[1px] bg-[#1D1D1D] border border-[#1D1D1D]">
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Total Budget</span>
              <span className="text-sm font-black italic">£{campaign.totalEarnings}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Promo Code</span>
              <span className="text-sm font-black text-[#389C9A] tracking-tighter italic">{campaign.promoCode}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Start Date</span>
              <span className="text-sm font-black italic">{campaign.startDate}</span>
            </div>
            <div className="bg-white p-6">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-1">Type</span>
              <span className="text-sm font-black italic">Banner + Code</span>
            </div>
          </div>
        </div>

        <div className="px-6 mb-12">
          <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 italic">Active Asset</h4>
          <div className="relative group">
            <div className="aspect-video border-2 border-[#1D1D1D] bg-black overflow-hidden relative">
              <ImageWithFallback src={campaign.bannerUrl} className="w-full h-full object-cover opacity-60 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-white p-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all">
                  <Download className="w-4 h-4 text-[#FEDB71]" /> Download Banner
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 mb-12 py-12 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-40 italic">Stream Updates</h4>
          <div className="flex flex-col gap-4">
            {streamUpdates.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm uppercase italic">Stream {stream.number}</span>
                  <div className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                    stream.status === "Verified" ? "bg-[#389C9A] text-white border-[#389C9A]" :
                    stream.status === "Under Review" ? "bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10" :
                    "bg-white text-[#1D1D1D]/20 border-[#1D1D1D]/10"
                  }`}>
                    {stream.status === "Verified" ? "✓ Verified" : 
                     stream.status === "Under Review" ? "⏳ Under Review" : 
                     "Upload Required"}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{stream.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{stream.duration}</span>
                  </div>
                </div>

                {stream.status === "Upload Required" && (
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        setSelectedStream(stream);
                        setIsUploadModalOpen(true);
                      }}
                      className="w-full bg-[#1D1D1D] text-white p-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic border-2 border-[#1D1D1D]"
                    >
                      <Upload className="w-4 h-4 text-[#FEDB71]" /> Upload Stream Proof
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 mb-24">
          <div className="bg-[#FEDB71]/10 p-8 border-2 border-dashed border-[#FEDB71] text-center">
            <h4 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Need Help?</h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mb-8 italic">Contact the brand representative directly.</p>
            <Link 
              to={`/messages`}
              className="w-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border-2 border-[#1D1D1D] bg-white py-5 px-8 hover:bg-[#1D1D1D] hover:text-white transition-all italic"
            >
              <MessageSquare className="w-5 h-5 text-[#389C9A]" /> Message {campaign.business}
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />

      <AnimatePresence>
        {isUploadModalOpen && selectedStream && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] max-h-[95vh] overflow-y-auto">
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              <div className="px-8 pt-4 pb-12 flex flex-col gap-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-1">Submit Proof</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">Upload a screenshot showing your viewer count and duration.</p>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-white border border-[#1D1D1D]/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-8">
                  <div className="w-full aspect-video border-2 border-dashed border-[#1D1D1D] bg-[#F8F8F8] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-[#1D1D1D] hover:text-white transition-all group p-6">
                    <Upload className="w-8 h-8 text-[#1D1D1D] group-hover:text-[#FEDB71]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Tap to upload</p>
                  </div>
                  <button type="submit" className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all">
                    Submit Stream Proof <ArrowRight className="w-6 h-6 text-[#FEDB71]" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
