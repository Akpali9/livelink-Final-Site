
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in → redirect to home
        navigate("/");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  if (loading) {
    return <p>Loading...</p>; // or a spinner
  }

  return <>{children}</>;
}