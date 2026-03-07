import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  Star, 
  Tag, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Shield, 
  ChevronRight, 
  MessageSquare, 
  AlertTriangle, 
  Lock, 
  Flag, 
  Repeat, 
  X,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";

export function BusinessCampaignOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<any>(null);

  // Updated to show "NOT STARTED" state as per today's date (Feb 21, 2026) vs Start Date (Feb 24, 2026)
  const campaign = {
    id: id || "1",
    status: "UPCOMING",
    startDate: "24 Feb 2026",
    creator: {
      name: "JORDAN PLAYS",
      username: "@jordanplays_official",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop",
      verified: true
    },
    package: "Gold · 16 Streams",
    type: "Banner + Promo Code",
    deadline: "24 Mar 2026",
    totalValue: "£240.00",
    progress: {
      completed: 0,
      total: 16,
      percentage: 0,
      verified: 0,
      awaiting: 0,
      remaining: 16
    },
    financials: {
      total: "£240.00",
      released: "£0.00",
      remainingHeld: "£240.00"
    },
    payoutSchedule: [
      { label: "After Streams 1–4 verified", amount: "£60.00", status: "Upcoming", color: "gray" },
      { label: "After Streams 5–8 verified", amount: "£60.00", status: "Upcoming", color: "gray" },
      { label: "After Streams 9–12 verified", amount: "£60.00", status: "Upcoming", color: "gray" },
      { label: "After Streams 13–16 verified", amount: "£60.00", status: "Upcoming", color: "gray" },
    ],
    streamLog: [
      { id: 1, number: 1, date: "24 Feb 2026", duration: "Scheduled", status: "Upcoming" },
      { id: 2, number: 2, date: "26 Feb 2026", duration: "Scheduled", status: "Upcoming" },
      { id: 3, number: 3, date: "28 Feb 2026", duration: "Scheduled", status: "Upcoming" },
      { id: 4, number: 4, date: "02 Mar 2026", duration: "Scheduled", status: "Upcoming" },
      { id: 5, number: 5, date: "04 Mar 2026", duration: "Scheduled", status: "Upcoming" },
    ],
    bannerUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&h=400&fit=crop",
    promoCode: {
      code: "JORDAN20",
      totalUses: 0,
      usesThisWeek: 0,
      estRevenue: "£0"
    },
    lastMessage: {
      preview: "I've uploaded the banner and am ready for the start date. See you on Feb 24!",
      timestamp: "1d ago"
    }
  };

  const handleViewProof = (stream: any) => {
    if (stream.status !== 'Verified') return;
    setSelectedStream(stream);
    setIsProofModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      {/* TOP BAR */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-center flex-1">Campaign Overview</h1>
        <button className="p-1">
          <Download className="w-5 h-5" />
        </button>
      </div>

      <main className="max-w-[480px] mx-auto w-full">
        {/* SECTION 1 — CAMPAIGN STATUS BANNER */}
        <div className="w-full bg-[#FFF8DC] border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center justify-between italic">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#D2691E]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">Upcoming</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D2691E]">
            Starts in 3 Days
          </p>
        </div>

        {/* SECTION 2 — CREATOR SUMMARY CARD */}
        <div className="px-6 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ImageWithFallback src={campaign.creator.avatar} className="w-16 h-16 border-2 border-[#1D1D1D] grayscale object-cover rounded-none" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">{campaign.creator.name}</h2>
                    {campaign.creator.verified && <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />}
                  </div>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">{campaign.creator.username}</p>
                </div>
              </div>

              <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />

              <div className="space-y-4">
                <div className="flex items-start gap-4 italic">
                  <Star className="w-4 h-4 text-[#FEDB71] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Package</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{campaign.package}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Tag className="w-4 h-4 text-[#389C9A] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Campaign Type</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{campaign.type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Calendar className="w-4 h-4 text-[#D2691E] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Start Date</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">{campaign.startDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 italic">
                  <Clock className="w-4 h-4 text-[#D2691E] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Stream Deadline</p>
                    <p className="text-[11px] font-black uppercase tracking-tight">Complete all streams by {campaign.deadline}</p>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-[#1D1D1D]/10 my-6" />

              <div className="flex items-center justify-between italic">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Campaign Value</p>
                  <p className="text-3xl font-black tracking-tighter text-[#1D1D1D]">{campaign.totalValue}</p>
                </div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 text-right max-w-[120px]">
                  Released per verified stream cycle
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 — CAMPAIGN PROGRESS */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Campaign Progress</h3>
          
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-end mb-4 italic">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Streams Completed</p>
                <h4 className="text-2xl font-black tracking-tighter text-[#1D1D1D]/20">{campaign.progress.completed} of {campaign.progress.total}</h4>
              </div>
              <p className="text-[12px] font-black uppercase italic tracking-widest text-[#1D1D1D]/20">{campaign.progress.percentage}% Complete</p>
            </div>

            <div className="h-4 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-8 border border-[#1D1D1D]/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${campaign.progress.percentage}%` }}
                className="h-full bg-[#389C9A]"
              />
            </div>

            <div className="h-[1px] bg-[#1D1D1D]/10 mb-8" />

            <div className="grid grid-cols-3 gap-4 italic text-center">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Verified Streams</p>
                <p className="text-xl font-black tracking-tighter">{campaign.progress.verified}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Awaiting Verification</p>
                <p className="text-xl font-black tracking-tighter text-[#D2691E]">{campaign.progress.awaiting}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 leading-none">Remaining</p>
                <p className="text-xl font-black tracking-tighter">{campaign.progress.remaining}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4 — FINANCIAL SUMMARY */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Financial Summary</h3>
          
          <div className="bg-white border-2 border-[#1D1D1D] mb-12">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Total Campaign Value</span>
                <span className="text-lg font-black tracking-tighter">{campaign.financials.total}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Released to Creator So Far</span>
                <span className="text-lg font-black tracking-tighter text-[#1D1D1D]/20">{campaign.financials.released}</span>
              </div>
              <div className="flex justify-between items-center italic">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Remaining Held</span>
                <span className="text-lg font-black tracking-tighter">{campaign.financials.remainingHeld}</span>
              </div>
              
              <div className="h-[1px] bg-[#1D1D1D]/10 my-4" />
              
              <div className="flex items-start gap-3 bg-[#F8F8F8] p-4 border border-[#1D1D1D]/5 italic">
                <Shield className="w-4 h-4 text-[#D2691E] flex-shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-tight leading-relaxed text-[#1D1D1D]/60">
                  Any unverified streams will be refunded to your original payment method within 3 to 5 business days.
                </p>
              </div>
            </div>
          </div>

          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-40 italic">Payout Release Schedule</h4>
          <div className="flex flex-col gap-3">
            {campaign.payoutSchedule.map((row, i) => (
              <div key={i} className="bg-white border border-[#1D1D1D]/10 p-5 flex items-center justify-between italic">
                <div>
                  <p className="text-[10px] font-black uppercase mb-1">{row.label}</p>
                  <p className="text-lg font-black tracking-tighter">{row.amount}</p>
                </div>
                <div className={`px-3 py-1 border text-[8px] font-black uppercase tracking-widest italic bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10`}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5 — STREAM LOG */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Stream Log</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8 italic">Every stream Jordan Plays has completed for this campaign.</p>

          <div className="flex flex-col gap-4 mb-8">
            {campaign.streamLog.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-6 flex items-center justify-between italic">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight leading-none">Stream {stream.number}</p>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{stream.date}</p>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic opacity-40">{stream.duration}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className={`px-2 py-0.5 border text-[7px] font-black uppercase tracking-widest italic bg-[#F8F8F8] text-[#1D1D1D]/20 border-[#1D1D1D]/10`}>
                    {stream.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 underline italic">
            Show All Streams →
          </button>
        </div>

        {/* SECTION 6 — YOUR ACTIVE BANNER */}
        <div className="px-6 py-12 border-b-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Your Active Banner</h3>
          
          <div className="bg-black border-2 border-[#1D1D1D] overflow-hidden mb-6 opacity-40 grayscale">
            <ImageWithFallback src={campaign.bannerUrl} className="w-full h-auto grayscale opacity-80" />
          </div>
          
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic text-center mb-8">
            This banner is scheduled to go live on Jordan Plays' streams from Feb 24.
          </p>
          
          <button className="w-full bg-white border-2 border-[#1D1D1D] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-[#F8F8F8] transition-all italic">
            <Download className="w-4 h-4 text-[#D2691E]" /> Download Banner
          </button>
        </div>

        {/* SECTION 7 — PROMO CODE PERFORMANCE */}
        <div className="px-6 py-12 bg-[#FFF8DC]/30 border-b-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Promo Code Performance</h3>
          
          <div className="bg-white border-2 border-[#1D1D1D] p-8">
            <div className="flex justify-between items-center mb-6 italic">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Active Code</span>
              <span className="text-3xl font-black tracking-tighter text-[#1D1D1D]/20">{campaign.promoCode.code}</span>
            </div>
            
            <div className="h-[1px] bg-[#1D1D1D]/10 mb-6" />
            
            <div className="space-y-4 italic">
              <div className="flex justify-between items-center opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-widest">Total Uses</span>
                <span className="text-lg font-black tracking-tighter">{campaign.promoCode.totalUses}</span>
              </div>
              <div className="flex justify-between items-center opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-widest">Uses This Week</span>
                <span className="text-lg font-black tracking-tighter">{campaign.promoCode.usesThisWeek}</span>
              </div>
              <div className="flex justify-between items-center opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-widest">Est. Revenue Generated</span>
                <span className="text-lg font-black tracking-tighter">{campaign.promoCode.estRevenue}</span>
              </div>
            </div>
            
            <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 mt-8 italic text-center">
              Performance data will appear here once the campaign goes live.
            </p>
          </div>
        </div>

        {/* SECTION 8 — COMMUNICATION */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Communication</h3>
          
          <div 
            onClick={() => navigate("/messages/1")}
            className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 flex items-center gap-4 mb-6 cursor-pointer active:bg-[#1D1D1D]/5 transition-colors"
          >
            <ImageWithFallback src={campaign.creator.avatar} className="w-10 h-10 border border-[#1D1D1D]/10 grayscale object-cover rounded-none" />
            <div className="flex-1 min-w-0 italic">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-black uppercase">{campaign.creator.name}</h4>
                <span className="text-[8px] font-bold text-[#1D1D1D]/30 uppercase tracking-widest">{campaign.lastMessage.timestamp}</span>
              </div>
              <p className="text-[10px] font-medium text-[#1D1D1D]/60 truncate uppercase tracking-tight">
                {campaign.lastMessage.preview}
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate("/messages/1")}
            className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all mb-6"
          >
            <MessageSquare className="w-6 h-6 text-[#FEDB71]" /> Message Jordan Plays
          </button>
          
          <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-4 mb-4 italic">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-tight">
              All communication must remain within LiveLink. Moving conversations outside the platform will result in immediate account closure and forfeiture of all funds.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 opacity-30 italic">
            <Lock className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Secured Messaging Active</span>
          </div>
        </div>

        {/* SECTION 9 — CAMPAIGN ACTIONS */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D] mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Actions</h3>
          
          <div className="flex flex-col gap-1 border border-[#1D1D1D]/10 bg-[#1D1D1D]/10">
            {[
              { icon: Download, label: "Download Campaign Report", subtext: "Export a full PDF summary of this campaign", color: "#389C9A" },
              { icon: Flag, label: "Report a Campaign Issue", subtext: "Raise a dispute or report a problem", color: "#D2691E" },
              { icon: Repeat, label: "Rebook This Creator", subtext: "Start a new campaign with Jordan Plays using the same or updated terms", color: "#1D1D1D" }
            ].map((action, i) => (
              <button 
                key={i} 
                className="w-full bg-white p-6 flex items-center gap-4 text-left active:bg-[#F8F8F8] transition-all italic"
              >
                <div className="w-10 h-10 flex items-center justify-center border border-[#1D1D1D]/10 bg-[#F8F8F8]">
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{action.label}</h4>
                  <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{action.subtext}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
