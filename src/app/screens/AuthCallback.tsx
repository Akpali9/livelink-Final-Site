import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const role = url.searchParams.get("role");

      const { data } = await supabase.auth.getUser();

      if (!data.user) return;

      // create profile
      await supabase.from("profiles").upsert({
        id: data.user.id,
        role,
        full_name: data.user.user_metadata.full_name,
      });

      navigate("/dashboard");
    };

    run();
  }, []);

  return <p>Signing you in...</p>;
}