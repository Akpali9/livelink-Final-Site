import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { 
  Check, 
  Calendar, 
  Video as VideoIcon, 
  Tag, 
  PoundSterling, 
  AlertTriangle, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";

// Initialize Supabase client
const supabaseUrl = "https://bcteuanlownbanppggew.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdGV1YW5sb3duYmFucHBnZ2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDM4MDcsImV4cCI6MjA4NzY3OTgwN30.YW2O1MvkRkpB8ezedFdvwrWHymiXiHcrU5DGj1mmcg4";
const supabase = createClient(supabaseUrl, supabaseKey);

export function GigAccepted() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaign() {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) {
        console.error("Error fetching campaign:", error);
      } else {
        setCampaign(data);
      }
      setLoading(false);
    }

    if (campaignId) fetchCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[#1D1D1D]">
        <p className="italic font-black uppercase tracking-widest text-sm">Loading campaign...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[#1D1D1D] px-6">
        <p className="italic font-black uppercase tracking-widest text-sm text-center">
          Campaign not found.
        </p>
        <Link 
          to="/dashboard" 
          className="mt-6 block text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] underline transition-colors italic"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <AppHeader showBack showLogo />

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Success Icon */}
        <div className="mt-12 w-20 h-20 bg-[#389C9A] flex items-center justify-center mb-6 border-2 border-[#1D1D1D]">
          <Check className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2 text-center">
          Gig Accepted!
        </h1>
        <p className="text-sm text-[#1D1D1D]/60 mb-12 text-center font-medium italic">
          You're now partnered with {campaign.business_name}
        </p>

        {/* Campaign Card */}
        <div className="w-full bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 mb-12 rounded-none">
          {/* Brand */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-none overflow-hidden border border-[#1D1D1D]/10">
              <ImageWithFallback 
                src={campaign.logo_url} 
                className="w-full h-full object-cover grayscale" 
              />
            </div>
            <div>
              <h3 className="font-black text-[#1D1D1D] flex items-center gap-2 uppercase italic tracking-tight">
                {campaign.business_name}
                <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
              </h3>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="space-y-5">
            <div className="flex items-center gap-4 italic">
              <Calendar className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[12px] font-bold uppercase tracking-tight">
                Starts {campaign.start_date}
              </span>
            </div>
            <div className="flex items-center gap-4 italic">
              <VideoIcon className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[12px] font-bold uppercase tracking-tight">
                {campaign.tier} · {campaign.total_streams} Streams
              </span>
            </div>
            <div className="flex items-center gap-4 italic">
              <Tag className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[12px] font-bold uppercase tracking-tight">
                {campaign.campaign_type}
              </span>
            </div>
            <div className="flex items-center gap-4 italic">
              <PoundSterling className="w-4 h-4 text-[#389C9A]" />
              <span className="text-[12px] font-black uppercase tracking-tight text-[#389C9A]">
                £{campaign.total_budget}.00 total
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-[#1D1D1D]/10 my-8" />

          {/* Warning */}
          <div className="flex items-center gap-2 text-[#FEDB71] bg-[#1D1D1D] p-3 italic">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {campaign.min_stream_duration} streams required
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Buttons */}
      <div className="px-6 pb-12 flex flex-col gap-4">
        <button 
          onClick={() => navigate(`/campaign/${campaign.id}`)}
          className="w-full py-6 bg-white border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:bg-[#F8F8F8] transition-all rounded-none italic"
        >
          View Details <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
        </button>

        <button 
          onClick={() => navigate(`/messages/${campaign.id}`)}
          className="w-full py-6 bg-[#1D1D1D] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] rounded-none italic border-2 border-[#1D1D1D]"
        >
          <MessageCircle className="w-5 h-5 text-[#389C9A]" /> Message {campaign.business_name}
        </button>

        <Link 
          to="/dashboard" 
          className="block text-center text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] underline transition-colors italic mt-4"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}