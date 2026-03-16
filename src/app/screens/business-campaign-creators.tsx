import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, Star, Tv } from "lucide-react";
import { AppHeader } from "../components/app-header";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";

export function BusinessCampaignCreators() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [campaign, setCampaign] = useState<any>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    setLoading(true);

    // 1️⃣ Fetch campaign
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campaignData) {
      setCampaign(campaignData);
    }

    // 2️⃣ Fetch creators linked to campaign
    const { data: linkedCreators } = await supabase
      .from("campaign_creators")
      .select(`
        id,
        status,
        streams_completed,
        streams_required,
        creators (
          id,
          name,
          handle,
          avatar,
          rating
        )
      `)
      .eq("campaign_id", id);

    if (linkedCreators) {
      setCreators(linkedCreators);
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!campaign) {
    return <div className="p-10 text-center">Campaign not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <AppHeader showBack backPath="/business/dashboard" title="Campaign Creators" />

      <main className="flex-1">
        {/* Campaign Header */}
        <section className="px-8 py-8 border-b-2 bg-gray-50">
          <h2 className="text-2xl font-black uppercase italic">
            {campaign.name}
          </h2>
          <p className="text-xs font-bold text-teal-600 uppercase">
            {campaign.type}
          </p>
        </section>

        {/* Creators List */}
        <section className="px-8 py-12">
          <div className="mb-8 flex justify-between">
            <h3 className="text-xs font-bold uppercase text-gray-400">
              Active Creators
            </h3>
            <span className="text-xs font-bold">
              {creators.length} Partners
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {creators.map((item: any) => {
              const creator = item.creators;

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    navigate(`/business/campaign/${campaign.id}/creator/${creator.id}`)
                  }
                  className="border-2 p-5 flex items-center gap-5 cursor-pointer"
                >
                  <div className="w-14 h-14 border overflow-hidden">
                    <ImageWithFallback
                      src={creator.avatar}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">
                        {creator.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs bg-yellow-200 px-2">
                        <Star size={10} />
                        {creator.rating}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      {creator.handle}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Tv size={12} />
                      Streams: {item.streams_completed}/{item.streams_required}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs px-2 py-1 ${
                        item.status === "ACTIVE"
                          ? "bg-teal-600 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {item.status}
                    </div>

                    <ChevronRight size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Browse Marketplace CTA */}
          <div className="mt-12 p-8 bg-black text-white">
            <h4 className="text-xs uppercase opacity-60">
              Need more creators?
            </h4>
            <p className="text-lg font-bold">
              Your campaign is still accepting applications.
            </p>
            <button
              onClick={() => navigate("/browse")}
              className="mt-4 text-yellow-400 text-xs uppercase flex items-center gap-2"
            >
              Browse Marketplace <ChevronRight size={12} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}