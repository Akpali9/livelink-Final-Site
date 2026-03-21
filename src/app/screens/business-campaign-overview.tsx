import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Calendar,
  Tag,
  Tv,
  PoundSterling as Pound,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Shield,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: string;
  description?: string;
  budget?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  streams_required: number;
  business_id: string;
  created_at: string;
  banner_url?: string;
}

interface CampaignCreator {
  id: string;
  creator_id: string;
  status: string;
  streams_completed: number;
  streams_target: number;
  total_earnings: number;
  paid_out: number;
}

export function BusinessCampaignOverview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const campaignChannelRef = useRef<any>(null);
  const creatorsChannelRef = useRef<any>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: creatorsData, error: creatorsError } = await supabase
        .from("campaign_creators")
        .select("*")
        .eq("campaign_id", id);
      if (creatorsError) throw creatorsError;
      setCreators(creatorsData || []);

      setLastUpdated(new Date());
      if (silent) toast.success("Data refreshed");
    } catch (error) {
      console.error("Error fetching campaign overview:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchData();

    const subscribe = () => {
      campaignChannelRef.current = supabase
        .channel(`campaign-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "campaigns",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            setCampaign((prev) => (prev ? { ...prev, ...payload.new } : prev));
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setIsRealtimeConnected(true);
          else if (status === "CHANNEL_ERROR") setIsRealtimeConnected(false);
        });

      creatorsChannelRef.current = supabase
        .channel(`campaign-creators-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_creators",
            filter: `campaign_id=eq.${id}`,
          },
          () => {
            fetchData(true);
          }
        )
        .subscribe();
    };

    subscribe();

    const pollInterval = setInterval(() => {
      if (!isRealtimeConnected) fetchData(true);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      campaignChannelRef.current?.unsubscribe();
      creatorsChannelRef.current?.unsubscribe();
    };
  }, [id, fetchData, isRealtimeConnected]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-gray-400">Loading campaign overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] max-w-[480px] mx-auto w-full">
        <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 mb-8">This campaign doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/business/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalBudget = campaign.budget || 0;
  const totalCreators = creators.length;
  const activeCreators = creators.filter(c => c.status === "active").length;
  const completedStreams = creators.reduce((sum, c) => sum + c.streams_completed, 0);
  const totalStreams = campaign.streams_required || 0;
  const streamProgress = totalStreams > 0 ? (completedStreams / totalStreams) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-24 max-w-[480px] mx-auto w-full">
      <AppHeader showBack backPath="/business/dashboard" title="Campaign Overview" userType="business" />

      {/* Realtime Status Bar */}
      <div className="px-6 py-2.5 border-b border-[#1D1D1D]/10 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Live</span>
          <span className="text-[8px] text-[#1D1D1D]/30">
            · Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1 px-2.5 py-1 hover:bg-[#F8F8F8] rounded-lg transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
          <span className="text-[8px] font-black uppercase tracking-widest">
            {refreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>

      <main className="flex-1">
        {/* Header */}
        <section className="px-6 py-8 border-b-2 border-[#1D1D1D] bg-gradient-to-br from-[#1D1D1D] to-gray-800 text-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-tight mb-1">
                {campaign.name}
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-widest">{campaign.type}</p>
            </div>
            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 italic ${
              campaign.status?.toLowerCase() === "active"
                ? "bg-[#389C9A] text-white"
                : "bg-gray-600 text-gray-200"
            }`}>
              {campaign.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Budget</p>
              <p className="text-xl font-black">₦{totalBudget.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Streams Required</p>
              <p className="text-xl font-black">{campaign.streams_required || "—"}</p>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <div className="px-6 py-6 grid grid-cols-3 gap-3 border-b border-[#1D1D1D]/10">
          {[
            { label: "Creators", value: totalCreators, icon: Users },
            { label: "Active", value: activeCreators, icon: CheckCircle2 },
            { label: "Stream Progress", value: `${Math.round(streamProgress)}%`, icon: Tv },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#F8F8F8] rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-2 text-[#389C9A]" />
              <p className="text-xl font-black">{stat.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Campaign Details */}
        <section className="px-6 py-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-6 italic">Campaign Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Calendar, label: "Start Date", value: campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "TBC" },
              { icon: Calendar, label: "End Date", value: campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "TBC" },
              { icon: Tag, label: "Type", value: campaign.type },
              { icon: Tv, label: "Streams", value: campaign.streams_required },
            ].map((item, i) => (
              <div key={i} className="bg-white border-2 border-[#1D1D1D]/10 p-4 flex items-start gap-3">
                <item.icon className="w-4 h-4 mt-0.5 text-[#389C9A]" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">{item.label}</p>
                  <p className="text-[10px] font-black uppercase tracking-tight">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Progress Bar */}
        <section className="px-6 py-8 bg-[#F8F8F8] border-y border-[#1D1D1D]/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-6 italic">Overall Progress</h3>
          <div className="bg-white border-2 border-[#1D1D1D] p-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest">Streams Completed</span>
              <span className="text-[9px] font-black">{completedStreams} / {totalStreams}</span>
            </div>
            <div className="h-3 bg-[#1D1D1D]/5 w-full rounded-full overflow-hidden border border-[#1D1D1D]/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${streamProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-[#389C9A]"
              />
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-6 py-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1D1D1D]/40 mb-6 italic">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/business/campaign/creators/${campaign.id}`)}
              className="w-full flex items-center justify-between bg-white border-2 border-[#1D1D1D] p-5 hover:bg-[#F8F8F8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px] font-black uppercase tracking-widest">View All Creators</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>

            <button
              onClick={() => navigate(`/business/campaign/edit/${campaign.id}`)}
              className="w-full flex items-center justify-between bg-white border-2 border-[#1D1D1D] p-5 hover:bg-[#F8F8F8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#389C9A]" />
                <span className="text-[9px] font-black uppercase tracking-widest">Edit Campaign</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>

            <div className="flex items-start gap-3 bg-[#F8F8F8] p-4 border border-[#1D1D1D]/5 mt-4">
              <Shield className="w-4 h-4 text-[#D2691E] flex-shrink-0" />
              <p className="text-[9px] font-bold uppercase tracking-tight leading-relaxed text-[#1D1D1D]/60">
                Campaign funds are held securely and released only after streams are verified.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
