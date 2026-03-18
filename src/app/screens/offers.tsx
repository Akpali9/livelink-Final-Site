import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CheckCircle2,
  X,
  MessageSquare,
  ChevronRight,
  Zap,
  DollarSign,
  BarChart,
  ArrowRight,
  Briefcase,
  Calendar,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface CampaignOffer {
  id: string;
  status: "pending" | "active" | "completed" | "declined";
  streams_target: number;
  total_earnings: number;
  paid_out: number;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  
  // Joined data
  campaign: {
    id: string;
    name: string;
    type: string;
    pay_rate?: number;
    bid_amount?: number;
    budget?: number;
  };
  
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username?: string;
  };
  
  business?: {
    id: string;
    business_name: string;
    logo_url?: string;
  };
}

const STATUS_META = {
  pending: {
    label: "Pending",
    bg: "bg-[#FEDB71]/10",
    text: "text-[#1D1D1D]",
    border: "border-[#FEDB71]/50",
    icon: Clock,
  },
  active: {
    label: "Active",
    bg: "bg-[#389C9A]/10",
    text: "text-[#389C9A]",
    border: "border-[#389C9A]/30",
    icon: Zap,
  },
  completed: {
    label: "Completed",
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    bg: "bg-red-50",
    text: "text-red-500",
    border: "border-red-200",
    icon: X,
  },
};

const TABS = ["All", "Pending", "Active", "Completed", "Declined"] as const;
type Tab = typeof TABS[number];

