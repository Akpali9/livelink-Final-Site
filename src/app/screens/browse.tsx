import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Search,
  Filter,
  ChevronRight,
  Star,
  X,
  ChevronLeft,
  CheckCircle2,
  Users,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

const categories = ["All", "Gaming", "Beauty", "Fitness", "Business", "Music", "Comedy", "Tech", "Lifestyle"];
const platforms = ["Twitch", "YouTube", "TikTok", "Instagram", "Facebook", "Kick"];
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

export function BrowseCreator() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
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
      // Start with base query for creator_profiles
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
        .eq("status", "active"); // Only show active creators

      // Apply filters
      if (activeCategory !== "All") {
        // Check if the niche array contains the category
        query = query.contains("niche", [activeCategory]);
      }

      if (selectedCountry !== "Any") {
        query = query.eq("country", selectedCountry);
      }

      if (search.trim() !== "") {
        query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
      }

      // Execute query
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Filter by platforms if needed (client-side filtering since platform is in related table)
      let filteredData = data || [];
      
      if (selectedPlatforms.length > 0) {
        filteredData = filteredData.filter((creator: any) => {
          const creatorPlatforms = creator.creator_platforms?.map((p: any) => p.platform_type) || [];
          return selectedPlatforms.some(p => creatorPlatforms.includes(p));
        });
      }

      setCreators(filteredData as CreatorWithPlatforms[]);

    } catch (error) {
      console.error("Error fetching creators:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [activeCategory, selectedPlatforms, selectedCountry, search]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
     
      {/* Search & Filters */}
      <div className="px-6 py-6 sticky top-[84px] bg-white z-20 border-b border-[#1D1D1D]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 italic">
          <ChevronLeft className="w-4 h-4 text-[#1D1D1D]" /> Back
        </button>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH CREATORS..."
              className="w-full bg-[#F8F8F8] border border-[#1D1D1D] py-4 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="border border-[#1D1D1D] p-4"
          >
            {showFilters ? <X size={16} /> : <Filter size={16} />}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-6 flex flex-col gap-6"
            >
              {/* Platforms */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-3">Platform</h3>
                <div className="flex gap-2 flex-wrap">
                  {platforms.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 flex items-center gap-1 ${
                        selectedPlatforms.includes(p)
                          ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                          : "bg-white text-[#1D1D1D]/60 border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                      }`}
                    >
                      {selectedPlatforms.includes(p) && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-3">Country</h3>
                <div className="flex gap-2 flex-wrap">
                  {countries.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCountry(c)}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 ${
                        selectedCountry === c
                          ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                          : "bg-white text-[#1D1D1D]/60 border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Categories */}
      <div className="py-4 border-b flex gap-2 px-6 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 whitespace-nowrap ${
              activeCategory === cat 
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" 
                : "bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="px-6 py-3 text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 border-b">
        {creators.length} Creator{creators.length !== 1 ? 's' : ''} Found
      </div>

      {/* Creators List */}
      <div className="flex-1">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] transition-colors"
            >
              <Link
                to={`/profile/${creator.id}`}
                className="flex items-center gap-4 p-6"
              >
                <ImageWithFallback
                  src={creator.avatar_url || "https://via.placeholder.com/100"}
                  alt={creator.full_name || "Creator"}
                  className="w-20 h-20 object-cover border-2 border-[#1D1D1D] grayscale hover:grayscale-0 transition-all rounded-xl"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-lg uppercase tracking-tight">
                      {creator.full_name}
                    </span>
                    {creator.username && (
                      <span className="text-[8px] font-bold text-[#1D1D1D]/40">
                        @{creator.username}
                      </span>
                    )}
                  </div>

                  {/* Platforms */}
                  {creator.platforms && creator.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {creator.platforms.slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          className="text-[7px] font-black uppercase bg-[#389C9A]/10 px-2 py-0.5 rounded-full border border-[#389C9A]/20"
                        >
                          {p.platform_type} · {p.followers_count?.toLocaleString() || 0}
                        </span>
                      ))}
                      {creator.platforms.length > 3 && (
                        <span className="text-[7px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded-full">
                          +{creator.platforms.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 mt-2 text-[9px] font-black">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#FEDB71]" />
                      {creator.rating?.toFixed(1) || "0.0"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#389C9A]" />
                      {creator.avg_viewers?.toLocaleString() || 0} viewers
                    </span>
                  </div>

                  {/* Niches */}
                  {creator.niche && creator.niche.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {creator.niche.slice(0, 2).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[6px] font-black uppercase bg-[#F8F8F8] px-2 py-0.5 rounded-full border border-[#1D1D1D]/10"
                        >
                          {tag}
                        </span>
                      ))}
                      {creator.niche.length > 2 && (
                        <span className="text-[6px] font-black uppercase bg-[#F8F8F8] px-2 py-0.5 rounded-full">
                          +{creator.niche.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <ChevronRight className="w-5 h-5 text-[#1D1D1D]/20 group-hover:text-[#1D1D1D]" />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
