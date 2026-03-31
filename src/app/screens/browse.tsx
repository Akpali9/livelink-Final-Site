import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Search,
  Filter,
  ChevronRight,
  Star,
  X,
  CheckCircle2,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

const categories = ["All", "Gaming", "Beauty", "Fitness", "Business", "Music", "Comedy", "Tech", "Lifestyle"];
const platforms = ["Twitch", "YouTube", "TikTok", "Instagram", "Facebook", "Kick"];
const audienceSizes = ["Any", "< 500", "500 - 2k", "2k+"];
const countries = ["Any", "United Kingdom", "United States", "Canada", "France", "Germany", "Nigeria"];

interface CreatorWithPlatforms {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  location: string;
  country: string;
  niche: string[];
  avg_viewers: number;
  total_streams: number;
  rating: number;
  status: string;
  created_at: string;
  platforms: {
    id: string;
    platform_type: string;
    followers_count: number;
    username: string;
  }[];
}

// Helper to compute total streams, avg viewers, and rating for a list of creators
async function computeCreatorStatsBatch(creatorIds: string[]) {
  if (creatorIds.length === 0) return { totalStreamsMap: {}, avgViewersMap: {}, ratingMap: {} };

  // 1. Total completed streams and completed campaigns per creator
  const { data: campaignData, error: campError } = await supabase
    .from("campaign_creators")
    .select("creator_id, streams_completed, streams_target, status")
    .in("creator_id", creatorIds)
    .in("status", ["active", "completed"]);

  if (campError) {
    console.error("Error fetching campaign_creators:", campError);
  }

  const totalStreamsMap: Record<string, number> = {};
  const completedCampaignsMap: Record<string, number> = {};
  if (campaignData) {
    for (const row of campaignData) {
      totalStreamsMap[row.creator_id] = (totalStreamsMap[row.creator_id] || 0) + (row.streams_completed || 0);
      if (row.streams_completed >= row.streams_target) {
        completedCampaignsMap[row.creator_id] = (completedCampaignsMap[row.creator_id] || 0) + 1;
      }
    }
  }

  // 2. Average viewers per creator from stream_proofs (if viewer_count column exists)
  let avgViewersMap: Record<string, number> = {};
  try {
    const { data: proofsData, error: proofsError } = await supabase
      .from("stream_proofs")
      .select("campaign_creator_id, viewer_count")
      .not("viewer_count", "is", null);

    if (!proofsError && proofsData) {
      // Get campaign_creator -> creator mapping
      const campaignCreatorIds = [...new Set(proofsData.map(p => p.campaign_creator_id))];
      if (campaignCreatorIds.length > 0) {
        const { data: ccData } = await supabase
          .from("campaign_creators")
          .select("id, creator_id")
          .in("id", campaignCreatorIds);
        const creatorIdByCcId: Record<string, string> = {};
        if (ccData) {
          for (const cc of ccData) {
            creatorIdByCcId[cc.id] = cc.creator_id;
          }
        }
        // Aggregate viewer counts per creator
        const viewerSum: Record<string, number> = {};
        const viewerCount: Record<string, number> = {};
        for (const p of proofsData) {
          const creatorId = creatorIdByCcId[p.campaign_creator_id];
          if (creatorId) {
            viewerSum[creatorId] = (viewerSum[creatorId] || 0) + (p.viewer_count || 0);
            viewerCount[creatorId] = (viewerCount[creatorId] || 0) + 1;
          }
        }
        for (const creatorId in viewerSum) {
          avgViewersMap[creatorId] = Math.round(viewerSum[creatorId] / viewerCount[creatorId]);
        }
      }
    }
  } catch (err) {
    console.warn("viewer_count column may not exist, skipping avg viewers from proofs.");
  }

  // 3. Compute rating based on completed campaigns
  const ratingMap: Record<string, number> = {};
  for (const creatorId of creatorIds) {
    const completed = completedCampaignsMap[creatorId] || 0;
    let rating = 0;
    if (completed >= 7) rating = 5;
    else if (completed >= 5) rating = 4;
    else if (completed >= 3) rating = 3;
    else if (completed >= 1) rating = 2;
    else rating = 0;
    ratingMap[creatorId] = rating;
  }

  return { totalStreamsMap, avgViewersMap, ratingMap };
}

