import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: "creator" | "business" | "both";
}

export function ProtectedRoute({ children, userType = "both" }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login portal if not authenticated
    return <Navigate to="/login/portal" state={{ from: location }} replace />;
  }

  // Check user type if needed
  if (userType !== "both") {
    // You'll need to determine the user type from your user metadata or a separate field
    // This is just an example - adjust based on your user structure
    const actualUserType = user?.user_metadata?.type || "creator";
    
    if (actualUserType !== userType) {
      // Redirect to appropriate dashboard if wrong user type
      const redirectPath = actualUserType === "business" ? "/business/dashboard" : "/dashboard";
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}