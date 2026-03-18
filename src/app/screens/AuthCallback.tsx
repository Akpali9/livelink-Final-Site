import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL parameters
        const url = new URL(window.location.href);
        const role = url.searchParams.get("role") || "creator";
        const email = url.searchParams.get("email");

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          console.log("No user found, redirecting to login");
          navigate("/login/portal");
          return;
        }

        console.log("Auth callback for user:", user.id, "role:", role);

        // Check what type of user this is and ensure profile exists
        if (role === "business") {
          // Check if business profile exists
          const { data: existingBusiness } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!existingBusiness) {
            // Create a minimal business profile if it doesn't exist
            const { error: insertError } = await supabase
              .from("businesses")
              .insert({
                user_id: user.id,
                email: user.email,
                business_name: user.user_metadata?.business_name || "Pending Setup",
                full_name: user.user_metadata?.full_name || "",
                application_status: "pending",
                status: "pending_review",
                created_at: new Date().toISOString()
              });

            if (insertError) {
              console.error("Error creating business profile:", insertError);
            } else {
              console.log("Business profile created");
            }
          }
          
          // Redirect to business dashboard
          navigate("/business/dashboard", { replace: true });
          
        } else {
          // Creator role (default)
          const { data: existingCreator } = await supabase
            .from("creator_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!existingCreator) {
            // Create a minimal creator profile if it doesn't exist
            const { error: insertError } = await supabase
              .from("creator_profiles")
              .insert({
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || "Pending Setup",
                username: user.email?.split('@')[0] || `user_${Date.now()}`,
                status: "pending_review",
                created_at: new Date().toISOString()
              });

            if (insertError) {
              console.error("Error creating creator profile:", insertError);
            } else {
              console.log("Creator profile created");
            }
          }
          
          // Redirect to creator dashboard
          navigate("/dashboard", { replace: true });
        }

        toast.success("Email confirmed successfully!");

      } catch (error) {
        console.error("Error in auth callback:", error);
        toast.error("Failed to complete authentication");
        navigate("/login/portal");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#1D1D1D] border-t-transparent animate-spin rounded-full mx-auto mb-4" />
        <p className="text-sm text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
}
