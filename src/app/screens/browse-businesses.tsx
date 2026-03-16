import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, Filter, ArrowRight, X, Users, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { BottomNav } from "../components/bottom-nav";

const supabaseUrl = "https://bcteuanlownbanppggew.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdGV1YW5sb3duYmFucHBnZ2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDM4MDcsImV4cCI6MjA4NzY3OTgwN30.YW2O1MvkRkpB8ezedFdvwrWHymiXiHcrU5DGj1mmcg4";
const supabase = createClient(supabaseUrl, supabaseKey);

type PartnershipType = "Pay + Code" | "Paying" | "Code Only" | "Open to Offers";

interface BusinessCampaign {
  id: string;
  name: string;
  industry: string;
  logo: string;
  partnershipType: PartnershipType;
  payRate: string;
  minViewers: number;
  location: string;
  description: string;
  nicheTags: string[];
  responseRate: string;
  closingDate?: string;
  isVerified: boolean;
  isFeatured: boolean;
  budgetRange: string;
  about: string;
}

export function BrowseBusinesses() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<BusinessCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessCampaign | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ industry: string; type: string }>({ industry: "All", type: "All" });

  const creatorStats = { avgViewers: 250 };

  const userId = "CURRENT_USER_ID"; // replace with supabase.auth.getUser()?.id in real app

  useEffect(() => {
    async function fetchCampaigns() {
      const { data, error } = await supabase.from("business_campaigns").select("*");
      if (data) setCampaigns(data.map(b => ({
        ...b,
        partnershipType: b.partnership_type as PartnershipType,
        nicheTags: b.niche_tags || [],
        payRate: b.pay_rate
      })));
    }

    async function fetchUserData() {
      const { data: savedData } = await supabase
        .from("saved_campaigns")
        .select("campaign_id")
        .eq("user_id", userId);
      if (savedData) setSavedIds(new Set(savedData.map((s: any) => s.campaign_id)));

      const { data: appliedData } = await supabase
        .from("applications")
        .select("campaign_id")
        .eq("user_id", userId);
      if (appliedData) setAppliedIds(new Set(appliedData.map((a: any) => a.campaign_id)));
    }

    fetchCampaigns();
    fetchUserData();
  }, [userId]);

  const industries = ["All", ...Array.from(new Set(campaigns.map(b => b.industry)))];
  const types = ["All", "Pay + Code", "Paying", "Code Only"];

  const filteredData = useMemo(() => {
    return campaigns.filter(biz => {
      const matchesSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           biz.industry.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = activeFilters.industry === "All" || biz.industry === activeFilters.industry;
      const matchesType = activeFilters.type === "All" || biz.partnershipType === activeFilters.type;
      return matchesSearch && matchesIndustry && matchesType;
    });
  }, [searchQuery, activeFilters, campaigns]);

  const toggleSave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedIds.has(id)) {
      await supabase.from("saved_campaigns").delete().eq("user_id", userId).eq("campaign_id", id);
      setSavedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } else {
      await supabase.from("saved_campaigns").insert({ user_id: userId, campaign_id: id });
      setSavedIds(prev => new Set(prev).add(id));
    }
  };

  const applyToCampaign = async (id: string) => {
    await supabase.from("applications").insert({ user_id: userId, campaign_id: id });
    setAppliedIds(prev => new Set(prev).add(id));
    setTimeout(() => setSelectedBusiness(null), 1200);
  };

  const getBadgeColor = (type: PartnershipType) => {
    switch(type) {
      case "Pay + Code": return "bg-[#1D1D1D] text-white border-none";
      case "Paying": return "bg-[#389C9A] text-white border-none";
      case "Code Only": return "bg-[#FEDB71] text-[#1D1D1D] border-none";
      case "Open to Offers": return "bg-white text-[#1D1D1D] border-2 border-[#1D1D1D]";
      default: return "bg-[#1D1D1D] text-white";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] text-[#1D1D1D] font-sans overflow-x-hidden pb-[100px]">
      <div className="px-5 py-6 sticky top-[84px] bg-[#FDFDFD]/95 backdrop-blur-md z-20">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-20" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BRANDS..."
              className="w-full bg-white border-2 border-[#1D1D1D] py-4 pl-12 pr-4 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:bg-[#1D1D1D] focus:text-white transition-all italic"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`border-2 border-[#1D1D1D] px-5 transition-all active:scale-95 ${isFilterOpen ? 'bg-[#1D1D1D] text-white' : 'bg-white text-[#1D1D1D]'}`}
          >
            <Filter className={`w-5 h-5 ${isFilterOpen ? 'text-white' : 'text-[#389C9A]'}`} />
          </button>
        </div>
      </div>

      {/* Browse Feed */}
      <main className="flex-1 px-5 pt-4 flex flex-col gap-6">
        {filteredData.map((biz) => (
          <motion.div 
            key={biz.id} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setSelectedBusiness(biz)}
            className="relative bg-white border-2 border-[#1D1D1D] rounded-xl overflow-visible transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest z-10 ${getBadgeColor(biz.partnershipType)}`}>
              {biz.partnershipType}
            </div>

            <div className="p-6 flex gap-5">
              <div className="relative w-24 h-32 shrink-0 bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-lg overflow-hidden">
                <img src={biz.logo} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={biz.name} />
              </div>
              <div className="flex-1 flex flex-col justify-start gap-3 pt-2">
                <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{biz.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/40 italic">
                    {biz.industry.toUpperCase()} · {biz.location.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-[#1D1D1D]/60 italic line-clamp-2">{biz.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-3.5 h-3.5 text-[#389C9A]" />
                  <span className="text-[9px] font-bold text-[#1D1D1D]/50 italic">
                    Min. {biz.minViewers} avg viewers required
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-[#1D1D1D]" />

            <div className="bg-[#F8F8F8] p-6 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-black leading-none text-[#D2691E] tracking-tight">{biz.payRate}</p>
                <p className="text-[11px] font-medium leading-none text-[#D2691E]/70">for 4 Live Streams</p>
              </div>
              <button className="bg-[#1D1D1D] text-white px-6 py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:bg-[#389C9A] transition-all active:scale-[0.98] whitespace-nowrap">
                VIEW DETAILS <ArrowRight className="w-4 h-4 text-[#FEDB71]" />
              </button>
            </div>
          </motion.div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}