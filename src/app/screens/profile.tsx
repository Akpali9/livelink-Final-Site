import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { MapPin, Loader2, Zap, Briefcase, Users, Eye, Video, CheckCircle2, Edit2, ExternalLink } from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

export function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/");
        return;
      }

      const userId = id === "me" ? session.user.id : id;
      setIsOwn(userId === session.user.id);

      // 1️⃣ Try business first
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (business) {
        setProfile({
          id: business.id,
          user_id: business.user_id,
          type: "business",
          name: business.business_name || business.contact_name || "Business",
          avatar: business.logo_url || "",
          bio: business.bio || "",
          location: business.location || "",
          website: business.website || "",
          campaign_types: business.campaign_types || [],
          budget_range: business.budget_range || "",
          verified: business.verified || false
        });
        setLoading(false);
        return;
      }

      // 2️⃣ Try creator_profiles
      const { data: creator } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (creator) {
        setProfile({
          id: creator.id,
          user_id: creator.user_id,
          type: "creator",
          name: creator.full_name || creator.username || "Creator",
          avatar: creator.avatar_url || "",
          username: creator.username || "",
          bio: creator.bio || "",
          location: creator.location || "",
          category: creator.category || "",
          platforms: creator.platforms || [],
          niches: creator.niches || [],
          availability: creator.availability || "Available for campaigns",
          stats: {
            followers: creator.avg_concurrent || 0,
            avgViewers: creator.avg_peak || 0,
            totalStreams: creator.avg_weekly || 0
          },
          verified: creator.verified || false
        });
        setLoading(false);
        return;
      }

      // 3️⃣ Fallback to auth users if no profile exists
      const { data: authUser } = await supabase
        .from("auth.users")
        .select("id, email, raw_user_meta_data")
        .eq("id", userId)
        .maybeSingle();

      if (authUser) {
        setProfile({
          id: authUser.id,
          user_id: authUser.id,
          type: "creator",
          name: authUser.raw_user_meta_data?.full_name || "Creator",
          avatar: authUser.raw_user_meta_data?.avatar_url || "",
          username: authUser.raw_user_meta_data?.username || "",
          bio: "",
          location: "",
          category: "",
          platforms: [],
          niches: [],
          availability: "Available for campaigns",
          stats: {
            followers: 0,
            avgViewers: 0,
            totalStreams: 0
          },
          verified: false
        });
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    loadProfile();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );
  }

  if (!profile) {
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
  }

  // ── Render profile ──
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader
        showBack
        title={profile.type === "creator" ? "Creator Profile" : "Business Profile"}
        backPath={profile.type === "business" ? "/business/dashboard" : "/dashboard"}
      />

      <main className="max-w-[480px] mx-auto w-full">
        {/* Hero */}
        <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10 flex items-start gap-5">
          <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center flex-shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <div className="opacity-20 p-4">
                <span>{profile.type === "creator" ? "👤" : "🏢"}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-black uppercase tracking-tight italic truncate">{profile.name}</h1>
              {profile.verified && <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />}
            </div>

            {profile.type === "creator" && profile.username && (
              <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">@{profile.username}</p>
            )}
            {profile.type === "business" && profile.website && (
              <p className="text-[10px] font-bold text-[#1D1D1D]/40 italic mb-2">{profile.website}</p>
            )}

            <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest italic ${
              profile.type === "creator" ? "bg-[#389C9A]/10 text-[#389C9A]" : "bg-[#FEDB71]/20 text-[#D4A800]"
            }`}>
              {profile.type === "creator" ? <Zap className="w-2.5 h-2.5" /> : <Briefcase className="w-2.5 h-2.5" />}
              {profile.type === "creator" ? "Creator" : "Business"}
            </div>
          </div>
        </section>

        {/* Location & Bio */}
        {profile.location && (
          <div className="flex items-center gap-1.5 mt-4 text-[#1D1D1D]/40">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] font-bold italic">{profile.location}</span>
          </div>
        )}
        {profile.bio && (
          <p className="mt-3 text-[12px] leading-relaxed text-[#1D1D1D]/70">{profile.bio}</p>
        )}

        {/* Website for business */}
        {profile.type === "business" && profile.website && (
          <a
            href={`https://${profile.website.replace(/^https?:\/\//, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold italic text-[#389C9A] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {profile.website.replace(/^https?:\/\//, "")}
          </a>
        )}

        {/* Edit button */}
        {isOwn && (
          <button
            onClick={() => navigate("/profile/edit")}
            className={`mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 text-[10px] font-black uppercase tracking-widest italic transition-colors ${
              profile.type === "creator"
                ? "border-[#389C9A] text-[#389C9A] hover:bg-[#389C9A] hover:text-white"
                : "border-[#D4A800] text-[#D4A800] hover:bg-[#D4A800] hover:text-white"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/");
        return;
      }

      const userId = id === "me" ? session.user.id : id;

      // 1️⃣ Try business first
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (businessData) {
        setProfileType("business");
        setBusiness(businessData);
        setLoading(false);
        return;
      }

      // 2️⃣ Try creators
      const { data: creatorData } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (creatorData) {
        setProfileType("creator");
        setCreator({
          id: creatorData.id,
          user_id: creatorData.user_id,
          full_name: creatorData.name,
          username: creatorData.username,
          avatar_url: creatorData.avatar_url,
          bio: creatorData.bio,
          location: creatorData.location,
          category: creatorData.category,
          niches: creatorData.niches || [],
          availability: creatorData.availability || "Available for campaigns"
        });
        setLoading(false);
        return;
      }

      // 3️⃣ Fallback: use auth.users if no creator/business exists
      const { data: authUser } = await supabase
        .from("users") // <-- use "auth.users" if using direct SQL
        .select("id, email, raw_user_meta_data")
        .eq("id", userId)
        .maybeSingle();

      if (authUser) {
        setProfileType("creator"); // default to creator
        setCreator({
          id: authUser.id,
          user_id: authUser.id,
          full_name: authUser.raw_user_meta_data?.full_name || "Creator",
          username: authUser.raw_user_meta_data?.username,
          avatar_url: authUser.raw_user_meta_data?.avatar_url,
          bio: "",
          location: "",
          category: "",
          niches: [],
          availability: "Available for campaigns"
        });
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    loadProfile();
  }, [id, navigate]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!profileType) return <div className="flex justify-center items-center h-screen">No profile found</div>;

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 mb-4 flex items-center justify-center">
        {profileType === "creator" ? (
          creator?.avatar_url ? <img src={creator.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : <span>?</span>
        ) : (
          business?.logo_url ? <img src={business.logo_url} alt="logo" className="w-full h-full object-cover" /> : <span>?</span>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-1">
        {profileType === "creator" ? creator?.full_name : business?.business_name}
        {(creator?.username || business?.contact_name) && <CheckCircle2 className="inline w-5 h-5 text-teal-500 ml-2" />}
      </h1>

      {profileType === "creator" && creator?.username && <p className="text-sm text-gray-500 mb-2">@{creator.username}</p>}
      {profileType === "business" && business?.contact_name && <p className="text-sm text-gray-500 mb-2">{business.contact_name}</p>}

      {(creator?.location || business?.location) && (
        <div className="flex items-center text-gray-500 mb-2 gap-1">
          <MapPin className="w-4 h-4" />
          <span>{profileType === "creator" ? creator?.location : business?.location}</span>
        </div>
      )}

      {creator?.bio && <p className="text-gray-700 mb-4">{creator.bio}</p>}

      {creator?.niches?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {creator.niches.map((niche, idx) => (
            <span key={idx} className="px-2 py-1 bg-yellow-200 text-gray-800 text-xs font-bold rounded">{niche}</span>
          ))}
        </div>
      )}

      {profileType === "business" && business?.website && (
        <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-teal-500 underline mb-4 block">
          {business.website}
        </a>
      )}
    </div>
  )