export function Offers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = (searchParams.get("role") as "creator" | "business") || "creator";

  const { user } = useAuth();

  const [offers, setOffers] = useState<CampaignOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [selectedOffer, setSelectedOffer] = useState<CampaignOffer | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolve profile id
  useEffect(() => {
    if (!user) return;

    const resolve = async () => {
      if (role === "business") {
        const { data } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        setProfileId(data?.id || null);
      } else {
        const { data } = await supabase
          .from("creator_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        setProfileId(data?.id || null);
      }
    };

    resolve();
  }, [user, role]);

  // Fetch offers from campaign_creators
  useEffect(() => {
    if (!profileId) return;

    const fetchOffers = async () => {
      setLoading(true);

      try {
        let query = supabase
          .from("campaign_creators")
          .select(`
            id,
            status,
            streams_target,
            total_earnings,
            paid_out,
            created_at,
            accepted_at,
            completed_at,
            campaigns!inner (
              id,
              name,
              type,
              pay_rate,
              bid_amount,
              budget,
              business_id
            )
          `);

        // Filter based on role
        if (role === "business") {
          // For businesses: get offers for their campaigns
          query = query.eq("campaigns.business_id", profileId);
        } else {
          // For creators: get offers sent to them
          query = query.eq("creator_id", profileId);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch additional data based on role
        const enrichedOffers = await Promise.all(
          (data || []).map(async (item: any) => {
            const baseOffer = {
              id: item.id,
              status: item.status.toLowerCase(),
              streams_target: item.streams_target,
              total_earnings: item.total_earnings || 0,
              paid_out: item.paid_out || 0,
              created_at: item.created_at,
              accepted_at: item.accepted_at,
              completed_at: item.completed_at,
              campaign: {
                id: item.campaigns.id,
                name: item.campaigns.name,
                type: item.campaigns.type,
                pay_rate: item.campaigns.pay_rate,
                bid_amount: item.campaigns.bid_amount,
                budget: item.campaigns.budget,
              }
            };

            // For creators: fetch business details
            if (role === "creator" && item.campaigns.business_id) {
              const { data: business } = await supabase
                .from("businesses")
                .select("id, business_name, logo_url")
                .eq("id", item.campaigns.business_id)
                .single();

              return {
                ...baseOffer,
                business: business ? {
                  id: business.id,
                  business_name: business.business_name,
                  logo_url: business.logo_url,
                } : undefined
              };
            }

            // For businesses: fetch creator details
            if (role === "business" && item.creator_id) {
              const { data: creator } = await supabase
                .from("creator_profiles")
                .select("id, full_name, avatar_url, username")
                .eq("id", item.creator_id)
                .single();

              return {
                ...baseOffer,
                creator: creator ? {
                  id: creator.id,
                  full_name: creator.full_name,
                  avatar_url: creator.avatar_url,
                  username: creator.username,
                } : undefined
              };
            }

            return baseOffer;
          })
        );

        setOffers(enrichedOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
        toast.error("Failed to load offers");
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [profileId, role]);

  // Realtime updates
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel("campaign-creators-realtime")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "campaign_creators" 
        },
        async (payload) => {
          console.log("Campaign creator update:", payload);

          if (payload.eventType === "INSERT") {
            // Fetch full data for new offer
            const { data } = await supabase
              .from("campaign_creators")
              .select(`
                id,
                status,
                streams_target,
                total_earnings,
                paid_out,
                created_at,
                accepted_at,
                completed_at,
                campaigns!inner (
                  id,
                  name,
                  type,
                  pay_rate,
                  bid_amount,
                  budget,
                  business_id
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              // Fetch related data based on role
              if (role === "creator" && data.campaigns.business_id) {
                const { data: business } = await supabase
                  .from("businesses")
                  .select("id, business_name, logo_url")
                  .eq("id", data.campaigns.business_id)
                  .single();

                setOffers(prev => [{
                  ...data,
                  status: data.status.toLowerCase(),
                  business: business ? {
                    id: business.id,
                    business_name: business.business_name,
                    logo_url: business.logo_url,
                  } : undefined,
                  campaign: data.campaigns
                }, ...prev]);
              }
            }
          }

          if (payload.eventType === "UPDATE") {
            setOffers(prev =>
              prev.map(o =>
                o.id === payload.new.id 
                  ? { ...o, status: payload.new.status.toLowerCase() } 
                  : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, role]);

  // Filter offers
  const filtered = offers.filter(o => {
    if (activeTab === "All") return true;
    return o.status === activeTab.toLowerCase();
  });

  // Accept offer (for creators)
  const handleAccept = async (offer: CampaignOffer) => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ 
          status: "active",
          accepted_at: new Date().toISOString()
        })
        .eq("id", offer.id);

      if (error) throw error;

      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, status: "active" } : o))
      );

      toast.success("Offer accepted! 🎉");
      setShowDetail(false);
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Failed to accept offer");
    } finally {
      setSubmitting(false);
    }
  };

  // Decline offer (for creators)
  const handleDecline = async (offer: CampaignOffer) => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("campaign_creators")
        .update({ 
          status: "declined",
          declined_at: new Date().toISOString()
        })
        .eq("id", offer.id);

      if (error) throw error;

      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, status: "declined" } : o))
      );

      toast.success("Offer declined");
      setShowDetail(false);
    } catch (error) {
      console.error("Error declining offer:", error);
      toast.error("Failed to decline offer");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (offer: CampaignOffer) => {
    setSelectedOffer(offer);
    setShowDetail(true);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getPrice = (offer: CampaignOffer) => {
    return offer.campaign.pay_rate || 
           offer.campaign.bid_amount || 
           offer.campaign.budget || 
           0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Offers" userType={role} />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
        </div>
        <BottomNav userType={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-[80px]">
      <AppHeader showBack title="Offers" userType={role} />

      <main className="max-w-[480px] mx-auto">

        {/* Tabs */}
        <div className="flex border-b-2 border-[#1D1D1D] overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab === "Active" ? Zap : 
                        tab === "Completed" ? CheckCircle2 :
                        tab === "Declined" ? X : Clock;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1 px-4 py-3 text-[9px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? "border-[#389C9A] text-[#389C9A]"
                    : "border-transparent text-[#1D1D1D]/40"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab}
              </button>
            );
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <Briefcase className="w-10 h-10 opacity-20" />
            <p className="text-[10px] uppercase opacity-40">
              No offers found
            </p>
          </div>
        ) : (
          filtered.map(offer => {
            const meta = STATUS_META[offer.status as keyof typeof STATUS_META];
            const price = getPrice(offer);
            const amount = offer.streams_target * price;
            const partyName = role === "business" 
              ? offer.creator?.full_name 
              : offer.business?.business_name;

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openDetail(offer)}
                className="border-b border-[#1D1D1D]/10 px-5 py-4 cursor-pointer hover:bg-[#F8F8F8] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-sm uppercase tracking-tight">
                        {partyName || "Unknown"}
                      </p>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-500 mb-2">
                      {offer.campaign.name} • {offer.streams_target} streams
                    </p>

                    <div className="flex items-center gap-3 text-[8px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(offer.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        £{price}/stream
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-lg text-[#389C9A]">
                      £{amount}
                    </p>
                    <p className="text-[8px] text-gray-400">
                      Total value
                    </p>
                  </div>
                </div>

                {offer.status === "pending" && role === "creator" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(offer);
                      }}
                      disabled={submitting}
                      className="flex-1 bg-[#1D1D1D] text-white py-2 text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecline(offer);
                      }}
                      disabled={submitting}
                      className="flex-1 border-2 border-[#1D1D1D] py-2 text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </main>

      <BottomNav userType={role} />

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedOffer && (
          <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white w-full max-w-[480px] rounded-t-3xl p-6"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic">
                    Offer Details
                  </h2>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {role === "business" ? "From" : "To"} {
                      role === "business" 
                        ? selectedOffer.creator?.full_name 
                        : selectedOffer.business?.business_name
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-[#F8F8F8] p-4 rounded-xl">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">
                    Campaign
                  </p>
                  <p className="font-black text-lg mb-1">{selectedOffer.campaign.name}</p>
                  <p className="text-xs text-gray-500">Type: {selectedOffer.campaign.type}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border-2 border-[#1D1D1D] p-4 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Streams</p>
                    <p className="text-2xl font-black">{selectedOffer.streams_target}</p>
                  </div>
                  <div className="border-2 border-[#1D1D1D] p-4 rounded-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Rate</p>
                    <p className="text-2xl font-black">£{getPrice(selectedOffer)}</p>
                  </div>
                </div>

                <div className="bg-[#1D1D1D] text-white p-4 rounded-xl">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Total Value</p>
                  <p className="text-3xl font-black text-[#FEDB71]">
                    £{selectedOffer.streams_target * getPrice(selectedOffer)}
                  </p>
                </div>

                <div className="text-[9px] text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedOffer.created_at).toLocaleString()}</p>
                  {selectedOffer.accepted_at && (
                    <p>Accepted: {new Date(selectedOffer.accepted_at).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {selectedOffer.status === "pending" && role === "creator" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(selectedOffer)}
                    disabled={submitting}
                    className="flex-1 bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors disabled:opacity-50"
                  >
                    Accept Offer
                  </button>
                  <button
                    onClick={() => handleDecline(selectedOffer)}
                    disabled={submitting}
                    className="flex-1 border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {selectedOffer.status !== "pending" && (
                <button
                  onClick={() => {
                    setShowDetail(false);
                    if (role === "business" && selectedOffer.creator) {
                      navigate(`/messages/${selectedOffer.creator.id}`);
                    } else if (role === "creator" && selectedOffer.business) {
                      navigate(`/messages/${selectedOffer.business.id}`);
                    }
                  }}
                  className="w-full border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message {role === "business" ? "Creator" : "Business"}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
