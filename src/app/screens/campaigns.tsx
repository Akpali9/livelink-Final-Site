import React from "react";
import { useNavigate, Link } from "react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Video as VideoIcon
} from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { BottomNav } from "../components/bottom-nav";
import { AppHeader } from "../components/app-header";

export function Campaigns() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = React.useState("All");

  const campaigns = [
    {
      id: "1",
      business: "CloudSaaS",
      name: "API Tool Promo",
      status: "Active",
      progress: 33,
      streams: "4/12",
      earnings: "£180.00",
      logo: "https://images.unsplash.com/photo-1644088379091-d574269d422f?w=100&h=100&fit=crop"
    },
    {
      id: "102",
      business: "PrimeNest",
      name: "Property Showcase",
      status: "Upcoming",
      progress: 0,
      streams: "0/8",
      earnings: "£120.00",
      logo: "https://images.unsplash.com/photo-1622651132634-a7ed1fbb86dd?w=100&h=100&fit=crop"
    },
    {
      id: "103",
      business: "FitLife",
      name: "New Year Push",
      status: "Completed",
      progress: 100,
      streams: "12/12",
      earnings: "£240.00",
      logo: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=100&h=100&fit=crop"
    }
  ];

  const filteredCampaigns = campaigns.filter(camp => 
    activeFilter === "All" || camp.status === activeFilter
  );

  const filters = ["All", "Active", "Upcoming", "Completed"];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="My Campaigns" />
      
      <div className="px-6 py-6 sticky top-[84px] bg-white z-20 border-b border-[#1D1D1D]/10">
        <div className="flex items-center justify-between mb-6">
          <Link to="/browse-businesses" className="w-full bg-[#1D1D1D] text-white py-4 px-6 text-[10px] font-black uppercase italic tracking-widest flex items-center justify-between active:scale-[0.98] transition-all">
            Find New Opportunities
            <Plus className="w-5 h-5 text-[#FEDB71]" />
          </Link>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
          <input 
            placeholder="SEARCH CAMPAIGNS..."
            className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 py-3 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#1D1D1D] italic transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest italic border-2 transition-all ${
                activeFilter === filter 
                ? "bg-[#1D1D1D] text-white border-[#1D1D1D]" 
                : "bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]/40"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        <div className="flex flex-col gap-6">
          {filteredCampaigns.map((camp) => (
            <div 
              key={camp.id}
              onClick={() => navigate(`/campaign/live-update/${camp.id}`)}
              className="bg-white border-2 border-[#1D1D1D] p-6 flex flex-col gap-6 active:bg-[#F8F8F8] transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-[#1D1D1D]/10 grayscale group-hover:grayscale-0 transition-all">
                    <ImageWithFallback src={camp.logo} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1 group-hover:italic transition-all">{camp.business}</h3>
                    <p className="text-[10px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest italic">{camp.name}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest border ${
                  camp.status === 'Active' ? 'bg-[#389C9A] text-white border-[#389C9A]' :
                  camp.status === 'Upcoming' ? 'bg-[#FEDB71] text-[#1D1D1D] border-[#1D1D1D]/10' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {camp.status}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest italic">
                  <span className="opacity-40">Progress</span>
                  <span className="text-[#389C9A]">{camp.streams} Streams</span>
                </div>
                <div className="h-1 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden">
                  <div 
                    className={`h-full ${camp.status === 'Active' ? 'bg-[#389C9A]' : camp.status === 'Upcoming' ? 'bg-[#FEDB71]' : 'bg-gray-300'}`}
                    style={{ width: `${camp.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1 italic">Potential Earnings</p>
                  <p className="text-xl font-black italic leading-none text-[#389C9A]">{camp.earnings}</p>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest underline underline-offset-4 decoration-[#389C9A] text-[#1D1D1D]">
                  Manage <ChevronRight className="w-3 h-3 text-[#FEDB71]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State Help */}
        <div className="mt-12 p-8 border-2 border-dashed border-[#1D1D1D]/10 flex flex-col items-center text-center">
          <VideoIcon className="w-8 h-8 opacity-20 mb-4 text-[#389C9A]" />
          <p className="text-xs font-medium text-[#1D1D1D]/40 leading-relaxed max-w-[200px] italic">
            New campaigns appear here once you've been accepted by a brand.
          </p>
          <Link to="/browse-businesses" className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#389C9A] underline italic">
            Find Opportunities →
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
