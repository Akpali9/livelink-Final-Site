import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { Toaster, toast } from "sonner";
import { AppHeader } from "../components/app-header";

export function BusinessDashboard() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<
    "LIVE" | "PENDING" | "COMPLETED"
  >("LIVE");

  /* ---------------------------------- */
  /* 1️⃣ GET LOGGED IN BUSINESS ID */
  /* ---------------------------------- */
  useEffect(() => {
    const fetchBusiness = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (business) setBusinessId(business.id);
    };

    fetchBusiness();
  }, []);

  /* ---------------------------------- */
  /* 2️⃣ FETCH DASHBOARD DATA */
  /* ---------------------------------- */
  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch campaigns
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_creators (
            id,
            status
          )
        `)
        .eq("business_id", businessId);

      // Fetch offers
      const { data: offerData } = await supabase
        .from("offers")
        .select(`
          *,
          creators (
            id,
            name,
            avatar
          ),
          campaigns (
            id,
            name,
            type
          )
        `)
        .eq("business_id", businessId)
        .in("status", ["Offer Received", "Negotiating"]);

      setCampaigns(campaignData || []);
      setOffers(offerData || []);
      setLoading(false);
    };

    fetchData();
  }, [businessId]);

  /* ---------------------------------- */
  /* 3️⃣ STATS */
  /* ---------------------------------- */
  const active = campaigns.filter(c => c.status === "ACTIVE").length;
  const pending = campaigns.filter(c => c.status === "PENDING REVIEW").length;

  const totalSpent = campaigns.reduce((sum, c) => {
    const num = parseInt(c.price?.replace(/[^\d]/g, "") || "0");
    return sum + num;
  }, 0);

  const stats = [
    { label: "Active", val: active, sub: "Live Now" },
    { label: "Pending", val: pending, sub: "Response" },
    { label: "Spent", val: `₦${totalSpent}`, sub: "Total" },
    { label: "Promo", val: "—", sub: "Used" }
  ];

  /* ---------------------------------- */
  /* 4️⃣ ACCEPT OFFER */
  /* ---------------------------------- */
  const acceptOffer = async (offer: any) => {
    await supabase
      .from("offers")
      .update({ status: "Accepted" })
      .eq("id", offer.id);

    await supabase.from("campaign_creators").insert({
      campaign_id: offer.campaigns.id,
      creator_id: offer.creators.id,
      status: "ACTIVE",
      streams_target: 4
    });

    toast.success("Offer accepted 🎉");

    setOffers(prev => prev.filter(o => o.id !== offer.id));
  };

  /* ---------------------------------- */
  /* 5️⃣ REJECT OFFER */
  /* ---------------------------------- */
  const rejectOffer = async (offerId: string) => {
    await supabase
      .from("offers")
      .update({ status: "Rejected" })
      .eq("id", offerId);

    toast.success("Offer rejected");

    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  /* ---------------------------------- */
  /* FILTER CAMPAIGNS */
  /* ---------------------------------- */
  const filteredCampaigns = campaigns.filter(c => {
    if (campaignFilter === "LIVE")
      return c.status === "ACTIVE" || c.status === "OPEN";
    if (campaignFilter === "PENDING")
      return c.status === "PENDING REVIEW";
    if (campaignFilter === "COMPLETED")
      return c.status === "COMPLETED";
    return false;
  });

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-white pb-20">
      <Toaster position="top-center" richColors />
      <AppHeader showLogo userType="business" subtitle="Business Hub" />

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 p-8">
        {stats.map((s, i) => (
          <div key={i} className="border p-6">
            <p className="text-xs uppercase opacity-50">{s.label}</p>
            <h2 className="text-2xl font-bold">{s.val}</h2>
            <p className="text-xs text-teal-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* CAMPAIGNS */}
      <div className="px-8">
        <h2 className="text-2xl font-bold mb-6">My Campaigns</h2>

        <div className="flex gap-4 mb-6">
          {["LIVE", "PENDING", "COMPLETED"].map(tab => (
            <button
              key={tab}
              onClick={() => setCampaignFilter(tab as any)}
              className={`px-4 py-2 border ${
                campaignFilter === tab ? "bg-black text-white" : ""
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredCampaigns.map(c => (
          <div
            key={c.id}
            onClick={() => navigate(`/business/campaign/${c.id}`)}
            className="border p-6 mb-4 cursor-pointer"
          >
            <h3 className="font-bold text-lg">{c.name}</h3>
            <p className="text-xs opacity-50">{c.type}</p>
            <p className="text-sm mt-2">
              {c.campaign_creators.length} creators joined
            </p>
          </div>
        ))}
      </div>

      {/* OFFERS */}
      {offers.length > 0 && (
        <div className="px-8 mt-16">
          <h2 className="text-2xl font-bold mb-6">Incoming Offers</h2>

          {offers.map(o => (
            <div key={o.id} className="border p-6 mb-4">
              <h3 className="font-bold">{o.campaigns.name}</h3>
              <p className="text-sm text-teal-600">{o.creators.name}</p>
              <p className="text-sm mt-2">{o.amount}</p>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => acceptOffer(o)}
                  className="bg-black text-white px-4 py-2"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectOffer(o.id)}
                  className="border px-4 py-2"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}