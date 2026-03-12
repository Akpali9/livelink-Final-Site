import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { useAuth } from "../lib/contexts/AuthContext";
import { motion } from "motion/react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Briefcase,
  Star,
  Zap,
  Award
} from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalEarnings: 0,
    pendingOffers: 0,
    completedGigs: 0
  });

  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchCreatorProfile = async () => {
      try {
        // Try creator_profiles first
        const { data: profile, error: profileError } = await supabase
          .from("creator_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code === '42P01') {
          console.log("creator_profiles table doesn't exist");
        } else if (profile) {
          setCreatorId(profile.id);
          setCreatorName(profile.full_name || "Creator");
          setCreatorAvatar(profile.avatar_url);
          await fetchStats(profile.id);
          await fetchCampaigns(profile.id);
          setLoading(false);
          return;
        }

        // Fallback to creators table
        const { data: creator, error: creatorError } = await supabase
          .from("creators")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (creatorError) {
          console.error("Error fetching creator:", creatorError);
        }

        if (creator) {
          setCreatorId(creator.id);
          setCreatorName(creator.name || "Creator");
          setCreatorAvatar(creator.avatar);
          await fetchStats(creator.id);
          await fetchCampaigns(creator.id);
        }
      } catch (error) {
        console.error("Error in fetchCreatorProfile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorProfile();
  }, [user]);

  const fetchStats = async (creatorId: string) => {
    try {
      // Fetch active campaigns
      const { data: activeCampaigns } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("creator_id", creatorId)
        .eq("status", "active");

      // Fetch completed campaigns
      const { data: completedCampaigns } = await supabase
        .from("campaign_creators")
        .select("id")
        .eq("creator_id", creatorId)
        .eq("status", "completed");

      // Fetch pending offers
      const { data: pendingOffers } = await supabase
        .from("offers")
        .select("id")
        .eq("creator_id", creatorId)
        .eq("status", "pending");

      // Fetch earnings - handle potential 406 by trying different formats
      let totalEarnings = 0;
      try {
        const { data: earnings } = await supabase
          .from("creator_earnings")
          .select("amount")
          .eq("creator_id", creatorId);

        if (earnings) {
          totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
        }
      } catch (e) {
        console.log("Could not fetch earnings, using default");
      }

      setStats({
        activeCampaigns: activeCampaigns?.length || 0,
        completedGigs: completedCampaigns?.length || 0,
        pendingOffers: pendingOffers?.length || 0,
        totalEarnings
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCampaigns = async (creatorId: string) => {
    try {
      // Try without the 'budget' field first
      const { data, error } = await supabase
        .from("campaign_creators")
        .select(`
          id,
          streams_completed,
          streams_target,
          status,
          accepted_at,
          completed_at,
          campaign:campaigns(
            id,
            name,
            type,
            status,
            start_date,
            end_date,
            business:businesses(
              id,
              business_name,
              logo_url
            )
          )
        `)
        .eq("creator_id", creatorId)
        .order("accepted_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching campaigns:", error);
      } else if (data) {
        setRecentCampaigns(data);
      }
    } catch (error) {
      console.error("Error in fetchCampaigns:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="creator" subtitle="Creator Studio" />

      <main className="max-w-[480px] mx-auto w-full">

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-6 bg-[#1D1D1D] text-white p-6"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Welcome back</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-tight">
            {creatorName || "Creator"}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 bg-[#FEDB71] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/60 italic">
              {stats.activeCampaigns} active campaign{stats.activeCampaigns !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 px-6 mt-4">
          {[
            { label: "Active Gigs", val: stats.activeCampaigns, icon: Briefcase, color: "text-[#389C9A]" },
            { label: "Earnings", val: `₦${stats.totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-[#FEDB71]" },
            { label: "Offers", val: stats.pendingOffers, icon: Star, color: "text-purple-500" },
            { label: "Completed", val: stats.completedGigs, icon: Award, color: "text-green-500" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="border-2 border-[#1D1D1D] p-4 bg-white"
            >
              <s.icon className={`w-4 h-4 ${s.color} mb-3`} />
              <p className="text-2xl font-black italic tracking-tight">{s.val}</p>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Campaigns */}
        {recentCampaigns.length > 0 && (
          <section className="px-6 mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] italic mb-4">Recent Campaigns</h2>
            <div className="flex flex-col gap-3">
              {recentCampaigns.map((item, idx) => (
                <div key={idx} className="border-2 border-[#1D1D1D] p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[11px] font-black uppercase italic">{item.campaign?.name || 'Campaign'}</h3>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 ${
                      item.status === 'active' ? 'bg-[#389C9A]/10 text-[#389C9A]' : 'bg-[#FEDB71]/10 text-[#D4A800]'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[9px] opacity-60">{item.campaign?.business?.business_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="px-6 mt-8 mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.25em] italic mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: "Browse Campaigns", path: "/browse", icon: TrendingUp },
              { label: "My Campaigns", path: "/campaigns", icon: Calendar },
              { label: "Messages", path: "/messages", icon: Users },
              { label: "Profile Settings", path: "/settings", icon: Zap },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between px-5 py-4 border border-[#1D1D1D]/10 hover:border-[#1D1D1D] hover:bg-[#F8F8F8] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4 text-[#389C9A]" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">{action.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1D1D1D]/20 group-hover:text-[#1D1D1D] transition-colors" />
              </button>
            ))}
          </div>
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
