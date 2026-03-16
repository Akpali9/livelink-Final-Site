import React, { useState } from "react";
import { useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { Upload, X } from "lucide-react";
import { supabase } from "../lib/supabase"; 
const partnershipTypes = ["Pay + Code", "Paying", "Code Only", "Open to Offers"];
const industriesList = ["Health & Fitness", "Gaming", "Food & Drink", "Beauty & Skincare", "Tech & Software", "Fashion", "Beverage", "Home & Decor"];

export function CampaignSetupBannerPromo() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    logo: "",
    partnershipType: "",
    payRate: "",
    minViewers: 0,
    location: "",
    description: "",
    nicheTags: "",
    responseRate: "",
    budgetRange: "",
    about: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return "";
    const fileExt = logoFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("campaign-logos")
      .upload(fileName, logoFile, { cacheControl: "3600", upsert: true });
    if (error) {
      console.error(error);
      return "";
    }
    const url = supabase.storage.from("campaign-logos").getPublicUrl(fileName).data.publicUrl;
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let logoUrl = form.logo;
    if (logoFile) logoUrl = await uploadLogo();

    const { data, error } = await supabase
      .from("business_campaigns")
      .insert([{
        name: form.name,
        industry: form.industry,
        logo: logoUrl,
        partnership_type: form.partnershipType,
        pay_rate: form.payRate,
        min_viewers: form.minViewers,
        location: form.location,
        description: form.description,
        niche_tags: form.nicheTags.split(",").map(tag => tag.trim()),
        response_rate: form.responseRate,
        budget_range: form.budgetRange,
        about: form.about,
        is_verified: false,
        is_featured: false
      }]);

    setLoading(false);
    if (error) {
      alert("Error creating campaign: " + error.message);
      return;
    }
    alert("Campaign created successfully!");
    navigate("/browse-businesses");
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border-2 border-[#1D1D1D] rounded-xl shadow-lg my-10">
      <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Create Campaign</h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <input 
          placeholder="Campaign Name"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
          required
        />
        <select
          value={form.industry}
          onChange={e => setForm({...form, industry: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
          required
        >
          <option value="">Select Industry</option>
          {industriesList.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select
          value={form.partnershipType}
          onChange={e => setForm({...form, partnershipType: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
          required
        >
          <option value="">Select Partnership Type</option>
          {partnershipTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
        </select>
        <input 
          type="text"
          placeholder="Pay Rate (₦)"
          value={form.payRate}
          onChange={e => setForm({...form, payRate: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <input 
          type="number"
          placeholder="Min Viewers"
          value={form.minViewers}
          onChange={e => setForm({...form, minViewers: parseInt(e.target.value)})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <input 
          placeholder="Location"
          value={form.location}
          onChange={e => setForm({...form, location: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <textarea
          placeholder="Short Description"
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <input 
          placeholder="Niche Tags (comma separated)"
          value={form.nicheTags}
          onChange={e => setForm({...form, nicheTags: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <input 
          placeholder="Response Rate (e.g., 24h)"
          value={form.responseRate}
          onChange={e => setForm({...form, responseRate: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <input 
          placeholder="Budget Range (₦)"
          value={form.budgetRange}
          onChange={e => setForm({...form, budgetRange: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />
        <textarea
          placeholder="About Campaign"
          value={form.about}
          onChange={e => setForm({...form, about: e.target.value})}
          className="border-2 border-[#1D1D1D] p-3 rounded-lg focus:outline-none"
        />

        {/* Logo Upload */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-[#1D1D1D] text-white px-4 py-2 rounded-lg">
            <Upload className="w-4 h-4" /> Upload Logo/Banner
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
          {logoFile && (
            <span className="flex items-center gap-1 bg-[#F8F8F8] border border-[#1D1D1D] px-3 py-1 rounded-lg">
              {logoFile.name} <X className="w-3 h-3 cursor-pointer" onClick={() => setLogoFile(null)} />
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#389C9A] text-white font-black py-3 rounded-xl uppercase tracking-widest active:scale-[0.98] transition-all mt-4"
        >
          {loading ? "Creating..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}