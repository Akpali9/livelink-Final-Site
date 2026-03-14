import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  MapPin,
  Loader2,
  Zap,
  Briefcase,
  ExternalLink,
  Users,
  Eye,
  Video,
  CheckCircle2,
  Edit2
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  username: string;
  bio: string;
  location: string;
  verified: boolean;
  category: string;
  platforms: any[];
  niches: any[];
  availability: string;
  stats?: {
    followers: number;
    avgViewers: number;
    totalStreams: number;
  };
}

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  logo_url: string;
  location: string;
  bio: string;
  website: string;
  verified: boolean;
  industry: string;
  industries: string[];
  campaign_types: string[];
  budget_range: string;
}

export function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [profileType, setProfileType] = useState<"creator" | "business" | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/");
        return;
      }

      const targetUserId = id === "me" ? session.user.id : id;
      setIsOwn(targetUserId === session.user.id);

      // -------------------- BUSINESS --------------------
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (businessData) {
        setProfileType("business");
        setBusiness({
          id: businessData.user_id,
          user_id: businessData.user_id,
          business_name: businessData.business_name || businessData.name || "Business",
          contact_name: businessData.contact_name || "",
          logo_url: businessData.logo_url || businessData.logo || "",
          location: businessData.location || "",
          bio: businessData.bio || "",
          website: businessData.website || "",
          verified: businessData.verified || false,
          industry: businessData.industry || "",
          industries: businessData.industries || [],
          campaign_types: businessData.campaign_types || [],
          budget_range: businessData.budget_range || "",
        });
        setLoading(false);
        return;
      }

      // -------------------- CREATOR --------------------
      const { data: creatorData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (creatorData) {
        setProfileType("creator");
        setCreator({
          id: creatorData.user_id,
          user_id: creatorData.user_id,
          full_name: creatorData.full_name || creatorData.name || "Creator",
          avatar_url: creatorData.avatar_url || creatorData.avatar || "",
          username: creatorData.username || "",
          bio: creatorData.bio || "",
          location: creatorData.location || "",
          verified: creatorData.verified || false,
          category: creatorData.category || "",
          platforms: creatorData.platforms || [],
          niches: creatorData.niches || [],
          availability: creatorData.availability || "Available for campaigns",
          stats: {
            followers: 0,
            avgViewers: 0,
            totalStreams: 0,
          },
        });
        setLoading(false);
        return;
      }

      // -------------------- NOT FOUND --------------------
      setLoading(false);
    };

    loadProfile();
  }, [id, navigate]);

  // -------------------- LOADING --------------------
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  // -------------------- NO PROFILE --------------------
  if (!profileType)
    return (
      <div className="flex flex-col min-h-screen bg-white pb-[80px]">
        <AppHeader showBack title="Profile" backPath="/dashboard" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">No profile found</p>
        </div>
        <BottomNav />
      </div>
    );

  // -------------------- PROFILE PAGE --------------------
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader
        showBack
        title={profileType === "creator" ? "Creator Profile" : "Business Profile"}
        backPath={profileType === "business" ? "/business/dashboard" : "/dashboard"}
      />

      <main className="max-w-[480px] mx-auto w-full">
        <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10">
          <div className="flex items-start gap-5">
            {/* Avatar / Logo */}
            <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
              {(profileType === "creator" ? creator?.avatar_url : business?.logo_url) ? (
                <img
                  src={profileType === "creator" ? creator?.avatar_url : business?.logo_url}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-8 h-8 opacity-20" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-black uppercase tracking-tight italic truncate">
                  {profileType === "creator"
                    ? creator?.full_name
                    : business?.business_name}
                </h1>
                {(creator?.verified || business?.verified) && (
                  <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                )}
              </div>

              {profileType === "creator" && creator?.username && (
                <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">
                  @{creator.username}
                </p>
              )}
              {profileType === "business" && business?.contact_name && (
                <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">
                  {business.contact_name}
                </p>
              )}

              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest italic ${
                  profileType === "creator"
                    ? "bg-[#389C9A]/10 text-[#389C9A]"
                    : "bg-[#FEDB71]/20 text-[#D4A800]"
                }`}
              >
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
                {profileType === "creator" ? creator?.location : business?.location}
              </span>
            </div>
          )}

          {/* Bio */}
          {(creator?.bio || business?.bio) && (
            <p className="mt-3 text-[12px] leading-relaxed text-[#1D1D1D]/70">
              {profileType === "creator" ? creator?.bio : business?.bio}
            </p>
          )}

          {/* Website */}
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

          {/* Edit button */}
          {isOwn && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 text-[10px] font-black uppercase tracking-widest italic border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}  };
}

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  logo_url: string;
  location: string;
  bio: string;
  website: string;
  verified: boolean;
  industry: string;
  industries: string[];
  campaign_types: string[];
  budget_range: string;
}

export function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [profileType, setProfileType] = useState<"creator" | "business" | null>(null);

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/");
        return;
      }

      const targetUserId = id === "me" ? session.user.id : id;

      setIsOwn(targetUserId === session.user.id);

      /* ---------------- BUSINESS ---------------- */

      const { data: businessData } = await supabase
        .from("businesses")
        .select(`
          user_id,
          business_name,
          contact_name,
          logo_url,
          location,
          bio,
          website,
          verified,
          industry,
          industries,
          campaign_types,
          budget_range
        `)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (businessData) {
        setProfileType("business");

        setBusiness({
          id: businessData.user_id,
          user_id: businessData.user_id,
          business_name: businessData.business_name || "Business",
          contact_name: businessData.contact_name || "",
          logo_url: businessData.logo_url || "",
          location: businessData.location || "",
          bio: businessData.bio || "",
          website: businessData.website || "",
          verified: businessData.verified || false,
          industry: businessData.industry || "",
          industries: businessData.industries || [],
          campaign_types: businessData.campaign_types || [],
          budget_range: businessData.budget_range || ""
        });

        setLoading(false);
        return;
      }

      /* ---------------- CREATOR ---------------- */

      const { data: creatorData } = await supabase
        .from("creator_profiles")
        .select(`
          user_id,
          full_name,
          avatar_url,
          username,
          bio,
          location,
          verified,
          category,
          platforms,
          niches,
          availability
        `)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (creatorData) {
        setProfileType("creator");

        setCreator({
          id: creatorData.user_id,
          user_id: creatorData.user_id,
          full_name: creatorData.full_name || "Creator",
          avatar_url: creatorData.avatar_url || "",
          username: creatorData.username || "",
          bio: creatorData.bio || "",
          location: creatorData.location || "",
          verified: creatorData.verified || false,
          category: creatorData.category || "",
          platforms: creatorData.platforms || [],
          niches: creatorData.niches || [],
          availability: creatorData.availability || "Available for campaigns",
          stats: {
            followers: 0,
            avgViewers: 0,
            totalStreams: 0
          }
        });

        setLoading(false);
        return;
      }

      setLoading(false);
    };

    loadProfile();
  }, [id, navigate]);

  /* ---------------- LOADING ---------------- */

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  /* ---------------- NO PROFILE ---------------- */

  if (!profileType)
    return (
      <div className="flex flex-col min-h-screen bg-white pb-[80px]">
        <AppHeader showBack title="Profile" backPath="/dashboard" />

        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">No profile found</p>
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

        {/* HERO */}

        <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10">
          <div className="flex items-start gap-5">

            {/* AVATAR */}

            <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8]">

              {(profileType === "creator"
                ? creator?.avatar_url
                : business?.logo_url) ? (

                <img
                  src={
                    profileType === "creator"
                      ? creator?.avatar_url
                      : business?.logo_url
                  }
                  className="w-full h-full object-cover"
                />

              ) : (
                <div className="opacity-20 p-4">
                  <Users />
                </div>
              )}
            </div>

            {/* INFO */}

            <div className="flex-1">

              <div className="flex items-center gap-2">

                <h1 className="text-lg font-black uppercase italic">

                  {profileType === "creator"
                    ? creator?.full_name
                    : business?.business_name}

                </h1>

                {(creator?.verified || business?.verified) && (
                  <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />
                )}

              </div>

              {profileType === "creator" && creator?.username && (
                <p className="text-xs text-gray-400">@{creator.username}</p>
              )}

              {profileType === "business" && business?.contact_name && (
                <p className="text-xs text-gray-400">{business.contact_name}</p>
              )}

              {/* BADGE */}

              <div className="mt-2">

                {profileType === "creator" ? (

                  <span className="flex items-center gap-1 text-xs text-[#389C9A]">
                    <Zap size={12} /> Creator
                  </span>

                ) : (

                  <span className="flex items-center gap-1 text-xs text-[#D4A800]">
                    <Briefcase size={12} /> Business
                  </span>

                )}

              </div>

            </div>
          </div>

          {/* LOCATION */}

          {(creator?.location || business?.location) && (
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
              <MapPin size={14} />
              {profileType === "creator"
                ? creator?.location
                : business?.location}
            </div>
          )}

          {/* BIO */}

          {(creator?.bio || business?.bio) && (
            <p className="mt-3 text-sm text-gray-600">
              {profileType === "creator"
                ? creator?.bio
                : business?.bio}
            </p>
          )}

          {/* WEBSITE */}

          {profileType === "business" && business?.website && (
            <a
              href={`https://${business.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-3 text-sm text-[#389C9A]"
            >
              <ExternalLink size={14} />
              {business.website}
            </a>
          )}

          {/* EDIT */}

          {isOwn && (
            <button
              onClick={() => navigate("/profile/edit")}
              className="mt-4 w-full border py-2 text-sm"
            >
              Edit Profile
            </button>
          )}

        </section>

      </main>

      <BottomNav />
    </div>
  );
}

