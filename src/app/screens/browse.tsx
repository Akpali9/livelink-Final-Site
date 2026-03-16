import React, { useEffect, useState } from "react";
import { useNavigate,Link } from "react-router";
import {
  Search,
  Filter,
  ChevronRight,
  Star,
  X,
  ChevronLeft,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";

const categories = ["All", "Gaming", "Beauty", "Fitness", "Business", "Music", "Comedy"];
const platforms = ["Twitch", "TikTok", "Instagram", "YouTube"];
const countries = ["Any", "United Kingdom", "United States", "Canada", "France", "Germany"];

export function Browse() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("Any");
  const [search, setSearch] = useState("");

  const [creators, setCreators] = useState<any[]>([]);
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

    let query = supabase.from("creators").select("*");

    if (activeCategory !== "All") {
      query = query.eq("category", activeCategory);
    }

    if (selectedCountry !== "Any") {
      query = query.eq("country", selectedCountry);
    }

    if (selectedPlatforms.length > 0) {
      query = query.overlaps("platforms", selectedPlatforms);
    }

    if (search.trim() !== "") {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      setCreators(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCreators();
  }, [activeCategory, selectedPlatforms, selectedCountry, search]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* <AppHeader title="Browse Creators" showBack={true} /> */}
     
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
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden pt-6 flex flex-col gap-6"
            >
              {/* Platforms */}
              <div>
                <h3 className="text-xs font-bold mb-2">Platform</h3>
                <div className="flex gap-2 flex-wrap">
                  {platforms.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-2 text-xs border ${
                        selectedPlatforms.includes(p)
                          ? "bg-black text-white"
                          : "bg-white"
                      }`}
                    >
                      {selectedPlatforms.includes(p) && (
                        <CheckCircle2 size={12} />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <h3 className="text-xs font-bold mb-2">Country</h3>
                <div className="flex gap-2 flex-wrap">
                  {countries.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCountry(c)}
                      className={`px-3 py-2 text-xs border ${
                        selectedCountry === c
                          ? "bg-black text-white"
                          : "bg-white"
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
      <div className="py-4 border-b flex gap-2 px-6 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs border ${
              activeCategory === cat ? "bg-black text-white" : ""
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Creators List */}
      <div className="flex-1">
        {loading ? (
          <div className="p-10 text-center font-bold">Loading creators...</div>
        ) : creators.length === 0 ? (
          <div className="p-10 text-center font-bold">No creators found</div>
        ) : (
          creators.map((creator, idx) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b"
            >
              <Link
                to={`/profile/${creator.id}`}
                className="flex items-center gap-4 p-6"
              >
                <ImageWithFallback
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-20 h-20 object-cover border"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">
                      {creator.name}
                    </span>
                    {creator.platforms?.map((p: string) => (
                      <span
                        key={p}
                        className="text-[8px] px-2 py-1 bg-gray-100 border"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      {creator.rating}
                    </span>
                    <span>{creator.avg_viewers} viewers</span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {creator.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[8px] px-2 py-1 bg-gray-50 border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs">From</span>
                  <div className="text-lg font-bold text-green-600">
                    ₦{creator.price?.toLocaleString()}
                  </div>
                  <ChevronRight size={16} />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
