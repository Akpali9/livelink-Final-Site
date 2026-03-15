import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle2, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Creator {
  id: string;
  user_id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  category?: string;
  niches?: string[];
  availability?: string;
}

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  contact_name?: string;
  logo_url?: string;
  location?: string;
  website?: string;
}

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileType, setProfileType] = useState<"creator" | "business" | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

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
  );
}
