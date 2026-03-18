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
  Megaphone,
  Layout,
  Lock,
  Download,
  Copy,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Camera,
  Users,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface CampaignCreatorDetails {
  id: string;
  status: string;
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  accepted_at: string;
  created_at: string;
  
  campaign: {
    id: string;
    name: string;
    type: string;
    pay_rate: number;
    bid_amount: number;
    budget: number;
    start_date: string;
    end_date: string;
    description: string;
    
    business: {
      id: string;
      business_name: string;
      logo_url: string;
      email: string;
      verified?: boolean;
    };
  };
  
  creator: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export function UpcomingGigDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState<CampaignCreatorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysToStart, setDaysToStart] = useState<number>(0);

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!id || !user) return;

      try {
        // First get creator profile
        const { data: creator } = await supabase
          .from("creator_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!creator) {
          toast.error("Creator profile not found");
          return;
        }

        // Fetch campaign_creators with joins
        const { data, error } = await supabase
          .from("campaign_creators")
          .select(`
            id,
            status,
            streams_completed,
            streams_target,
            total_earnings,
            paid_out,
            accepted_at,
            created_at,
            campaign:campaigns (
              id,
              name,
              type,
              pay_rate,
              bid_amount,
              budget,
              start_date,
              end_date,
              description,
              business:businesses (
                id,
                business_name,
                logo_url,
                email
              )
            ),
            creator:creator_profiles (
              id,
              full_name,
              avatar_url,
              username
            )
          `)
          .eq("id", id)
          .eq("creator_id", creator.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Gig not found");

        setGig(data as CampaignCreatorDetails);

        // Calculate days to start
        if (data.campaign?.start_date) {
          const start = new Date(data.campaign.start_date).getTime();
          const now = new Date().getTime();
          setDaysToStart(Math.max(Math.ceil((start - now) / (1000 * 60 * 60 * 24)), 0));
        }

      } catch (error) {
        console.error("Error fetching gig:", error);
        toast.error("Failed to load gig details");
      } finally {
        setLoading(false);
      }
    };

    fetchGigDetails();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <AppHeader showBack title="Upcoming Gig" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <AppHeader showBack title="Upcoming Gig" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Gig Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The gig you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const business = gig.campaign.business;
  const isAvailable = new Date() >= new Date(gig.campaign.start_date);
  const totalEarnings = gig.total_earnings || 0;
  const paidOut = gig.paid_out || 0;
  const pendingPayout = totalEarnings - paidOut;
  const streamsRemaining = gig.streams_target - gig.streams_completed;

  // Generate payout schedule based on streams_target
  const payoutSchedule = Array.from({ length: gig.streams_target }, (_, i) => ({
    label: `Stream ${i + 1}`,
    amount: `N${(gig.campaign.pay_rate || 0).toFixed(2)}`,
    status: i < gig.streams_completed ? "Completed" : i === gig.streams_completed ? "Pending" : "Upcoming"
  }));

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[100px]">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-center flex-1">Upcoming Gig</h1>
        <div className="bg-[#FFF8DC] text-[#D2691E] text-[9px] font-black uppercase px-2 py-0.5 tracking-widest border border-[#D2691E]/20 rounded-full">
          {daysToStart > 0 ? `${daysToStart} days to start` : "Starting soon"}
        </div>
      </div>

      <main className="max-w-[480px] mx-auto w-full">

        {/* Gig Confirmed Banner */}
        <div className="bg-[#FFF8DC] border-b-2 border-[#1D1D1D] px-6 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#D2691E]" />
          <p className="text-[10px] font-black uppercase tracking-tight">
            Gig Confirmed · {business.business_name} x {gig.creator.full_name}
          </p>
        </div>

        {/* Business & Campaign Card */}
        <div className="px-6 py-8">
          <div className="bg-white border-2 border-[#1D1D1D] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ImageWithFallback 
                  src={business.logo_url || "https://via.placeholder.com/100"} 
                  className="w-16 h-16 border-2 border-[#1D1D1D] grayscale object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">{business.business_name}</h2>
                  </div>
                  <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest">{gig.campaign.name}</p>
                </div>
              </div>

              <div className="h-[2px] bg-[#1D1D1D] mb-6" />

              {/* Gig Details */}
              <div className="space-y-6">
                <GigDetail 
                  icon={Calendar} 
                  label="Gig Starts" 
                  value={new Date(gig.campaign.start_date).toDateString()} 
                />
                <GigDetail 
                  icon={Video} 
                  label="Package" 
                  value={`${gig.streams_target} Streams`} 
                />
                <GigDetail 
                  icon={Tag} 
                  label="Campaign Type" 
                  value={gig.campaign.type} 
                />
                <GigDetail 
                  icon={Clock} 
                  label="Streams Completed" 
                  value={`${gig.streams_completed}/${gig.streams_target}`} 
                />
                <GigDetail 
                  icon={DollarSign} 
                  label="Rate per Stream" 
                  value={`N${gig.campaign.pay_rate || gig.campaign.bid_amount || gig.campaign.budget || 0}`} 
                />
                <GigDetail 
                  icon={Pound} 
                  label="Total Earnings" 
                  value={`N${totalEarnings.toFixed(2)}`}
                  earningsSubtext={`N${paidOut.toFixed(2)} paid · N${pendingPayout.toFixed(2)} pending`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payout Schedule */}
        <div className="px-6 py-12 bg-[#F8F8F8] border-y-2 border-[#1D1D1D]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Payout Schedule</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">
            Earnings are released after each verified stream.
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {payoutSchedule.map((p, i) => (
              <PayoutCard 
                key={i} 
                label={p.label} 
                amount={p.amount} 
                status={p.status} 
              />
            ))}
          </div>
          <div className="flex justify-between items-center py-4 border-t-2 border-[#1D1D1D] mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Earnings</span>
            <span className="text-xl font-black italic">N{totalEarnings.toFixed(2)}</span>
          </div>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic text-center">
            Payouts processed within 3 to 5 business days of each verification.
          </p>
        </div>

        {/* Responsibilities - Derived from campaign type */}
        <div className="px-6 py-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Responsibilities</h3>
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">
            These are the standard terms for this campaign type.
          </p>
          <div className="flex flex-col gap-4 mb-8">
            <ResponsibilityCard 
              icon={Layout}
              title="Display Banner During Streams"
              detail="Ensure the campaign banner is clearly visible throughout your entire stream for all {streams_target} streams. Banner must not be obscured by overlays."
            />
            <ResponsibilityCard 
              icon={Clock}
              title="Stream Duration Requirement"
              detail="Each stream must be at least 45 minutes long to qualify for payment. Shorter streams will not be counted toward your total."
            />
            <ResponsibilityCard 
              icon={Camera}
              title="Submit Stream Proof"
              detail="After each stream, upload a screenshot of your analytics showing viewer count and duration within 24 hours."
            />
            <ResponsibilityCard 
              icon={Users}
              title="Engage with Brand Mentions"
              detail="Mention the brand at least twice during each stream and direct viewers to check out their products/services."
            />
          </div>
          <div className="bg-[#D2691E] text-white p-6 flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight italic">
              You agreed to these terms when you accepted this gig on {new Date(gig.accepted_at).toDateString()}.
            </p>
          </div>
        </div>

        {/* Assets - Locked until start date */}
        <AssetsSection 
          isAvailable={isAvailable} 
          gigStartDate={gig.campaign.start_date} 
          campaignType={gig.campaign.type}
        />

        {/* Countdown */}
        <Countdown daysToStart={daysToStart} startDate={gig.campaign.start_date} />

        {/* Stream Proof Reminder */}
        <StreamProofReminder streamsRemaining={streamsRemaining} />

        {/* Communication */}
        <Communication businessName={business.business_name} businessId={business.id} />

      </main>

      <BottomNav />
    </div>
  );
}

