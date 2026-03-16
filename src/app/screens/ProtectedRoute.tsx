import React, { JSX, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router";

interface Props {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthenticated(!!data.session);
      setLoading(false);
    };
    checkSession();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!authenticated) return <Navigate to="/login/creator" replace />;

  return children;
}