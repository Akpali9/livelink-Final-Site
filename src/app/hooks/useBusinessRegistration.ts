import { useState } from "react";
import { supabase } from "../lib/supabase"; // client anon key for storage
import { toast } from "sonner";

export const useBusinessRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRegistration = async (formData: any, idFile: File) => {
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Upload ID file to Supabase Storage
      const fileExt = idFile.name.split(".").pop();
      const fileName = `ids/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("business-ids")
        .upload(fileName, idFile);

      if (uploadError) throw new Error(uploadError.message);

      // 2️⃣ Get public URL of uploaded file
      const { publicUrl } = supabase.storage.from("business-ids").getPublicUrl(fileName);

      // 3️⃣ Call serverless function to create Auth user + business
      const res = await fetch("/api/createBusinessUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, idFileUrl: publicUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      toast.error(err.message);
      return { success: false };
    }
  };

  return { submitRegistration, loading, error };
};
