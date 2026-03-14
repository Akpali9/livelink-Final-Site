import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  MapPin,
  Loader2,
  Zap,
  Users,
  CheckCircle2,
  Edit2,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  location: string;
  verified: boolean;
  category: string;
  niches: string[];
  availability: string;
  stats?: {
    avgViewers: number;
    totalStreams: number;
  };
}

export function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      // 1️⃣ Get the authenticated session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/");
        return;
      }

      setAuthUser(session.user);

      const targetUserId = id === "me" ? session.user.id : id;
      setIsOwn(targetUserId === session.user.id);

      // 2️⃣ Try creator_profiles table
      const { data: creatorData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (creatorData) {
        setCreator({
          id: creatorData.id,
          user_id: creatorData.user_id,
          full_name: creatorData.full_name || "Creator",
          avatar_url: creatorData.avatar_url || "",
          bio: creatorData.bio || "",
          location: creatorData.location || "",
          verified: creatorData.verified || false,
          category: creatorData.category || "",
          niches: creatorData.niches || [],
          availability: "Available for campaigns",
          stats: {
            avgViewers: creatorData.avg_concurrent || 0,
            totalStreams: creatorData.avg_weekly || 0,
          },
        });
        setLoading(false);
        return;
      }

      // 3️⃣ Try legacy creators table
      const { data: legacy } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (legacy) {
        setCreator({
          id: legacy.id,
          user_id: legacy.user_id,
          full_name: legacy.name || "Creator",
          avatar_url: legacy.avatar || "",
          bio: legacy.bio || "",
          location: legacy.location || "",
          verified: legacy.verified || false,
          category: legacy.category || "",
          niches: legacy.niches || [],
          availability: legacy.availability || "Available for campaigns",
          stats: {
            avgViewers: legacy.avg_viewers || 0,
            totalStreams: legacy.total_streams || 0,
          },
        });
        setLoading(false);
        return;
      }

      // 4️⃣ Auth user exists but no profile yet
      setLoading(false);
    };

    loadProfile();
  }, [id, navigate]);

  // -------------------- Loading --------------------
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
      </div>
    );

  // -------------------- Auth user exists but no profile --------------------
  if (!creator)
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
        <AppHeader showBack title="Profile" backPath="/dashboard" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <div className="text-center">
            <Users className="w-16 h-16 opacity-20 mx-auto" />
            <p className="mt-4 text-gray-500">You don’t have a profile yet.</p>
          </div>
          {isOwn && (
            <button
              onClick={() => navigate("/profile/create")}
              className="mt-2 px-6 py-3 bg-[#389C9A] text-white font-bold uppercase tracking-widest rounded"
            >
              Create Profile
            </button>
          )}
        </div>
        <BottomNav />
      </div>
    );

  // -------------------- Profile exists --------------------
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Creator Profile" backPath="/dashboard" />

      <main className="max-w-[480px] mx-auto w-full">
        <section className="px-6 pt-8 pb-6 border-b border-[#1D1D1D]/10">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 border-4 border-[#1D1D1D] overflow-hidden bg-[#F8F8F8] flex items-center justify-center">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
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
                  {creator.full_name}
                </h1>
                {creator.verified && <CheckCircle2 className="w-4 h-4 text-[#389C9A]" />}
              </div>

              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest italic bg-[#389C9A]/10 text-[#389C9A]"
              >
                <Zap className="w-2.5 h-2.5" />
                Creator
              </div>
            </div>
          </div>

          {/* Location */}
          {creator.location && (
            <div className="flex items-center gap-1.5 mt-4 text-[#1D1D1D]/40">
              <MapPin className="w-3 h-3" />
              <span className="text-[10px] font-bold italic">{creator.location}</span>
            </div>
          )}

          {/* Bio */}
          {creator.bio && (
            <p className="mt-3 text-[12px] leading-relaxed text-[#1D1D1D]/70">
              {creator.bio}
            </p>
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
}
