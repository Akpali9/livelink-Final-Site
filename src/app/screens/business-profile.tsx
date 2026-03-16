
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  User,
  Phone,
  MapPin,
  Share2,
  Plus,
  X,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase"; 

export function BusinessProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: "",
    yourName: "",
    contactNumber: "",
    email: "",
    website: "",
    industry: "E-commerce",
    country: "",
    bio: "",
  });
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const user = supabase.auth.user();

  // Fetch profile from Supabase on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setFormData({
          businessName: data.business_name,
          yourName: data.your_name,
          contactNumber: data.contact_number,
          email: data.email,
          website: data.website,
          industry: data.industry,
          country: data.country,
          bio: data.bio,
        });
        setSocialLinks(data.social_links || []);
      }
      if (error) console.log("Fetch profile error:", error.message);
    };

    fetchProfile();
  }, [user]);

  // Save profile to Supabase
  const handleSave = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("business_profiles")
      .upsert(
        {
          user_id: user.id,
          business_name: formData.businessName,
          your_name: formData.yourName,
          contact_number: formData.contactNumber,
          email: formData.email,
          website: formData.website,
          industry: formData.industry,
          country: formData.country,
          bio: formData.bio,
          social_links: socialLinks,
          updated_at: new Date(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.log("Save error:", error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addSocialLink = () => setSocialLinks([...socialLinks, ""]);
  const updateSocialLink = (index: number, val: string) => {
    const newLinks = [...socialLinks];
    newLinks[index] = val;
    setSocialLinks(newLinks);
  };
  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-44 text-[#1D1D1D]">
      <AppHeader showBack userType="business" title="Settings" />

      {/* Top Banner */}
      <div className="relative h-48 w-full bg-[#1D1D1D] flex items-end px-8 pb-8 border-b-4 border-[#389C9A]">
        <h1 className="text-[40px] font-black text-white uppercase tracking-tighter leading-none italic">
          Account Settings
        </h1>
      </div>

      <div className="px-8 mt-12 flex flex-col gap-12 max-w-[480px]">
        {/* Profile Details */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Profile Details
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Your Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.yourName}
                  onChange={(e) =>
                    setFormData({ ...formData, yourName: e.target.value })
                  }
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, contactNumber: e.target.value })
                  }
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Business Details */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Business Details
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Country
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder="e.g. United Kingdom"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Industry
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none appearance-none cursor-pointer rounded-none"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                >
                  <option>E-commerce</option>
                  <option>Software / SaaS</option>
                  <option>Fashion & Apparel</option>
                  <option>Gaming</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40 text-[#389C9A]" />
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Social Media Links
              </label>
              <div className="flex flex-col gap-2">
                {socialLinks.map((link, i) => (
                  <div key={i} className="relative group">
                    <Share2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateSocialLink(i, e.target.value)}
                      placeholder="https://"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 pr-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none transition-all"
                    />
                    {socialLinks.length > 1 && (
                      <button
                        onClick={() => removeSocialLink(i)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addSocialLink}
                className="flex items-center justify-center gap-2 border-2 border-[#1D1D1D] p-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-none italic"
              >
                <Plus className="w-4 h-4 text-[#389C9A]" /> Add Social Link
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                About your brand
              </label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none resize-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 border-t border-[#1D1D1D]/10">
          <button className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors italic">
            <Trash2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Deactivate Account
            </span>
          </button>
        </section>
      </div>

      {/* Sticky Bottom Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#1D1D1D]/10 z-50 max-w-[480px] mx-auto">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-between bg-[#1D1D1D] text-white p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-none italic border-2 border-[#1D1D1D]"
        >
          {saved ? "Changes Saved" : "Save All Changes"}
          {saved ? (
            <CheckCircle2 className="w-5 h-5 text-[#FEDB71]" />
          ) : (
            <ArrowRight className="w-5 h-5 text-[#FEDB71]" />
          )}
        </button>
      </div>
    </div>
  );
}