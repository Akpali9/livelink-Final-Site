import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner"; // optional notifications

export function BusinessAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        // 1️⃣ Sign up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        // 2️⃣ Insert into businesses table
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .insert({ user_id: authData.user!.id, business_name: businessName })
          .single();
        if (businessError) throw businessError;

        toast.success("Registration successful! Please check your email to confirm.");
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch business info
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", data.user!.id)
          .single();
        if (businessError) throw businessError;

        toast.success("Login successful!");
        console.log({ user: data.user, business: businessData });
        navigate("/business/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-lg shadow-md w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">
          {mode === "login" ? "Business Login" : "Register Business"}
        </h1>

        {mode === "register" && (
          <input
            type="text"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="border p-3 rounded w-full"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-3 rounded w-full"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-3 rounded w-full"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white py-3 rounded font-bold"
          disabled={loading}
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-2">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                className="text-blue-600 font-bold"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-blue-600 font-bold"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