/* ----------------------------- Subcomponents ---------------------------- */

function GigDetail({ icon: Icon, label, value, earningsSubtext }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 ${earningsSubtext ? "bg-[#D2691E]" : "bg-[#FFF8DC]"} flex items-center justify-center border border-[#1D1D1D]/10`}>
        <Icon className={`w-5 h-5 ${earningsSubtext ? "text-white" : "text-[#D2691E]"}`} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">{label}</p>
        <p className={`text-${earningsSubtext ? "xl" : "sm"} font-black italic ${earningsSubtext ? "text-[#D2691E]" : ""}`}>{value}</p>
        {earningsSubtext && (
          <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">{earningsSubtext}</p>
        )}
      </div>
    </div>
  );
}

function PayoutCard({ label, amount, status }: any) {
  const statusColors = {
    Completed: "bg-green-100 text-green-700 border-green-200",
    Pending: "bg-[#FEDB71]/20 text-[#D2691E] border-[#FEDB71]",
    Upcoming: "bg-gray-100 text-gray-400 border-gray-200"
  };

  return (
    <div className="bg-white border border-[#1D1D1D]/10 p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase italic">{label}</p>
        <p className="text-lg font-black text-[#D2691E] italic">{amount}</p>
      </div>
      <div className={`px-3 py-1 border text-[8px] font-black uppercase tracking-widest italic ${
        statusColors[status as keyof typeof statusColors]
      }`}>
        {status}
      </div>
    </div>
  );
}

