import { Navigate, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";

export function ProtectedRoute({ 
  children, 
  userType 
}: { 
  children: React.ReactNode;
  userType?: "creator" | "business" | "admin";
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [rejectedEmail, setRejectedEmail] = useState("");

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
        setRejectedEmail(user.email || "");

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
            // Redirect to registration
            navigate(`/become-creator?email=${encodeURIComponent(user.email || '')}`);
            return;
          }

          // Handle rejected status
          if (creator.status === "rejected") {
            console.log("Creator application was rejected");
            setRejected(true);
            setError("Your creator application has been rejected");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Allow access if pending_verification, pending, or approved
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
            // Redirect to registration
            navigate(`/become-business?email=${encodeURIComponent(user.email || '')}`);
            return;
          }

          console.log("Business profile found:", {
            status: business.status,
            application_status: business.application_status
          });

          // Handle rejected status
          if (business.status === "rejected") {
            console.log("Business application was rejected");
            setRejected(true);
            setError("Your business application has been rejected");
            setHasAccess(false);
            setLoading(false);
            return;
          }

          // Allow access for allowed statuses
          const allowedStatuses = ["pending_verification", "pending", "approved"];
          
          if (allowedStatuses.includes(business.status)) {
            console.log("Business access granted, status:", business.status);
            setHasAccess(true);
            setLoading(false);
            return;
          }

          // If status is something else unexpected
          console.log("Unexpected business status:", business.status);
          setError("Your account has an invalid status");
          setHasAccess(false);
          setLoading(false);
        }

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
  }, [userType, navigate]);

  const handleReRegister = () => {
    if (userType === "business") {
      navigate(`/become-business?email=${encodeURIComponent(rejectedEmail)}&rejected=true`);
    } else {
      navigate(`/become-creator?email=${encodeURIComponent(rejectedEmail)}&rejected=true`);
    }
  };

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
    if (rejected) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 border-2 border-red-500 flex items-center justify-center mx-auto mb-6 rounded-full">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
              Application Rejected
            </h1>
            <p className="text-[#1D1D1D]/60 mb-6">
              {error || "Your application has been rejected."}
            </p>
            <p className="text-sm text-gray-600 mb-8">
              You can submit a new application with updated information.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleReRegister}
                className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors"
              >
                Submit New Application
              </button>
              <button
                onClick={() => navigate("/login/portal")}
                className="w-full border-2 border-[#1D1D1D] py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (error) {
      return <Navigate to={`/login/portal?error=${encodeURIComponent(error)}`} replace />;
    }
    return <Navigate to="/login/portal" replace />;
  }

  return <>{children}</>;
}
