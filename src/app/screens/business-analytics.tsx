import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Eye,
  Calendar,
  Download,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface CampaignAnalytics {
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

export function BusinessAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics[]>([]);
  const [dateRange, setDateRange] = useState("30d"); // placeholder for now

  // Fetch business ID and campaigns
  useEffect(() => {
    if (!user) return;
    const fetchBusiness = async () => {
      const { data: business, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error(error);
      if (business) {
        setBusinessId(business.id);
      } else {
        toast.error("Business profile not found");
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user]);

  // Fetch campaigns and their analytics
  useEffect(() => {
    if (!businessId) return;
    const fetchData = async () => {
      setLoading(true);
      // Fetch campaigns
      const { data: campaignsData, error: campErr } = await supabase
        .from("campaigns")
        .select("id, name, budget, status")
        .eq("business_id", businessId);
      if (campErr) console.error(campErr);
      setCampaigns(campaignsData || []);

      // Fetch analytics for these campaigns (last 30 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const { data: analyticsData, error: anaErr } = await supabase
        .from("campaign_analytics")
        .select("*")
        .in("campaign_id", campaignsData?.map(c => c.id) || [])
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });
      if (anaErr) console.error(anaErr);
      setAnalytics(analyticsData || []);

      setLoading(false);
    };
    fetchData();

    // Subscribe to real-time changes for analytics
    const channel = supabase
      .channel("analytics-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaign_analytics" },
        (payload) => {
          const newRecord = payload.new as CampaignAnalytics;
          if (campaigns.some(c => c.id === newRecord.campaign_id)) {
            setAnalytics(prev => [...prev, newRecord]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_analytics" },
        (payload) => {
          const updated = payload.new as CampaignAnalytics;
          setAnalytics(prev =>
            prev.map(a => (a.campaign_id === updated.campaign_id && a.date === updated.date ? updated : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, campaigns]);

  // Aggregate metrics
  const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
  const totalClicks = analytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalConversions = analytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
  const ctr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";
  const conversionRate = totalClicks ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  // Campaign performance (group by campaign)
  const campaignPerformance = campaigns.map(campaign => {
    const campaignAnalytics = analytics.filter(a => a.campaign_id === campaign.id);
    const impressions = campaignAnalytics.reduce((sum, a) => sum + a.impressions, 0);
    const clicks = campaignAnalytics.reduce((sum, a) => sum + a.clicks, 0);
    const conversions = campaignAnalytics.reduce((sum, a) => sum + a.conversions, 0);
    return {
      id: campaign.id,
      name: campaign.name,
      impressions,
      clicks,
      conversions,
      cr: clicks ? ((conversions / clicks) * 100).toFixed(1) : "0",
    };
  }).filter(p => p.impressions > 0 || p.clicks > 0 || p.conversions > 0);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-32 max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Analytics" backPath="/business/dashboard" userType="business" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-32 max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Analytics" backPath="/business/dashboard" userType="business" />

      <main className="flex-1 px-6 pt-8 pb-20">
        {/* Date Range (simple) */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#389C9A]" />
            <span className="text-[9px] font-black uppercase tracking-widest italic">Last 30 days</span>
          </div>
          <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest italic border-2 border-[#1D1D1D]/20 px-3 py-1 hover:border-[#1D1D1D] transition-colors">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="border-2 border-[#1D1D1D] p-5 bg-white">
            <div className="flex justify-between items-start mb-2">
              <Eye className="w-4 h-4 text-[#389C9A]" />
            </div>
            <p className="text-2xl font-black italic tracking-tight mb-1">{totalImpressions.toLocaleString()}</p>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Impressions</p>
          </div>
          <div className="border-2 border-[#1D1D1D] p-5 bg-white">
            <div className="flex justify-between items-start mb-2">
              <TrendingUp className="w-4 h-4 text-[#389C9A]" />
            </div>
            <p className="text-2xl font-black italic tracking-tight mb-1">{totalClicks.toLocaleString()}</p>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Clicks</p>
          </div>
          <div className="border-2 border-[#1D1D1D] p-5 bg-white">
            <div className="flex justify-between items-start mb-2">
              <BarChart3 className="w-4 h-4 text-[#389C9A]" />
            </div>
            <p className="text-2xl font-black italic tracking-tight mb-1">{ctr}%</p>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">CTR</p>
          </div>
          <div className="border-2 border-[#1D1D1D] p-5 bg-white">
            <div className="flex justify-between items-start mb-2">
              <DollarSign className="w-4 h-4 text-[#389C9A]" />
            </div>
            <p className="text-2xl font-black italic tracking-tight mb-1">{conversionRate}%</p>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Conversion Rate</p>
          </div>
        </div>

        {/* Campaign Performance */}
        {campaignPerformance.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">Campaign Performance</h2>
            <div className="space-y-4">
              {campaignPerformance.map((camp) => (
                <div key={camp.id} className="border-2 border-[#1D1D1D] p-5 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-black uppercase tracking-tight italic">{camp.name}</h3>
                    <span className="text-[9px] font-black text-[#389C9A] italic">{camp.cr}% CR</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-[9px] font-black uppercase tracking-widest">
                    <div>
                      <p className="opacity-40">Impressions</p>
                      <p className="text-[11px] mt-1">{camp.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="opacity-40">Clicks</p>
                      <p className="text-[11px] mt-1">{camp.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="opacity-40">Conversions</p>
                      <p className="text-[11px] mt-1">{camp.conversions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder if no data */}
        {campaignPerformance.length === 0 && (
          <div className="border-2 border-dashed border-[#1D1D1D]/20 p-6 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
              No analytics data yet
            </p>
            <p className="text-[7px] font-medium mt-2 opacity-30">Data will appear as campaigns get impressions and clicks</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}