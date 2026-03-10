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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Offer {
  id: string;
  status: "pending" | "accepted" | "rejected" | "negotiating";
  streams: number;
  rate: number;
  amount: number;
  campaign_type: string;
  message?: string;
  created_at: string;

  creator?: { id: string; name: string; avatar?: string; username?: string };
  business?: { id: string; name: string; logo?: string };
  campaign?: { id: string; name: string; type: string };
}

interface CounterOffer {
  streams: string;
  rate: string;
  message: string;
}

const STATUS_META = {
  pending: {
    label: "Pending",
    bg: "bg-[#FEDB71]/10",
    text: "text-[#1D1D1D]",
    border: "border-[#FEDB71]/50",
  },
  negotiating: {
    label: "Negotiating",
    bg: "bg-[#389C9A]/10",
    text: "text-[#389C9A]",
    border: "border-[#389C9A]/30",
  },
  accepted: {
    label: "Accepted",
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-500",
    border: "border-red-200",
  },
};

const TABS = ["All", "Pending", "Negotiating", "Accepted", "Rejected"] as const;
type Tab = typeof TABS[number];

export function Offers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = (searchParams.get("role") as "creator" | "business") || "creator";

  const { user } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [showCounter, setShowCounter] = useState(false);

  const [counterOffer, setCounterOffer] = useState<CounterOffer>({
    streams: "",
    rate: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);

  /* Resolve profile id */

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

  /* Fetch offers */

  useEffect(() => {
    if (!profileId) return;

    const fetchOffers = async () => {
      setLoading(true);

      const column = role === "business" ? "business_id" : "creator_id";

      const { data, error } = await supabase
        .from("offers")
        .select(
          `
        *,
        creator:creator_profiles ( id, name, avatar, username ),
        business:businesses ( id, name, logo ),
        campaign:campaigns ( id, name, type )
      `
        )
        .eq(column, profileId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load offers");
      } else {
        setOffers(data || []);
      }

      setLoading(false);
    };

    fetchOffers();
  }, [profileId, role]);

  /* Realtime updates */

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel("offers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        payload => {
          console.log("Offer update:", payload);

          if (payload.eventType === "INSERT") {
            setOffers(prev => [payload.new as Offer, ...prev]);
          }

          if (payload.eventType === "UPDATE") {
            setOffers(prev =>
              prev.map(o =>
                o.id === payload.new.id ? (payload.new as Offer) : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  /* Filter */

  const filtered = offers.filter(o => {
    if (activeTab === "All") return true;
    return o.status === activeTab.toLowerCase();
  });

  /* Accept */

  const handleAccept = async (offer: Offer) => {
    setSubmitting(true);

    const { error } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offer.id);

    if (error) {
      toast.error("Failed to accept offer");
    } else {
      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, status: "accepted" } : o))
      );

      toast.success("Offer accepted!");
    }

    setSubmitting(false);
  };

  /* Reject */

  const handleReject = async (offer: Offer) => {
    setSubmitting(true);

    const { error } = await supabase
      .from("offers")
      .update({ status: "rejected" })
      .eq("id", offer.id);

    if (error) {
      toast.error("Failed to reject offer");
    } else {
      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, status: "rejected" } : o))
      );

      toast.success("Offer rejected");
    }

    setSubmitting(false);
    setShowDetail(false);
  };

  /* Counter offer */

  const handleCounter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOffer) return;

    const streams = parseInt(counterOffer.streams || "0");
    const rate = parseFloat(counterOffer.rate || "0");

    if (!streams || !rate) {
      toast.error("Enter valid numbers");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("offers")
      .update({
        status: "negotiating",
        streams,
        rate,
        amount: streams * rate,
        message: counterOffer.message,
      })
      .eq("id", selectedOffer.id);

    if (error) {
      toast.error("Failed to send counter offer");
    } else {
      toast.success("Counter offer sent!");

      setShowCounter(false);

      setCounterOffer({
        streams: "",
        rate: "",
        message: "",
      });
    }

    setSubmitting(false);
  };

  const openDetail = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowDetail(true);
    setShowCounter(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  /* Loading */

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
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest border-b-2 ${
                activeTab === tab
                  ? "border-[#389C9A] text-[#389C9A]"
                  : "border-transparent text-[#1D1D1D]/40"
              }`}
            >
              {tab}
            </button>
          ))}
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
            const meta = STATUS_META[offer.status];

            return (
              <motion.div
                key={offer.id}
                onClick={() => openDetail(offer)}
                className="border-b px-5 py-4 cursor-pointer hover:bg-[#F8F8F8]"
              >
                <div className="flex justify-between">

                  <div>
                    <p className="font-black text-sm">
                      {offer.business?.name || offer.creator?.name}
                    </p>

                    <p className="text-xs opacity-40">
                      {offer.streams} streams • £{offer.rate}/stream
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-[#389C9A]">
                      £{offer.amount}
                    </p>

                    <p className="text-[8px] opacity-40">
                      {formatDate(offer.created_at)}
                    </p>
                  </div>

                </div>

                <span
                  className={`inline-block mt-2 px-2 py-1 text-[8px] uppercase border ${meta.bg} ${meta.border}`}
                >
                  {meta.label}
                </span>
              </motion.div>
            );
          })
        )}
      </main>

      <BottomNav userType={role} />

      {/* Detail modal */}

      <AnimatePresence>
        {showDetail && selectedOffer && (
          <div className="fixed inset-0 bg-black/70 flex items-end justify-center">

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-[480px] p-6"
            >
              <h2 className="text-xl font-black mb-4">Offer Details</h2>

              <p className="mb-2">
                Streams: {selectedOffer.streams}
              </p>

              <p className="mb-2">
                Rate: £{selectedOffer.rate}
              </p>

              <p className="mb-4 font-black text-[#389C9A]">
                Total: £{selectedOffer.amount}
              </p>

              <div className="flex gap-2">

                <button
                  onClick={() => handleAccept(selectedOffer)}
                  className="flex-1 bg-black text-white py-3"
                >
                  Accept
                </button>

                <button
                  onClick={() => handleReject(selectedOffer)}
                  className="flex-1 border py-3"
                >
                  Reject
                </button>

              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
