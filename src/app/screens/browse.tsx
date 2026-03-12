import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  Filter,
  ChevronRight,
  X,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["All", "Gaming", "Beauty", "Fitness", "Business", "Music", "Comedy"];
const PLATFORMS  = ["Twitch", "TikTok", "Instagram", "YouTube", "Kick", "Facebook"];
const COUNTRIES  = ["Any", "Nigeria", "South Africa", "Ghana", "Kenya", "United Kingdom", "United States"];

export function Browse() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("Any");
  const [search, setSearch] = useState("");
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const fetchCreators = async () => {
    setLoading(true);
    let query = supabase.from("creators").select("*");

    if (activeCategory !== "All") query = query.eq("category", activeCategory);
    if (selectedCountry !== "Any") query = query.eq("country", selectedCountry);
    if (selectedPlatforms.length > 0) query = query.overlaps("platforms", selectedPlatforms);
    if (search.trim()) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) setCreators(data);
    setLoading(false);
  };

  useEffect(() => { fetchCreators(); }, [activeCategory, selectedPlatforms, selectedCountry, search]);

  const activeFilters = selectedPlatforms.length + (selectedCountry !== "Any" ? 1 : 0);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">

      {/* ── Header ── */}
      <div className="px-6 pt-10 pb-4 border-b-2 border-[#1D1D1D] sticky top-0 bg-white z-30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-4 opacity-40 italic hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Browse</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic mt-0.5">
              {loading ? "—" : `${creators.length} creators`}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-2 px-4 py-2.5 border-2 text-[9px] font-black uppercase tracking-widest italic transition-colors ${
              showFilters || activeFilters > 0
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
            }`}
          >
            {showFilters ? <X className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
            Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#389C9A] text-white text-[8px] font-black flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search creators..."
            className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/20 focus:border-[#1D1D1D] py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-widest outline-none italic transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-[#1D1D1D]/30" />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-5 flex flex-col gap-5 border-t border-[#1D1D1D]/10 mt-4">
                {/* Platforms */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] italic text-[#1D1D1D]/40 mb-2">Platform</p>
                  <div className="flex gap-2 flex-wrap">
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                          selectedPlatforms.includes(p)
                            ? "bg-[#389C9A] border-[#389C9A] text-white"
                            : "border-[#1D1D1D]/20 hover:border-[#389C9A]"
                        }`}
                      >
                        {selectedPlatforms.includes(p) && <CheckCircle2 className="w-3 h-3" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] italic text-[#1D1D1D]/40 mb-2">Country</p>
                  <div className="flex gap-2 flex-wrap">
                    {COUNTRIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                          selectedCountry === c
                            ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]"
                            : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear */}
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setSelectedPlatforms([]); setSelectedCountry("Any"); }}
                    className="self-start text-[9px] font-black uppercase tracking-widest italic text-red-400 hover:text-red-600 underline transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Categories ── */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-[#1D1D1D]/10 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
              activeCategory === cat
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Creator List ── */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-4 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-2 border-[#1D1D1D]/10 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-[#F8F8F8]" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-[#F8F8F8] w-1/2" />
                    <div className="h-2 bg-[#F8F8F8] w-1/3" />
                    <div className="h-2 bg-[#F8F8F8] w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 border-2 border-[#1D1D1D]/20 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-[#1D1D1D]/20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest italic text-[#1D1D1D]/30">No creators found</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All"); setSelectedPlatforms([]); setSelectedCountry("Any"); }}
              className="mt-4 text-[9px] font-black uppercase tracking-widest italic text-[#389C9A] underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {creators.map((creator, idx) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link
                  to={`/profile/${creator.id}`}
                  className="flex items-start gap-4 p-5 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] active:bg-[#F8F8F8] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-20 h-20 border-2 border-[#1D1D1D] overflow-hidden flex-shrink-0 bg-[#F8F8F8]">
                    <ImageWithFallback
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[13px] font-black uppercase tracking-tight italic truncate">{creator.name}</h3>
                      {creator.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#389C9A] flex-shrink-0" />
                      )}
                    </div>

                    {creator.platforms?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {(Array.isArray(creator.platforms)
                          ? creator.platforms.map((p: any) => typeof p === "string" ? p : p.name)
                          : []
                        ).slice(0, 3).map((p: string) => (
                          <span key={p} className="text-[7px] px-2 py-0.5 bg-[#389C9A]/10 border border-[#389C9A]/20 text-[#389C9A] font-black uppercase italic">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {creator.avg_viewers && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase italic text-[#1D1D1D]/50">
                          <Zap className="w-3 h-3 text-[#389C9A]" />
                          {parseInt(creator.avg_viewers).toLocaleString()} avg
                        </span>
                      )}
                      {(creator.location || creator.city) && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase italic text-[#1D1D1D]/50">
                          <MapPin className="w-3 h-3" />
                          {creator.city || creator.location}
                        </span>
                      )}
                      {creator.niches?.length > 0 && (
                        <span className="text-[9px] font-bold uppercase italic text-[#1D1D1D]/40 truncate">
                          {(Array.isArray(creator.niches) ? creator.niches : []).slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + Arrow */}
                  <div className="flex flex-col items-end justify-between h-full flex-shrink-0 gap-2">
                    {creator.price && (
                      <div className="text-right">
                        <p className="text-[8px] font-bold uppercase italic text-[#1D1D1D]/30">From</p>
                        <p className="text-[13px] font-black italic text-[#389C9A]">
                          ₦{parseInt(creator.price).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div className="w-7 h-7 border-2 border-[#1D1D1D] flex items-center justify-center group-hover:bg-[#1D1D1D] transition-colors">
                      <ChevronRight className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
  X,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["All", "Gaming", "Beauty", "Fitness", "Business", "Music", "Comedy"];
const PLATFORMS  = ["Twitch", "TikTok", "Instagram", "YouTube", "Kick", "Facebook"];
const COUNTRIES  = ["Any", "Nigeria", "South Africa", "Ghana", "Kenya", "United Kingdom", "United States"];

export function Browse() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("Any");
  const [search, setSearch] = useState("");
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const fetchCreators = async () => {
    setLoading(true);
    let query = supabase.from("creators").select("*");

    if (activeCategory !== "All") query = query.eq("category", activeCategory);
    if (selectedCountry !== "Any") query = query.eq("country", selectedCountry);
    if (selectedPlatforms.length > 0) query = query.overlaps("platforms", selectedPlatforms);
    if (search.trim()) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) setCreators(data);
    setLoading(false);
  };

  useEffect(() => { fetchCreators(); }, [activeCategory, selectedPlatforms, selectedCountry, search]);

  const activeFilters = selectedPlatforms.length + (selectedCountry !== "Any" ? 1 : 0);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">

      {/* ── Header ── */}
      <div className="px-6 pt-10 pb-4 border-b-2 border-[#1D1D1D] sticky top-0 bg-white z-30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-4 opacity-40 italic hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Browse</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic mt-0.5">
              {loading ? "—" : `${creators.length} creators`}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-2 px-4 py-2.5 border-2 text-[9px] font-black uppercase tracking-widest italic transition-colors ${
              showFilters || activeFilters > 0
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
            }`}
          >
            {showFilters ? <X className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
            Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#389C9A] text-white text-[8px] font-black flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search creators..."
            className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/20 focus:border-[#1D1D1D] py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-widest outline-none italic transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-[#1D1D1D]/30" />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-5 flex flex-col gap-5 border-t border-[#1D1D1D]/10 mt-4">
                {/* Platforms */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] italic text-[#1D1D1D]/40 mb-2">Platform</p>
                  <div className="flex gap-2 flex-wrap">
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                          selectedPlatforms.includes(p)
                            ? "bg-[#389C9A] border-[#389C9A] text-white"
                            : "border-[#1D1D1D]/20 hover:border-[#389C9A]"
                        }`}
                      >
                        {selectedPlatforms.includes(p) && <CheckCircle2 className="w-3 h-3" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] italic text-[#1D1D1D]/40 mb-2">Country</p>
                  <div className="flex gap-2 flex-wrap">
                    {COUNTRIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
                          selectedCountry === c
                            ? "bg-[#FEDB71] border-[#1D1D1D] text-[#1D1D1D]"
                            : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear */}
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setSelectedPlatforms([]); setSelectedCountry("Any"); }}
                    className="self-start text-[9px] font-black uppercase tracking-widest italic text-red-400 hover:text-red-600 underline transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Categories ── */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-[#1D1D1D]/10 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 text-[9px] font-black uppercase tracking-widest italic border transition-colors ${
              activeCategory === cat
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                : "border-[#1D1D1D]/20 hover:border-[#1D1D1D]/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Creator List ── */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-4 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-2 border-[#1D1D1D]/10 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-[#F8F8F8]" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-[#F8F8F8] w-1/2" />
                    <div className="h-2 bg-[#F8F8F8] w-1/3" />
                    <div className="h-2 bg-[#F8F8F8] w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 border-2 border-[#1D1D1D]/20 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-[#1D1D1D]/20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest italic text-[#1D1D1D]/30">No creators found</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All"); setSelectedPlatforms([]); setSelectedCountry("Any"); }}
              className="mt-4 text-[9px] font-black uppercase tracking-widest italic text-[#389C9A] underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {creators.map((creator, idx) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link
                  to={`/profile/${creator.id}`}
                  className="flex items-start gap-4 p-5 border-b border-[#1D1D1D]/10 hover:bg-[#F8F8F8] active:bg-[#F8F8F8] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-20 h-20 border-2 border-[#1D1D1D] overflow-hidden flex-shrink-0 bg-[#F8F8F8]">
                    <ImageWithFallback
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[13px] font-black uppercase tracking-tight italic truncate">{creator.name}</h3>
                      {creator.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#389C9A] flex-shrink-0" />
                      )}
                    </div>

                    {/* Platforms */}
                    {creator.platforms?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {(Array.isArray(creator.platforms)
                          ? creator.platforms.map((p: any) => typeof p === "string" ? p : p.name)
                          : []
                        ).slice(0, 3).map((p: string) => (
                          <span key={p} className="text-[7px] px-2 py-0.5 bg-[#389C9A]/10 border border-[#389C9A]/20 text-[#389C9A] font-black uppercase italic">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {creator.avg_viewers && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase italic text-[#1D1D1D]/50">
                          <Zap className="w-3 h-3 text-[#389C9A]" />
                          {parseInt(creator.avg_viewers).toLocaleString()} avg
                        </span>
                      )}
                      {(creator.location || creator.city) && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase italic text-[#1D1D1D]/50">
                          <MapPin className="w-3 h-3" />
                          {creator.city || creator.location}
                        </span>
                      )}
                      {creator.niches?.length > 0 && (
                        <span className="text-[9px] font-bold uppercase italic text-[#1D1D1D]/40 truncate">
                          {(Array.isArray(creator.niches) ? creator.niches : []).slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + Arrow */}
                  <div className="flex flex-col items-end justify-between h-full flex-shrink-0 gap-2">
                    {creator.price && (
                      <div className="text-right">
                        <p className="text-[8px] font-bold uppercase italic text-[#1D1D1D]/30">From</p>
                        <p className="text-[13px] font-black italic text-[#389C9A]">
                          ₦{parseInt(creator.price).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div className={`w-7 h-7 border-2 border-[#1D1D1D] flex items-center justify-center group-hover:bg-[#1D1D1D] transition-colors`}>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
