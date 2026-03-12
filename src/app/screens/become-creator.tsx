import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

export function BecomeCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [avgConcurrent, setAvgConcurrent] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [bannerPicture, setBannerPicture] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Platforms options
  const platformOptions = ["YouTube", "Instagram", "TikTok", "Twitch", "Facebook", "Twitter"];

  // Handle file upload to Supabase Storage
  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("creator-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      return null;
    }

    // Get public URL
    const { publicUrl, error: urlError } = supabase.storage
      .from("creator-assets")
      .getPublicUrl(path);

    if (urlError) {
      console.error("URL error:", urlError);
      toast.error("Failed to get file URL");
      return null;
    }

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to become a creator");
      navigate("/login/portal");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!fullName || !username || !bio) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setLoading(true);

    try {
      // Upload profile and banner pictures
      let profileUrl = null;
      let bannerUrl = null;

      if (profilePicture) {
        profileUrl = await uploadFile(profilePicture, `profile_pictures/${user.id}`);
      }

      if (bannerPicture) {
        bannerUrl = await uploadFile(bannerPicture, `banner_pictures/${user.id}`);
      }

      // Insert into creator_profiles table
      const { data, error } = await supabase
        .from("creator_profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName,
          username,
          email,
          bio,
          avg_concurrent: avgConcurrent,
          followers_count: followersCount,
          platforms,
          profile_picture: profileUrl,
          banner_picture: bannerUrl,
          password, // optional: store hashed password if needed
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      toast.success("Creator profile successfully created!");
      navigate("/browse"); // Redirect to Browse page
    } catch (err) {
      console.error("Error creating profile:", err);
      toast.error("Failed to create creator profile");
    } finally {
      setLoading(false);
    }
  };

  // Handle platform toggle
  const togglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center py-10 px-4">
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-xl bg-white border-2 border-[#1D1D1D] rounded-xl p-8 flex flex-col gap-6"
      >
        <h2 className="text-2xl font-black uppercase tracking-tight text-[#1D1D1D]">Become a Creator</h2>

        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Full Name*</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="John Doe"
            required
          />
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Username*</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="john_doe"
            required
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Email*</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none bg-gray-100 cursor-not-allowed"
            disabled
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Password*</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="Enter a strong password"
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Confirm Password*</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="Re-enter password"
            required
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Bio*</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="Tell us about yourself..."
            rows={4}
            required
          />
        </div>

        {/* Avg Concurrent Viewers */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Average Concurrent Viewers</label>
          <input
            type="number"
            value={avgConcurrent}
            onChange={(e) => setAvgConcurrent(Number(e.target.value))}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="1000"
          />
        </div>

        {/* Followers Count */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Followers Count</label>
          <input
            type="number"
            value={followersCount}
            onChange={(e) => setFollowersCount(Number(e.target.value))}
            className="border-2 border-[#1D1D1D] p-3 rounded-md outline-none"
            placeholder="5000"
          />
        </div>

        {/* Platforms */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Platforms*</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {platformOptions.map(platform => (
              <button
                type="button"
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`px-4 py-2 border-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                  platforms.includes(platform)
                    ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                    : "bg-white text-[#1D1D1D]/80 border-[#1D1D1D]/20 hover:border-[#1D1D1D]"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Profile Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
          />
        </div>

        {/* Banner Picture */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black uppercase tracking-widest">Banner Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerPicture(e.target.files?.[0] || null)}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`mt-4 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
          }`}
        >
          {loading ? "Submitting..." : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
