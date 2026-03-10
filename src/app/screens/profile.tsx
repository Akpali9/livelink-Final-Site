import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { MapPin, Loader2, Zap, Briefcase, ExternalLink, Users, Eye, Video, CheckCircle2, Edit2 } from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

export function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [profileType, setProfileType] = useState<"creator" | "business" | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }

      const targetUserId = id === "me" ? session.user.id : id;
      setIsOwn(targetUserId === session.user.id);

      const { data: biz } = await supabase
        .from("businesses").select("*").eq("user_id", targetUserId).maybeSingle();

      if (biz) {
        setProfileType("business");
        setBusiness(biz);
        setLoading(false);
        return;
      }

      const { data: cre } = await supabase
        .from("creators").select("*").eq("user_id", targetUserId).maybeSingle();

      if (cre) {
        setProfileType("creator");
        setCreator(cre);
      }

      setLoading(false);
    };
    load();
  }, [id, navigate]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  if (!profileType)
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
        <AppHeader showBack title="Profile" backPath="/dashboard" />
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4">
          <div className="w-16 h-16 bg-[#F8F8F8] border-2 border-[#1D1D1D]/10 flex items-center justify-center">
            <span className="text-2xl opacity-20">?</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">No profile found</p>
        </div>
        <BottomNav />
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader
        showBack
        title={profileType === "creator" ? "Creator Profile" : "Business Profile"}
        backPath={profileType === "business" ? "/business/dashboard" : "/dashboard"}
      />

      <main className="max-w-[480px] mx-auto w-full">

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10">
          <div className="flex items-start gap-5">

            {/* Avatar / Logo */}
            <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
              {(profileType === "creator" ? creator?.avatar : business?.logo) ? (
                <img
                  src={profileType === "creator" ? creator.avatar : business.logo}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="opacity-20 p-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    {profileType === "creator"
                      ? <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>
                      : <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" /></>
                    }
                  </svg>
                </div>
              )}
            </div>

            {/* Name / Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-black uppercase tracking-tight italic truncate">
                  {profileType === "creator" ? (creator?.name || "Creator") : (business?.company_name || "Business")}
                </h1>
                {(creator?.verified || business?.verified) && (
                  <CheckCircle2 className="w-4 h-4 text-[#389C9A] flex-shrink-0" />
                )}
              </div>

              {profileType === "creator" && creator?.username && (
                <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">@{creator.username}</p>
              )}
              {profileType === "business" && business?.contact_name && (
                <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">{business.contact_name}</p>
              )}

              {/* Type badge */}
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest italic ${
                profileType === "creator" ? "bg-[#389C9A]/10 text-[#389C9A]" : "bg-[#FEDB71]/20 text-[#D4A800]"
              }`}>
                {profileType === "creator" ? <Zap className="w-2.5 h-2.5" /> : <Briefcase className="w-2.5 h-2.5" />}
                {profileType === "creator" ? "Creator" : "Business"}
              </div>
            </div>
          </div>

          {/* Location */}
          {(creator?.location || business?.location) && (
            <div className="flex items-center gap-1.5 mt-4 text-[#1D1D1D]/40">
              <MapPin className="w-3 h-3" />
              <span className="text-[10px] font-bold italic">
                {profileType === "creator" ? creator.location : business.location}
              </span>
            </div>
          )}

          {/* Bio */}
          {(creator?.bio || business?.bio) && (
            <p className="mt-3 text-[12px] leading-relaxed text-[#1D1D1D]/70">
              {profileType === "creator" ? creator.bio : business.bio}
            </p>
          )}

          {/* Website (business) */}
          {profileType === "business" && business?.website && (
            <a
              href={`https://${business.website.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold italic text-[#389C9A] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {business.website.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* Edit button — only on own profile */}
          {isOwn && (
            <button
              onClick={() => navigate("/profile/edit")}
              className={`mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 text-[10px] font-black uppercase tracking-widest italic transition-colors ${
                profileType === "creator"
                  ? "border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white"
                  : "border-[#D4A800] text-[#D4A800] hover:bg-[#D4A800] hover:text-white"
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </section>

        {/* ── CREATOR SECTIONS ─────────────────────────────── */}
        {profileType === "creator" && (
          <>
            {/* Availability */}
            {creator?.availability && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Availability</Label>
                <div className={`inline-flex items-center gap-2 px-3 py-2 border text-[10px] font-black uppercase tracking-widest italic ${
                  creator.availability === "Available for campaigns"
                    ? "border-[#389C9A]/30 bg-[#389C9A]/5 text-[#389C9A]"
                    : creator.availability === "Limited availability"
                    ? "border-[#FEDB71]/50 bg-[#FEDB71]/10 text-[#D4A800]"
                    : "border-[#1D1D1D]/10 text-[#1D1D1D]/40"
                }`}>
                  <span className={`w-2 h-2 flex-shrink-0 rounded-full ${
                    creator.availability === "Available for campaigns" ? "bg-[#389C9A]"
                    : creator.availability === "Limited availability" ? "bg-[#FEDB71]"
                    : "bg-[#1D1D1D]/20"
                  }`} />
                  {creator.availability}
                </div>
              </section>
            )}

            {/* Platforms */}
            {creator?.platforms?.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {creator.platforms.map((p: any) => (
                    <span key={typeof p === "string" ? p : p.name}
                      className="px-3 py-1.5 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-widest italic">
                      {typeof p === "string" ? p : p.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Niches */}
            {creator?.niches?.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Content Niches</Label>
                <div className="flex flex-wrap gap-2">
                  {creator.niches.map((n: string) => (
                    <span key={n} className="px-3 py-1.5 bg-[#FEDB71] border border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
                      {n}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Stats */}
            {creator?.stats && (creator.stats.avgViewers || creator.stats.followers || creator.stats.totalStreams) && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Channel Stats</Label>
                <div className="grid grid-cols-3 gap-3">
                  {creator.stats.followers && (
                    <StatCard icon={<Users className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.followers)} label="Followers" />
                  )}
                  {creator.stats.avgViewers && (
                    <StatCard icon={<Eye className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.avgViewers)} label="Avg Viewers" />
                  )}
                  {creator.stats.totalStreams && (
                    <StatCard icon={<Video className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.totalStreams)} label="Streams" />
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── BUSINESS SECTIONS ────────────────────────────── */}
        {profileType === "business" && (
          <>
            {business?.industries?.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Industry</Label>
                <div className="flex flex-wrap gap-2">
                  {business.industries.map((i: string) => (
                    <span key={i} className="px-3 py-1.5 bg-[#FEDB71] border border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
                      {i}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {business?.campaign_types?.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Campaign Types</Label>
                <div className="flex flex-wrap gap-2">
                  {business.campaign_types.map((c: string) => (
                    <span key={c} className="px-3 py-1.5 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest italic">
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {business?.budget_range && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Campaign Budget</Label>
                <div className="inline-flex items-center gap-2 px-3 py-2 border-2 border-[#FEDB71] bg-[#FEDB71]/10 text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]">
                  {business.budget_range}
                </div>
              </section>
            )}
          </>
        )}

      </main>
      <BottomNav />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1D1D1D]/40 italic mb-3">{children}</p>;
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-3 border border-[#1D1D1D]/10 bg-[#F8F8F8]">
      <div className="text-[#389C9A]">{icon}</div>
      <span className="text-[13px] font-black italic">{value}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">{label}</span>
    </div>
  );
}

function formatNumber(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