export function BrowseCreators() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState("Any");
  const [selectedCountry, setSelectedCountry] = useState("Any");
  const [search, setSearch] = useState("");

  const [creators, setCreators] = useState<CreatorWithPlatforms[]>([]);
  const [loading, setLoading] = useState(true);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const fetchCreators = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("creator_profiles")
        .select(`
          id,
          user_id,
          full_name,
          username,
          avatar_url,
          bio,
          location,
          country,
          niche,
          avg_viewers,
          total_streams,
          rating,
          status,
          created_at,
          creator_platforms (
            id,
            platform_type,
            followers_count,
            username
          )
        `)
        .eq("status", "active");

      if (activeCategory !== "All") {
        query = query.contains("niche", [activeCategory]);
      }

      if (selectedCountry !== "Any") {
        query = query.eq("country", selectedCountry);
      }

      if (search.trim() !== "") {
        query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      let filteredData = data || [];

      if (selectedPlatforms.length > 0) {
        filteredData = filteredData.filter((creator: any) => {
          const creatorPlatforms = creator.creator_platforms?.map((p: any) => p.platform_type) || [];
          return selectedPlatforms.some(p => creatorPlatforms.includes(p));
        });
      }

      if (selectedAudience !== "Any") {
        filteredData = filteredData.filter((creator: any) => {
          const v = creator.avg_viewers || 0;
          if (selectedAudience === "< 500") return v < 500;
          if (selectedAudience === "500 - 2k") return v >= 500 && v <= 2000;
          if (selectedAudience === "2k+") return v > 2000;
          return true;
        });
      }

      // Compute real stats for the filtered creators
      const creatorIds = filteredData.map(c => c.id);
      const { totalStreamsMap, avgViewersMap, ratingMap } = await computeCreatorStatsBatch(creatorIds);

      // Merge computed stats into the objects
      const enriched = filteredData.map(creator => ({
        ...creator,
        total_streams: totalStreamsMap[creator.id] ?? creator.total_streams ?? 0,
        avg_viewers: avgViewersMap[creator.id] ?? creator.avg_viewers ?? 0,
        rating: ratingMap[creator.id] ?? creator.rating ?? 0,
      }));

      setCreators(enriched as CreatorWithPlatforms[]);
    } catch (error) {
      console.error("Error fetching creators:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [activeCategory, selectedPlatforms, selectedCountry, selectedAudience, search]);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
      <AppHeader title="Browse Creators" showBack={true} />

      {/* Search & Filters */}
      <div className="px-6 py-6 sticky top-[84px] bg-white z-20 border-b border-[#1D1D1D]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH CREATORS..."
              className="w-full bg-[#F8F8F8] border border-[#1D1D1D] py-4 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:bg-[#1D1D1D] focus:text-white transition-colors placeholder:text-[#1D1D1D]/40 italic"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`border border-[#1D1D1D] p-4 transition-all active:scale-95 ${showFilters ? "bg-[#1D1D1D] text-white" : "bg-white text-[#1D1D1D]"}`}
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4 text-[#389C9A]" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-8 flex flex-col gap-8">
                {/* Platforms Filter */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">Platform</h3>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                          selectedPlatforms.includes(p)
                            ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                            : "bg-white border-[#1D1D1D]/10"
                        }`}
                      >
                        {selectedPlatforms.includes(p) && <CheckCircle2 className="w-3 h-3 text-[#389C9A]" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience Size Filter */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">Avg. Viewers</h3>
                  <div className="flex flex-wrap gap-2">
                    {audienceSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedAudience(size)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                          selectedAudience === size
                            ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                            : "bg-white border-[#1D1D1D]/10"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country Filter */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">Country</h3>
                  <div className="flex flex-wrap gap-2">
                    {countries.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                          selectedCountry === c
                            ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                            : "bg-white border-[#1D1D1D]/10"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 pb-2 border-t border-[#1D1D1D]/10">
                  <button
                    onClick={() => {
                      setSelectedPlatforms([]);
                      setSelectedAudience("Any");
                      setSelectedCountry("Any");
                      setActiveCategory("All");
                      setSearch("");
                    }}
                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 hover:text-[#1D1D1D] transition-colors italic"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-4 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest italic"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="py-4 border-b border-[#1D1D1D] overflow-x-auto no-scrollbar flex gap-2 px-6 bg-[#F8F8F8]">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all italic ${
              activeCategory === cat
                ? "bg-[#1D1D1D] text-white"
                : "bg-white text-[#1D1D1D] border border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Creators Feed */}
      <div className="flex flex-col border-b border-[#1D1D1D] bg-white flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full" />
          </div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2">No creators found</p>
            <p className="text-[9px] text-gray-400 max-w-[250px]">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          creators.map((creator, idx) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b last:border-b-0 border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors"
            >
              <Link
                to={`/profile/${creator.id}`}
                className="flex items-center gap-4 p-6 group"
              >
                <div className="relative">
                  <ImageWithFallback
                    src={creator.avatar_url || "https://via.placeholder.com/100"}
                    alt={creator.full_name || "Creator"}
                    className="w-20 h-20 grayscale border border-[#1D1D1D] object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-xl uppercase tracking-tighter leading-none group-hover:italic transition-all text-[#1D1D1D]">
                        {creator.full_name}
                      </span>
                      {creator.username && (
                        <span className="text-[8px] font-bold text-[#1D1D1D]/40">
                          @{creator.username}
                        </span>
                      )}
                      {creator.platforms && creator.platforms.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {creator.platforms.slice(0, 2).map((p, i) => (
                            <span
                              key={i}
                              className="bg-[#389C9A]/10 text-[#389C9A] text-[7px] font-black px-1 py-0.5 border border-[#389C9A]/20 uppercase tracking-widest leading-none italic"
                            >
                              {p.platform_type}
                            </span>
                          ))}
                          {creator.platforms.length > 2 && (
                            <span className="bg-gray-100 text-[7px] font-black px-1 py-0.5 border border-gray-200 uppercase tracking-widest leading-none italic">
                              +{creator.platforms.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                        <Star className="w-3 h-3 fill-[#FEDB71] text-[#FEDB71]" />
                        {creator.rating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D] italic">
                        {creator.avg_viewers?.toLocaleString() || 0} VIEWERS
                      </span>
                    </div>
                  </div>

                  {creator.niche && creator.niche.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {creator.niche.slice(0, 2).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 bg-[#F8F8F8] px-2 py-0.5 border border-[#1D1D1D]/10 italic"
                        >
                          {tag}
                        </span>
                      ))}
                      {creator.niche.length > 2 && (
                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 bg-[#F8F8F8] px-2 py-0.5 border border-[#1D1D1D]/10 italic">
                          +{creator.niche.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                    {creator.total_streams || 0} streams
                  </span>
                  <ChevronRight className="w-4 h-4 mt-1 opacity-20 group-hover:opacity-100 transition-opacity text-[#1D1D1D]" />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
