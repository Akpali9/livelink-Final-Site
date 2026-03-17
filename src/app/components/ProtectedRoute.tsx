// app/components/ProtectedRoute.tsx
import { Navigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
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
        setHasAccess(isAdmin);
        setLoading(false);
        return;
      }

      // Regular user type check
      if (userType && userTypeFromMeta !== userType) {
        console.log(`Access denied: user is ${userTypeFromMeta}, requires ${userType}`);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);
      setLoading(false);
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
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/login/portal" replace />;
  }

  return <>{children}</>;
}
