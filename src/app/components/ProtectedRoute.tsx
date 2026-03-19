import { Navigate } from "react-router"; // ✅ Add this import
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ProtectedRoute({ 
  children, 
  userType 
}: { 
  children: React.ReactNode;
  userType?: "creator" | "business" | "admin";
}) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No user found, redirecting to login");
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setUser(user);

        // Get user metadata
        const userTypeFromMeta = user.user_metadata?.user_type;
        const userRole = user.user_metadata?.role;
        const isAdmin = userRole === "admin" || 
                       userTypeFromMeta === "admin" ||
                       user.user_metadata?.is_admin === true;

        console.log("ProtectedRoute check:", {
          email: user.email,
          userTypeFromMeta,
          userRole,
          isAdmin,
          requiredType: userType
        });

        // Admin access check
        if (userType === "admin") {
          if (!isAdmin) {
            console.log("Access denied: user is not admin");
            setError("Admin access required");
            setHasAccess(false);
            setLoading(false);
            return;
          }
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // For creator/business, verify against database tables
        if (userType === "creator") {
          const { data: creator, error: creatorError } = await supabase
            .from("creator_profiles")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creatorError) {
            console.error("Error checking creator profile:", creatorError);
            setError("Error verifying creator status");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          if (!creator) {
            console.log("No creator profile found");
            setError("Creator profile not found");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Check if creator is rejected
          if (creator.status === "rejected") {
            console.log("Creator application was rejected");
            setError("Your creator application has been rejected");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Allow access even if pending (they'll see the banner)
          console.log("Creator access granted, status:", creator.status);
          setHasAccess(true);
          setLoading(false);
          return;
        }

        if (userType === "business") {
          const { data: business, error: businessError } = await supabase
            .from("businesses")
            .select("id, status, application_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (businessError) {
            console.error("Error checking business profile:", businessError);
            setError("Error verifying business status");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          if (!business) {
            console.log("No business profile found");
            setError("Business profile not found");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Check if business is rejected
          if (business.status === "rejected" || business.application_status === "rejected") {
            console.log("Business application was rejected");
            setError("Your business application has been rejected");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Allow access even if pending (they'll see the banner)
          console.log("Business access granted, status:", business.status);
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // If no specific userType required, just having a user is enough
        setHasAccess(true);
        setLoading(false);

      } catch (error) {
        console.error("ProtectedRoute error:", error);
        setError("Authentication error");
        setHasAccess(false);
        setLoading(false);
      }
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => subscription?.unsubscribe();
  }, [userType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    // Store error message in state to show on login page
    if (error) {
      return <Navigate to={`/login/portal?error=${encodeURIComponent(error)}`} replace />;
    }
    return <Navigate to="/login/portal" replace />;
  }

  return <>{children}</>;
}
