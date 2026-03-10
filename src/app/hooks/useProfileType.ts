import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type ProfileType = "creator" | "business" | null;

export function useProfileType() {
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [{ data: business }, { data: creator }] = await Promise.all([
        supabase.from("businesses").select("id").eq("user_id", session.user.id).single(),
        supabase.from("creators").select("id, name").eq("user_id", session.user.id).single(),
      ]);

      if (business) {
        setProfileType("business");
      } else if (creator && creator.name) {
        setProfileType("creator");
      }
      setLoading(false);
    };
    detect();
  }, []);

  return { profileType, loading };
}
