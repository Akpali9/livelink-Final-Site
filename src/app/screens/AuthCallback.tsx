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
        
        console.log("🔵 Auth callback started for role:", role);

        // Get the current user after email confirmation
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error("🔴 Error getting user:", userError);
          throw userError;
        }
        
        if (!user) {
          console.error("🔴 No user found after callback");
          throw new Error("No user found");
        }

        console.log("🟢 Auth callback successful for user:", {
          id: user.id,
          email: user.email,
          role: role,
          metadata: user.user_metadata
        });

        // Add a small delay to ensure database propagation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle based on role
        if (role === "business") {
          console.log("🔵 Checking for business profile with user_id:", user.id);
          
          // Check if business profile exists
          const { data: business, error: businessError } = await supabase
            .from("businesses")
            .select("id, status, application_status, business_name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (businessError) {
            console.error("🔴 Error checking business:", businessError);
          }

          if (business) {
            console.log("🟢 Business profile FOUND:", {
              id: business.id,
              status: business.status,
              appStatus: business.application_status,
              name: business.business_name
            });
            
            toast.success("Email confirmed successfully!");
            // ✅ Redirect to business dashboard
            navigate("/business/dashboard", { replace: true });
            return;
          } else {
            console.log("🟡 No business profile found - this shouldn't happen if registration worked");
            
            // Try one more time after a longer delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: retryBusiness } = await supabase
              .from("businesses")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();
              
            if (retryBusiness) {
              console.log("🟢 Found business on retry!");
              navigate("/business/dashboard", { replace: true });
              return;
            }
            
            // Last resort - try to create a minimal profile from metadata
            const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Business Owner";
            const businessName = user.user_metadata?.business_name || `${fullName}'s Business`;
            
            console.log("🟡 Attempting to create missing business profile...");
            
            const { data: newBusiness, error: insertError } = await supabase
              .from("businesses")
              .insert({
                user_id: user.id,
                business_name: businessName,
                full_name: fullName,
                email: user.email,
                status: 'pending_verification',
                application_status: 'pending',
                verification_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (insertError) {
              console.error("🔴 Auto-creation failed:", insertError);
              navigate("/become-business", { 
                replace: true,
                state: { 
                  email: user.email,
                  message: "Please complete your business profile"
                }
              });
            } else {
              console.log("🟢 Created missing business profile:", newBusiness);
              toast.success("Profile created! Redirecting to dashboard...");
              navigate("/business/dashboard", { replace: true });
            }
          }
        } else {
          // Creator role
          console.log("🔵 Checking for creator profile with user_id:", user.id);
          
          const { data: creator, error: creatorError } = await supabase
            .from("creator_profiles")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creatorError) {
            console.error("🔴 Error checking creator:", creatorError);
          }

          if (creator) {
            console.log("🟢 Creator profile found:", {
              id: creator.id,
              status: creator.status
            });
            
            toast.success("Email confirmed successfully!");
            navigate("/dashboard", { replace: true });
          } else {
            console.log("🟡 No creator profile found");
            navigate("/become-creator", { 
              replace: true,
              state: { email: user.email }
            });
          }
        }

      } catch (error) {
        console.error("🔴 Auth callback error:", error);
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