/* ---------------- HELPERS ---------------- */

function formatNumber(n: string | number): string {

  const num = typeof n === "string" ? parseInt(n) : n;

  if (isNaN(num)) return String(n);

  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;

  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;

  return String(num);
            }text-[10px] font-black uppercase tracking-widest italic ${
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
            {creator.platforms && creator.platforms.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(creator.platforms) ? creator.platforms : []).map((p: any, idx: number) => (
                    <span key={idx}
                      className="px-3 py-1.5 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-widest italic">
                      {typeof p === "string" ? p : p.name || "Platform"}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Niches */}
            {creator.niches && creator.niches.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Content Niches</Label>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(creator.niches) ? creator.niches : []).map((n: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#FEDB71] border border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
                      {n}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Stats */}
            {creator.stats && (creator.stats.followers || creator.stats.avgViewers || creator.stats.totalStreams) && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Channel Stats</Label>
                <div className="grid grid-cols-3 gap-3">
                  {creator.stats.followers ? (
                    <StatCard icon={<Users className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.followers)} label="Followers" />
                  ) : null}
                  {creator.stats.avgViewers ? (
                    <StatCard icon={<Eye className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.avgViewers)} label="Avg Viewers" />
                  ) : null}
                  {creator.stats.totalStreams ? (
                    <StatCard icon={<Video className="w-3.5 h-3.5" />} value={formatNumber(creator.stats.totalStreams)} label="Streams" />
                  ) : null}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── BUSINESS SECTIONS ────────────────────────────── */}
        {profileType === "business" && business && (
          <>
            {/* Industry */}
            {business.industry && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Industry</Label>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-[#FEDB71] border border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
                    {business.industry}
                  </span>
                </div>
              </section>
            )}

            {/* Industries array if exists */}
            {business.industries && business.industries.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Industries</Label>
                <div className="flex flex-wrap gap-2">
                  {business.industries.map((i: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#FEDB71] border border-[#1D1D1D] text-[#1D1D1D] text-[9px] font-black uppercase tracking-widest italic">
                      {i}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Campaign Types */}
            {business.campaign_types && business.campaign_types.length > 0 && (
              <section className="px-6 py-5 border-b border-[#1D1D1D]/10">
                <Label>Campaign Types</Label>
                <div className="flex flex-wrap gap-2">
                  {business.campaign_types.map((c: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest italic">
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Budget Range */}
            {business.budget_range && (
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
