import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the role from URL params (business or creator)
        const role = searchParams.get("role") || "creator";
        
        // Get the current user after OAuth redirect
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("No user found");

        console.log("Auth callback successful for user:", user.id, "role:", role);

        // Check what type of user this is based on role param
        if (role === "business") {
          // Check if business profile exists
          const { data: business, error: businessError } = await supabase
            .from("businesses")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (businessError) throw businessError;

          if (business) {
            // Business exists - go to dashboard (they'll see pending banner if needed)
            navigate("/business/dashboard", { replace: true });
          } else {
            // No business profile - needs to complete registration
            navigate("/become-business", { replace: true });
          }
        } else {
          // Creator role
          const { data: creator, error: creatorError } = await supabase
            .from("creator_profiles")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creatorError) throw creatorError;

          if (creator) {
            // Creator exists - go to dashboard (they'll see pending banner if needed)
            navigate("/dashboard", { replace: true });
          } else {
            // No creator profile - needs to complete registration
            navigate("/become-creator", { replace: true });
          }
        }

        toast.success("Email confirmed successfully!");
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Failed to complete authentication");
        navigate("/login/portal");
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#389C9A] mx-auto mb-4" />
        <h2 className="text-xl font-black uppercase tracking-tighter italic mb-2">
          Completing sign in...
        </h2>
        <p className="text-[#1D1D1D]/60">Please wait a moment</p>
      </div>
    </div>
  );
}
