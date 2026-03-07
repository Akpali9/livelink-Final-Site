import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Video,
  Tag,
  Clock,
  PoundSterling as Pound,
  Shield,
  PhoneOff,
  Megaphone,
  Layout,
  Lock,
  Download,
  Copy,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Camera
} from "lucide-react";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase"; // Make sure Supabase is configured

export function UpcomingGigDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gig, setGig] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [responsibilities, setResponsibilities] = useState<any[]>([]);
  const [daysToStart, setDaysToStart] = useState<number>(0);

  // Fetch gig details from Supabase
  useEffect(() => {
    const fetchGig = async () => {
      if (!id) return;

      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .select("*")
        .eq("id", id)
        .single();

      if (gigError) return console.error(gigError);
      setGig(gigData);

      const { data: payoutData, error: payoutError } = await supabase
        .from("payouts")
        .select("*")
        .eq("gig_id", id);

      if (payoutError) return console.error(payoutError);
      setPayouts(payoutData);

      const { data: respData, error: respError } = await supabase
        .from("responsibilities")
        .select("*")
        .eq("gig_id", id);

      if (respError) return console.error(respError);
      setResponsibilities(respData);

      const start = new Date(gigData.start_date).getTime();
      const now = new Date().getTime();
      setDaysToStart(Math.max(Math.ceil((start - now) / (1000 * 60 * 60 * 24)), 0));
    };

    fetchGig();
  }, [id]);

  if (!gig) return <p className="text-center mt-20">Loading...</p>;

  const isAvailable = new Date() >= new Date(gig.start_date);

  // Map string icon names to components
  const iconMap: Record<string, any> = { Clock, Layout, Megaphone, Calendar, Shield, PhoneOff };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-center flex-1">Upcoming Gig</h1>
        <div className="bg-[#FFF8DC] text-[#D2691E] text-[9px] font-black uppercase px-2 py-0.5 tracking-widest border border-[#D2691E]/20">
          Upcoming
        </div>
      </div>

      <main className="max-w-[480px] mx-auto w-full">

        {/* Gig Confirmed Banner */}
        <div className="bg-[#FFF8DC] border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#D2691E]" />
          <p className="text-[10px] font-black uppercase tracking-tight">
            Gig Confirmed · {gig.business} x {gig.streamer_name}
          </p>
        </div>

        {/* Business & Campaign Card */}
        <div className="px-6 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ImageWithFallback src={gig.logo_url} className="w-16 h-16 border-2 border-[#1D1D1D] grayscale object-cover rounded-none" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">{gig.business}</h2>
                    {gig.verified && <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white" />}
                  </div>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{gig.campaign_name}</p>
                </div>
              </div>

              <div className="h-[2px] bg-[#1D1D1D] mb-6" />

              {/* Gig Details */}
              <div className="space-y-6">
                <GigDetail icon={Calendar} label="Gig Starts" value={new Date(gig.start_date).toDateString()} />
                <GigDetail icon={Video} label="Package" value={gig.package} />
                <GigDetail icon={Tag} label="Campaign Type" value={gig.type} />
                <GigDetail icon={Clock} label="Stream Deadline" value={gig.deadline} small />
                <GigDetail icon={Pound} label="Your Earnings" value={`£${gig.total_earnings}`} earningsSubtext={gig.earnings_subtext} />
              </div>
            </div>
          </div>
        </div>

        {/* Payout Schedule */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Payout Schedule</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">Earnings are released after each verified 4-stream cycle.</p>
          <div className="flex flex-col gap-3 mb-8">
            {payouts.map((p, i) => <PayoutCard key={i} {...p} />)}
          </div>
          <div className="flex justify-between items-center py-4 border-t-2 border-[#1D1D1D] mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Earnings</span>
            <span className="text-xl font-black italic">£{gig.total_earnings}</span>
          </div>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic text-center">
            Payouts processed within 3 to 5 business days of each verification.
          </p>
        </div>

        {/* Responsibilities */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Agreed Responsibilities</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">These are the terms you agreed to when accepting this gig. Please read before going live.</p>
          <div className="flex flex-col gap-4 mb-8">
            {responsibilities.map((res, i) => {
              const Icon = iconMap[res.icon_name] || Clock;
              return (
                <div key={i} className="bg-white border-2 border-[#1D1D1D] p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#D2691E]" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 italic">{res.title}</h4>
                    <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic">{res.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-[#D2691E] text-white p-6 flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight italic">
              You agreed to all of the above when you accepted this gig on {new Date(gig.acceptance_date).toDateString()}.
            </p>
          </div>
        </div>

        {/* Assets */}
        <AssetsSection isAvailable={isAvailable} gigStartDate={gig.start_date} />

        {/* Countdown */}
        <Countdown daysToStart={daysToStart} startDate={gig.start_date} />

        {/* Stream Proof Reminder */}
        <StreamProofReminder />

        {/* Communication */}
        <Communication navigate={navigate} />

      </main>

      <BottomNav />
    </div>
  );
}

/* ----------------------------- Subcomponents ---------------------------- */

function GigDetail({ icon: Icon, label, value, small, earningsSubtext }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 ${earningsSubtext ? "bg-[#D2691E]" : "bg-[#FFF8DC]"} flex items-center justify-center border border-[#1D1D1D]/10`}>
        <Icon className={`w-5 h-5 ${earningsSubtext ? "text-white" : "text-[#D2691E]"}`} />
      </div>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5 ${small ? "text-xs" : ""}`}>{label}</p>
        <p className={`text-${earningsSubtext ? "xl" : "sm"} font-black italic ${earningsSubtext ? "text-[#D2691E]" : ""}`}>{value}</p>
        {earningsSubtext && <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">{earningsSubtext}</p>}
      </div>
    </div>
  );
}

function PayoutCard({ label, amount, status }: any) {
  return (
    <div className="bg-white border border-[#1D1D1D]/10 p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase italic">{label}</p>
        <p className="text-lg font-black text-[#D2691E] italic">{amount}</p>
      </div>
      <div className="px-3 py-1 border border-[#1D1D1D]/10 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/30 italic">
        {status}
      </div>
    </div>
  );
}

function AssetsSection({ isAvailable, gigStartDate }: any) {
  return (
    <div className={`px-6 py-12 bg-[#FFF8DC]/30 border-y-2 border-[#1D1D1D] ${!isAvailable ? "opacity-60 pointer-events-none grayscale" : ""}`}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Assets</h3>
      <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">
        Your assets will be available here from your gig start date. Come back on {new Date(gigStartDate).toDateString()} to access your banner and promo code.
      </p>
      {/* Example Asset */}
      <div className="bg-white border-2 border-[#1D1D1D] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest">Campaign Banner</p>
          <Lock className="w-4 h-4 text-[#D2691E]" />
        </div>
        <div className="aspect-video bg-[#F8F8F8] border border-[#1D1D1D]/10 flex flex-col items-center justify-center gap-2 mb-6">
          <Lock className="w-6 h-6 text-[#1D1D1D]/20" />
          <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
            Available from {new Date(gigStartDate).toDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function Countdown({ daysToStart, startDate }: any) {
  return (
    <div className="px-6 py-12">
      <div className="bg-white border-2 border-[#1D1D1D] p-10 text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#F8F8F8]">
          <div className="h-full bg-[#D2691E] w-3/4" />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-40">Gig Starts In</h4>
        <div className="text-6xl font-black italic tracking-tighter mb-2 text-[#1D1D1D]">{daysToStart} DAYS</div>
        <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
          {new Date(startDate).toDateString()} · Make sure you are ready to go live.
        </p>
      </div>
    </div>
  );
}

function StreamProofReminder() {
  return (
    <div className="px-6 pb-12">
      <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-8 flex flex-col items-center text-center gap-6">
        <div className="w-12 h-12 bg-white border border-[#1D1D1D]/10 flex items-center justify-center rounded-none shadow-[4px_4px_0px_#1D1D1D]">
          <Camera className="w-6 h-6 text-[#D2691E]" />
        </div>
        <div>
          <h4 className="text-[12px] font-black uppercase tracking-widest mb-3">Remember to Submit Proof</h4>
          <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic">
            After every qualifying stream you must upload a screenshot of your analytics showing your viewer count and stream duration. This is required to verify your stream and trigger your payout. You can do this from the active campaign page once your gig goes live.
          </p>
        </div>
      </div>
    </div>
  );
}

function Communication({ navigate }: any) {
  return (
    <div className="px-6 pb-24 flex flex-col gap-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Communication</h3>
      <button 
        onClick={() => navigate("/messages")}
        className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
      >
        <MessageSquare className="w-6 h-6 text-[#D2691E]" /> Message NatureBrew
      </button>
      <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-tight italic">
          All messages must stay on LiveLink. Moving conversations elsewhere will result in payment forfeiture.
        </p>
      </div>
    </div>
  );
}