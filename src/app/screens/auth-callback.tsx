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
        
        console.log("Auth callback started for role:", role);

        // Get the current user after OAuth/email redirect
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          throw userError;
        }
        
        if (!user) {
          console.error("No user found after callback");
          throw new Error("No user found");
        }

        console.log("Auth callback successful for user:", {
          id: user.id,
          email: user.email,
          role: role,
          metadata: user.user_metadata
        });

        // Check what type of user this is based on role param
        if (role === "business") {
          // Check if business profile exists
          const { data: business, error: businessError } = await supabase
            .from("businesses")
            .select("id, status, application_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (businessError) {
            console.error("Error checking business:", businessError);
          }

          if (business) {
            console.log("Business profile found:", {
              id: business.id,
              status: business.status,
              appStatus: business.application_status
            });
            
            // Business exists - go to dashboard (they'll see pending banner if needed)
            toast.success("Email confirmed successfully!");
            navigate("/business/dashboard", { replace: true });
          } else {
            console.log("No business profile found - redirecting to complete registration");
            
            // Check if this user just registered and profile creation failed
            // Try to create a minimal profile automatically
            try {
              const { error: insertError } = await supabase
                .from("businesses")
                .insert({
                  user_id: user.id,
                  business_name: user.user_metadata?.business_name || "Pending Setup",
                  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Business Owner",
                  email: user.email,
                  status: "pending_review",
                  application_status: "pending",
                  verification_status: "pending",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (insertError) {
                console.error("Auto-creation failed:", insertError);
                // If auto-creation fails, send to registration form
                navigate("/become-business", { 
                  replace: true,
                  state: { 
                    email: user.email,
                    autoFill: true
                  }
                });
              } else {
                console.log("Auto-created business profile successfully");
                toast.success("Profile created! Redirecting to dashboard...");
                navigate("/business/dashboard", { replace: true });
              }
            } catch (insertErr) {
              console.error("Auto-creation exception:", insertErr);
              navigate("/become-business", { 
                replace: true,
                state: { email: user.email }
              });
            }
          }
        } else {
          // Creator role
          const { data: creator, error: creatorError } = await supabase
            .from("creator_profiles")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creatorError) {
            console.error("Error checking creator:", creatorError);
          }

          if (creator) {
            console.log("Creator profile found:", {
              id: creator.id,
              status: creator.status
            });
            
            toast.success("Email confirmed successfully!");
            navigate("/dashboard", { replace: true });
          } else {
            console.log("No creator profile found - redirecting to complete registration");
            
            // Try to auto-create a minimal creator profile
            try {
              const { error: insertError } = await supabase
                .from("creator_profiles")
                .insert({
                  user_id: user.id,
                  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Creator",
                  username: user.email?.split('@')[0] || `user_${Date.now()}`,
                  email: user.email,
                  status: "pending_review",
                  niche: [],
                  avg_viewers: 0,
                  total_streams: 0,
                  rating: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (insertError) {
                console.error("Auto-creation failed:", insertError);
                navigate("/become-creator", { 
                  replace: true,
                  state: { 
                    email: user.email,
                    autoFill: true
                  }
                });
              } else {
                console.log("Auto-created creator profile successfully");
                toast.success("Profile created! Redirecting to dashboard...");
                navigate("/dashboard", { replace: true });
              }
            } catch (insertErr) {
              console.error("Auto-creation exception:", insertErr);
              navigate("/become-creator", { 
                replace: true,
                state: { email: user.email }
              });
            }
          }
        }

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
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-[#389C9A] mx-auto mb-4" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full" />
          </div>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">
          Completing Your Sign In
        </h2>
        <p className="text-[#1D1D1D]/60">
          Please wait while we verify your email...
        </p>
      </div>
    </div>
  );
}
