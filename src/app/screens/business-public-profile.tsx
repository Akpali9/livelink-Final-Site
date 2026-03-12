import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Globe, MapPin, Building, Mail, Phone, Users,
  Calendar, Share2, CheckCircle2, Loader2, Instagram,
  Twitter, Linkedin, Youtube, Facebook, ArrowRight,
  Briefcase, ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";

interface BusinessPublicData {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  website: string;
  industry: string;
  country: string;
  bio: string;
  yearFounded?: string;
  employeeCount?: string;
  socialLinks: { platform: string; url: string }[];
  verificationStatus: string;
  activeCampaigns?: number;
}

const platformIcons: Record<string, React.FC<{ className?: string }>> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  facebook: Facebook,
};

export function BusinessPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [business, setBusiness] = useState<BusinessPublicData | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile =
    id === "me" || (user && business && business.id === id);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id) return;

      try {
        let query = supabase.from("businesses").select("*");

        if (id === "me" && user) {
          query = query.eq("user_id", user.id);
        } else {
          query = query.eq("id", id);
        }

        const { data, error } = await query.single();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setBusiness({
          id: data.id,
          businessName: data.business_name || "",
          contactName: data.contact_name || "",
          email: data.contact_email || "",
          website: data.website || "",
          industry: data.industry || "",
          country: data.country || "",
          bio: data.description || "",
          yearFounded: data.year_founded,
          employeeCount: data.employee_count,
          socialLinks: data.social_links || [],
          verificationStatus: data.verification_status || "unverified",
        });

        // Fetch active campaigns for this business
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("id, title, type, budget, created_at")
          .eq("business_id", data.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(3);

        setCampaigns(campaignData || []);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Business Profile" />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Business Profile" />
        <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center">
          <div className="w-16 h-16 bg-[#1D1D1D] flex items-center justify-center mb-6 rounded-2xl">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
            No Profile Found
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-8">
            This business profile doesn't exist yet
          </p>
          {isOwnProfile && (
            <button
              onClick={() => navigate("/business/profile")}
              className="flex items-center gap-2 bg-[#389C9A] text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] transition-colors"
            >
              Set Up Your Profile <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <AppHeader showBack title="Business Profile" userType="business" />

      {/* Hero Banner */}
      <div className="relative h-52 w-full bg-gradient-to-br from-[#1D1D1D] to-[#2d2d2d] flex items-end px-8 pb-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#389C9A] opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FEDB71] opacity-5 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-end gap-4 w-full">
          {/* Logo placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-[#389C9A] flex items-center justify-center border-4 border-white flex-shrink-0">
            <span className="text-white text-2xl font-black uppercase">
              {business.businessName.charAt(0)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic truncate">
                {business.businessName}
              </h1>
              {business.verificationStatus === "verified" && (
                <CheckCircle2 className="w-5 h-5 text-[#389C9A] flex-shrink-0" />
              )}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50 italic">
              {business.industry} • {business.country}
            </p>
          </div>

          {isOwnProfile && (
            <button
              onClick={() => navigate("/business/profile")}
              className="flex-shrink-0 px-3 py-2 bg-white/10 border border-white/20 text-white text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-8 mt-8 flex flex-col gap-8 max-w-[480px]">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Founded", value: business.yearFounded || "—" },
            { label: "Team Size", value: business.employeeCount || "—" },
            { label: "Campaigns", value: campaigns.length > 0 ? `${campaigns.length}+` : "0" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#F8F8F8] rounded-2xl p-4 text-center border-2 border-transparent hover:border-[#389C9A] transition-colors"
            >
              <p className="text-xl font-black italic">{stat.value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* About */}
        {business.bio && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-[#1D1D1D]/40 italic">
              About
            </h2>
            <p className="text-sm leading-relaxed text-[#1D1D1D]/70 font-medium">
              {business.bio}
            </p>
          </section>
        )}

        {/* Contact & Links */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-[#1D1D1D]/40 italic">
            Contact & Links
          </h2>
          <div className="flex flex-col gap-2">
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-xl border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
              >
                <Globe className="w-4 h-4 text-[#389C9A] flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-tight flex-1 truncate">
                  {business.website.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </a>
            )}
            {business.country && (
              <div className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-xl border border-[#1D1D1D]/10">
                <MapPin className="w-4 h-4 text-[#389C9A] flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-tight">{business.country}</span>
              </div>
            )}
          </div>
        </section>

        {/* Social Links */}
        {business.socialLinks.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-[#1D1D1D]/40 italic">
              Social Media
            </h2>
            <div className="flex gap-3 flex-wrap">
              {business.socialLinks.map((link, i) => {
                const Icon = platformIcons[link.platform.toLowerCase()] || Share2;
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-[#389C9A] hover:text-[#389C9A] transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {link.platform}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Campaigns */}
        {campaigns.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-[#1D1D1D]/40 italic">
              Active Campaigns
            </h2>
            <div className="flex flex-col gap-3">
              {campaigns.map((campaign) => (
                <motion.button
                  key={campaign.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                  className="flex items-center justify-between p-4 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 rounded-xl hover:border-[#389C9A] transition-all text-left w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#389C9A]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-[#389C9A]" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{campaign.title}</p>
                      <p className="text-[8px] font-bold text-[#1D1D1D]/40 uppercase tracking-widest mt-0.5">
                        {campaign.type}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#389C9A]" />
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Verification Badge */}
        {business.verificationStatus === "verified" && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-green-700">Verified Business</p>
              <p className="text-[8px] text-green-600 mt-0.5">
                This business has been verified by our team
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
