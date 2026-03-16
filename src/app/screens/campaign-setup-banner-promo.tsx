import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Info,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Target,
  Globe,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Save,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";

const partnershipTypes = ["Pay + Code", "Paying", "Code Only", "Open to Offers"];
const industriesList = [
  "Health & Fitness",
  "Gaming",
  "Food & Drink",
  "Beauty & Skincare",
  "Tech & Software",
  "Fashion",
  "Beverage",
  "Home & Decor",
  "Travel",
  "Education",
  "Finance",
  "Automotive"
];

interface CampaignForm {
  name: string;
  industry: string;
  partnershipType: string;
  payRate: string;
  minViewers: number;
  location: string;
  description: string;
  nicheTags: string;
  responseRate: string;
  budgetRange: string;
  about: string;
  website?: string;
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
  streamsRequired: number;
}

export function CampaignSetupBannerPromo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [form, setForm] = useState<CampaignForm>({
    name: "",
    industry: "",
    partnershipType: "",
    payRate: "",
    minViewers: 0,
    location: "",
    description: "",
    nicheTags: "",
    responseRate: "",
    budgetRange: "",
    about: "",
    website: "",
    targetAudience: "",
    startDate: "",
    endDate: "",
    streamsRequired: 4
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
    }
  }, [user]);

  const fetchBusinessProfile = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    
    setBusinessProfile(data);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (type === 'logo') {
      setLogoFile(file);
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
    } else {
      setBannerFile(file);
      const preview = URL.createObjectURL(file);
      setBannerPreview(preview);
    }
  };

  const removeFile = (type: 'logo' | 'banner') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview(null);
    } else {
      setBannerFile(null);
      setBannerPreview(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .upload(fileName, file, { 
        cacheControl: "3600", 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("campaign-assets")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name) newErrors.name = "Campaign name is required";
    if (!form.industry) newErrors.industry = "Industry is required";
    if (!form.partnershipType) newErrors.partnershipType = "Partnership type is required";
    if (!form.payRate) newErrors.payRate = "Pay rate is required";
    if (form.minViewers < 0) newErrors.minViewers = "Minimum viewers must be 0 or greater";
    if (!form.location) newErrors.location = "Location is required";
    if (!form.description) newErrors.description = "Description is required";
    if (!logoFile) newErrors.logo = "Business logo is required";
    if (!bannerFile) newErrors.banner = "Campaign banner is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!businessProfile || businessProfile.application_status !== 'approved') {
      toast.error("Your business must be approved before creating campaigns");
      navigate("/business/profile");
      return;
    }

    setLoading(true);

    try {
      // Upload files
      let logoUrl = "";
      let bannerUrl = "";

      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `businesses/${businessProfile.id}/logos`);
      }

      if (bannerFile) {
        bannerUrl = await uploadFile(bannerFile, `businesses/${businessProfile.id}/banners`);
      }

      // Parse niche tags
      const nicheTagsArray = form.nicheTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Calculate budget
      const payRateValue = parseFloat(form.payRate) || 0;
      const totalBudget = payRateValue * form.streamsRequired;

      // Create campaign
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{
          business_id: businessProfile.id,
          name: form.name,
          type: form.partnershipType,
          description: form.description,
          about: form.about,
          industry: form.industry,
          location: form.location,
          budget: totalBudget,
          pay_rate: payRateValue,
          min_viewers: form.minViewers,
          streams_required: form.streamsRequired,
          niche_tags: nicheTagsArray,
          response_rate: form.responseRate,
          budget_range: form.budgetRange,
          website: form.website,
          target_audience: form.targetAudience,
          start_date: form.startDate,
          end_date: form.endDate,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          status: "pending_review",
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Campaign created successfully!");
      
      // Navigate to confirmation
      navigate(`/campaign/confirm/${data.id}`);

    } catch (error: any) {
      console.error("Error creating campaign:", error);
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <AppHeader showBack title="Create Campaign" />

      <main className="max-w-[480px] mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-[#389C9A]" />
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="e.g. Summer Sale 2024"
              className={`w-full p-4 border-2 rounded-xl outline-none transition-colors ${
                errors.name ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.name}</p>
            )}
          </div>

          {/* Industry & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Industry *</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({...form, industry: e.target.value})}
                className={`w-full p-4 border-2 rounded-xl outline-none ${
                  errors.industry ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
                }`}
              >
                <option value="">Select</option>
                {industriesList.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Partnership *</label>
              <select
                value={form.partnershipType}
                onChange={(e) => setForm({...form, partnershipType: e.target.value})}
                className={`w-full p-4 border-2 rounded-xl outline-none ${
                  errors.partnershipType ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
                }`}
              >
                <option value="">Select</option>
                {partnershipTypes.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pay Rate & Min Viewers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Pay Rate (₦) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm">₦</span>
                <input
                  type="number"
                  value={form.payRate}
                  onChange={(e) => setForm({...form, payRate: e.target.value})}
                  placeholder="25"
                  className={`w-full pl-10 p-4 border-2 rounded-xl outline-none ${
                    errors.payRate ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Min Viewers *</label>
              <input
                type="number"
                value={form.minViewers}
                onChange={(e) => setForm({...form, minViewers: parseInt(e.target.value)})}
                placeholder="100"
                className={`w-full p-4 border-2 rounded-xl outline-none ${
                  errors.minViewers ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
                }`}
              />
            </div>
          </div>

          {/* Location & Streams */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Location *</label>
              <input
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Remote / UK"
                className={`w-full p-4 border-2 rounded-xl outline-none ${
                  errors.location ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Streams Required</label>
              <input
                type="number"
                value={form.streamsRequired}
                onChange={(e) => setForm({...form, streamsRequired: parseInt(e.target.value)})}
                min="1"
                max="50"
                className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              rows={3}
              placeholder="Short description of your campaign..."
              className={`w-full p-4 border-2 rounded-xl outline-none resize-none ${
                errors.description ? 'border-red-500' : 'border-[#1D1D1D]/10 focus:border-[#389C9A]'
              }`}
            />
          </div>

          {/* About */}
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">About Campaign</label>
            <textarea
              value={form.about}
              onChange={(e) => setForm({...form, about: e.target.value})}
              rows={4}
              placeholder="Detailed information about your campaign..."
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none resize-none"
            />
          </div>

          {/* Niche Tags */}
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Niche Tags (comma separated)</label>
            <input
              value={form.nicheTags}
              onChange={(e) => setForm({...form, nicheTags: e.target.value})}
              placeholder="gaming, tech, software"
              className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Website (optional)</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#389C9A]" />
              <input
                value={form.website || ''}
                onChange={(e) => setForm({...form, website: e.target.value})}
                placeholder="https://yourbusiness.com"
                className="w-full pl-12 p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({...form, startDate: e.target.value})}
                className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({...form, endDate: e.target.value})}
                className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-3">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Business Logo *</label>
            
            {!logoPreview ? (
              <label className="block w-full aspect-video border-2 border-dashed border-[#1D1D1D]/20 bg-[#F8F8F8] rounded-xl cursor-pointer hover:border-[#389C9A] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logo')}
                  className="hidden"
                />
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <Upload className="w-8 h-8 text-[#389C9A]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">
                    Click to upload logo
                  </p>
                  <p className="text-[8px] font-medium opacity-40">PNG, JPG (Max 5MB)</p>
                </div>
              </label>
            ) : (
              <div className="relative aspect-video border-2 border-[#389C9A] rounded-xl overflow-hidden">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFile('logo')}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {errors.logo && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.logo}</p>
            )}
          </div>

          {/* Banner Upload */}
          <div className="space-y-3">
            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Campaign Banner *</label>
            
            {!bannerPreview ? (
              <label className="block w-full aspect-[4/1] border-2 border-dashed border-[#1D1D1D]/20 bg-[#F8F8F8] rounded-xl cursor-pointer hover:border-[#389C9A] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'banner')}
                  className="hidden"
                />
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-6 h-6 text-[#389C9A]" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Upload Banner</p>
                  <p className="text-[7px] font-medium opacity-40">1920 x 100px recommended</p>
                </div>
              </label>
            ) : (
              <div className="relative aspect-[4/1] border-2 border-[#389C9A] rounded-xl overflow-hidden">
                <img 
                  src={bannerPreview} 
                  alt="Banner preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFile('banner')}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {errors.banner && (
              <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{errors.banner}</p>
            )}
          </div>

          {/* Budget Summary */}
          <div className="bg-gradient-to-r from-[#1D1D1D] to-gray-800 p-6 rounded-xl text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#FEDB71]" />
              Campaign Budget Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Pay Rate per Stream</span>
                <span className="font-black">₦{parseFloat(form.payRate) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Streams Required</span>
                <span className="font-black">{form.streamsRequired}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Min. Viewers</span>
                <span className="font-black">{form.minViewers}</span>
              </div>
              <div className="border-t border-white/10 my-2 pt-2">
                <div className="flex justify-between text-lg font-black">
                  <span>Total Budget</span>
                  <span className="text-[#FEDB71]">₦{parseFloat(form.payRate) * form.streamsRequired || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1D] text-white py-6 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Campaign...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#FEDB71]" />
                Create Campaign
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}