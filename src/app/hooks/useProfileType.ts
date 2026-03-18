import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type ProfileType = "creator" | "business" | "admin" | null;

export function useProfileType() {
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const detect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) { 
          setLoading(false); 
          return; 
        }

        // Check user metadata first (fastest)
        const userType = session.user.user_metadata?.user_type || 
                         session.user.user_metadata?.role;

        if (userType === "admin") {
          setProfileType("admin");
          setLoading(false);
          return;
        }

        // Check businesses table
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors

        if (businessError) {
          console.error("Error checking business:", businessError);
        }

        if (business) {
          setProfileType("business");
          setProfileId(business.id);
          setLoading(false);
          return;
        }

        // Check creator_profiles table (fixed: was "creators")
        const { data: creator, error: creatorError } = await supabase
          .from("creator_profiles") // ✅ Fixed: correct table name
          .select("id, full_name, status")
          .eq("user_id", session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single

        if (creatorError) {
          console.error("Error checking creator:", creatorError);
        }

        if (creator) {
          setProfileType("creator");
          setProfileId(creator.id);
        }

      } catch (error) {
        console.error("Error detecting profile type:", error);
      } finally {
        setLoading(false);
      }
    };
    
    detect();
  }, []);

  return { 
    profileType, 
    profileId,
    loading,
    isCreator: profileType === "creator",
    isBusiness: profileType === "business",
    isAdmin: profileType === "admin"
  };
}

// Optional: Specialized hooks for common use cases
export function useIsCreator() {
  const { profileType, loading } = useProfileType();
  return { isCreator: profileType === "creator", loading };
}

export function useIsBusiness() {
  const { profileType, loading } = useProfileType();
  return { isBusiness: profileType === "business", loading };
}

export function useIsAdmin() {
  const { profileType, loading } = useProfileType();
  return { isAdmin: profileType === "admin", loading };
}