function ResponsibilityCard({ icon: Icon, title, detail }: any) {
  return (
    <div className="bg-white border-2 border-[#1D1D1D] p-6 flex items-start gap-4">
      <div className="w-10 h-10 bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#D2691E]" />
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 italic">{title}</h4>
        <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic">{detail}</p>
      </div>
    </div>
  );
}

function AssetsSection({ isAvailable, gigStartDate, campaignType }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopyPromo = () => {
    navigator.clipboard.writeText("LIVELINK20");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`px-6 py-12 bg-[#FFF8DC]/30 border-y-2 border-[#1D1D1D] ${!isAvailable ? "opacity-60 pointer-events-none grayscale" : ""}`}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Your Assets</h3>
      <p className="text-[9px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mb-8">
        Your assets will be available here from your gig start date. Come back on {new Date(gigStartDate).toDateString()} to access them.
      </p>
      
      {/* Campaign Banner Placeholder */}
      <div className="bg-white border-2 border-[#1D1D1D] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest">Campaign Banner</p>
          {!isAvailable && <Lock className="w-4 h-4 text-[#D2691E]" />}
        </div>
        <div className="aspect-video bg-[#F8F8F8] border border-[#1D1D1D]/10 flex flex-col items-center justify-center gap-2 mb-6">
          {isAvailable ? (
            <>
              <img 
                src="https://via.placeholder.com/400x200?text=Banner+Placeholder" 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 border border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button className="px-3 py-1 border border-[#1D1D1D] text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View
                </button>
              </div>
            </>
          ) : (
            <>
              <Lock className="w-6 h-6 text-[#1D1D1D]/20" />
              <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
                Available from {new Date(gigStartDate).toDateString()}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Promo Code - Only for promo campaigns */}
      {(campaignType?.includes("Promo") || campaignType?.includes("promo")) && (
        <div className="bg-white border-2 border-[#1D1D1D] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest">Promo Code</p>
            {!isAvailable && <Lock className="w-4 h-4 text-[#D2691E]" />}
          </div>
          {isAvailable ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#F8F8F8] px-4 py-3 text-sm font-mono border border-[#1D1D1D]/10">
                LIVELINK20
              </code>
              <button 
                onClick={handleCopyPromo}
                className="px-4 py-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors"
              >
                {copied ? "Copied!" : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-50">
              <code className="flex-1 bg-[#F8F8F8] px-4 py-3 text-sm font-mono border border-[#1D1D1D]/10">
                ********
              </code>
              <button className="px-4 py-3 border-2 border-[#1D1D1D]/20 cursor-not-allowed" disabled>
                <Lock className="w-4 h-4 opacity-30" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Countdown({ daysToStart, startDate }: any) {
  return (
    <div className="px-6 py-12">
      <div className="bg-white border-2 border-[#1D1D1D] p-10 text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#F8F8F8]">
          <div className="h-full bg-[#D2691E]" style={{ width: `${Math.min(100, 100 - (daysToStart / 30) * 100)}%` }} />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-40">Gig Starts In</h4>
        <div className="text-6xl font-black italic tracking-tighter mb-2 text-[#1D1D1D]">
          {daysToStart > 0 ? `${daysToStart} DAY${daysToStart !== 1 ? 'S' : ''}` : "TODAY"}
        </div>
        <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">
          {new Date(startDate).toDateString()} · Make sure you are ready to go live.
        </p>
      </div>
    </div>
  );
}

function StreamProofReminder({ streamsRemaining }: any) {
  return (
    <div className="px-6 pb-12">
      <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-8 flex flex-col items-center text-center gap-6">
        <div className="w-12 h-12 bg-white border border-[#1D1D1D]/10 flex items-center justify-center shadow-[4px_4px_0px_#1D1D1D]">
          <Camera className="w-6 h-6 text-[#D2691E]" />
        </div>
        <div>
          <h4 className="text-[12px] font-black uppercase tracking-widest mb-3">Remember to Submit Proof</h4>
          <p className="text-[10px] font-medium leading-relaxed text-[#1D1D1D]/60 italic">
            After every qualifying stream you must upload a screenshot of your analytics showing your viewer count and stream duration. 
            You have <span className="font-black text-[#D2691E]">{streamsRemaining} stream{streamsRemaining !== 1 ? 's' : ''}</span> remaining.
          </p>
        </div>
      </div>
    </div>
  );
}

function Communication({ businessName, businessId }: any) {
  const navigate = useNavigate();

  return (
    <div className="px-6 pb-24 flex flex-col gap-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Communication</h3>
      <button 
        onClick={() => navigate(`/messages/${businessId}`)}
        className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
      >
        <MessageSquare className="w-6 h-6 text-[#D2691E]" /> Message {businessName}
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
