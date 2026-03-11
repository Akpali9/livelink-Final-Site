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
  Globe,
  Mail,
  Building,
  AlertCircle,
  Loader2,
  Save,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Upload,
  FileText,
  Download,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface BusinessProfileData {
  businessName: string;
  yourName: string;
  contactNumber: string;
  email: string;
  website: string;
  industry: string;
  country: string;
  bio: string;
  registrationNumber?: string;
  taxId?: string;
  yearFounded?: string;
  employeeCount?: string;
}

interface VerificationDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  size?: number;
}

export function BusinessProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<BusinessProfileData>({
    businessName: "",
    yourName: "",
    contactNumber: "",
    email: "",
    website: "",
    industry: "E-commerce",
    country: "",
    bio: "",
    registrationNumber: "",
    taxId: "",
    yearFounded: "",
    employeeCount: ""
  });
  
  const [socialLinks, setSocialLinks] = useState<{platform: string, url: string}[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'unverified' | 'rejected'>('unverified');
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const industryOptions = [
    "E-commerce",
    "Software / SaaS",
    "Fashion & Apparel",
    "Gaming",
    "Health & Wellness",
    "Food & Beverage",
    "Marketing & Advertising",
    "Education",
    "Finance",
    "Travel",
    "Entertainment",
    "Other"
  ];

  const platformIcons: Record<string, any> = {
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    facebook: Facebook,
    tiktok: () => <span className="text-sm">TikTok</span>,
    other: Share2
  };

  // Fetch profile and documents from Supabase on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch business profile
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error("Fetch profile error:", businessError.message);
        }

        if (businessData) {
          setFormData({
            businessName: businessData.business_name || "",
            yourName: businessData.contact_name || "",
            contactNumber: businessData.contact_phone || "",
            email: businessData.contact_email || "",
            website: businessData.website || "",
            industry: businessData.industry || "E-commerce",
            country: businessData.country || "",
            bio: businessData.description || "",
            registrationNumber: businessData.registration_number || "",
            taxId: businessData.tax_id || "",
            yearFounded: businessData.year_founded || "",
            employeeCount: businessData.employee_count || ""
          });
          setSocialLinks(businessData.social_links || []);
          setVerificationStatus(businessData.verification_status || 'unverified');
          setRejectionReason(businessData.rejection_reason || null);
        }

        // Fetch verification documents
        const { data: docsData, error: docsError } = await supabase
          .from("verification_documents")
          .select("*")
          .eq("business_id", businessData?.id)
          .order("uploaded_at", { ascending: false });

        if (docsError) {
          console.error("Fetch documents error:", docsError.message);
        }

        if (docsData) {
          setVerificationDocuments(docsData.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            type: doc.document_type,
            url: doc.file_url,
            status: doc.status,
            uploadedAt: doc.uploaded_at,
            size: doc.file_size
          })));
        }

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName) newErrors.businessName = "Business name is required";
    if (!formData.yourName) newErrors.yourName = "Your name is required";
    if (!formData.contactNumber) newErrors.contactNumber = "Contact number is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.country) newErrors.country = "Country is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save profile to Supabase
  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("businesses")
        .upsert(
          {
            user_id: user.id,
            business_name: formData.businessName,
            contact_name: formData.yourName,
            contact_phone: formData.contactNumber,
            contact_email: formData.email,
            website: formData.website || null,
            industry: formData.industry,
            country: formData.country,
            description: formData.bio || null,
            registration_number: formData.registrationNumber || null,
            tax_id: formData.taxId || null,
            year_founded: formData.yearFounded || null,
            employee_count: formData.employeeCount || null,
            social_links: socialLinks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      setSaved(true);
      toast.success("Profile saved successfully!");
      
      setTimeout(() => setSaved(false), 3000);

    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle file upload for verification documents
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    // Check file sizes (max 10MB per file)
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        toast.error(`File "${files[i].name}" exceeds 10MB limit`);
        return;
      }
    }

    setUploading(true);

    try {
      // Get the business ID first
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessError) throw businessError;
      if (!businessData) throw new Error("Business profile not found. Please save your profile first.");

      let uploadSuccess = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `verification-docs/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(filePath);

        // Save document record in database
        const { error: dbError } = await supabase
          .from("verification_documents")
          .insert({
            business_id: businessData.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            document_type: 'business_registration',
            status: 'pending',
            uploaded_at: new Date().toISOString()
          });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Failed to save ${file.name} record`);
          continue;
        }

        uploadSuccess = true;
      }

      if (uploadSuccess) {
        // Update business verification status to pending
        await supabase
          .from("businesses")
          .update({ 
            verification_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq("id", businessData.id);

        setVerificationStatus('pending');
        toast.success(`${files.length} document(s) uploaded successfully`);
        
        // Refresh documents list
        const { data: docsData } = await supabase
          .from("verification_documents")
          .select("*")
          .eq("business_id", businessData.id)
          .order("uploaded_at", { ascending: false });

        if (docsData) {
          setVerificationDocuments(docsData.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            type: doc.document_type,
            url: doc.file_url,
            status: doc.status,
            uploadedAt: doc.uploaded_at,
            size: doc.file_size
          })));
        }
      }

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Get document details first
      const docToDelete = verificationDocuments.find(doc => doc.id === documentId);
      
      // Delete from database
      const { error: dbError } = await supabase
        .from("verification_documents")
        .delete()
        .eq("id", documentId);

      if (dbError) throw dbError;

      // Try to delete from storage (optional - don't throw if fails)
      if (docToDelete) {
        const filePath = docToDelete.url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('verification-documents')
            .remove([`verification-docs/${filePath}`]);
        }
      }

      // Update local state
      setVerificationDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // If no documents left, reset verification status
      if (verificationDocuments.length <= 1) {
        const { data: businessData } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        if (businessData) {
          await supabase
            .from("businesses")
            .update({ 
              verification_status: 'unverified',
              rejection_reason: null 
            })
            .eq("id", businessData.id);
          
          setVerificationStatus('unverified');
          setRejectionReason(null);
        }
      }

      toast.success("Document deleted successfully");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete document");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Pending Review</span>;
    }
  };

  const getOverallStatusBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return <span className="px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Verified
        </span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Rejected</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Pending Review</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Not Verified</span>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack userType="business" title="Settings" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#389C9A]" />
            <p className="text-sm text-gray-500">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-44 text-[#1D1D1D]">
      <AppHeader showBack userType="business" title="Settings" />

      {/* Top Banner */}
      <div className="relative h-48 w-full bg-gradient-to-r from-[#1D1D1D] to-gray-800 flex items-end px-8 pb-8 border-b-4 border-[#389C9A]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#389C9A] opacity-10 rounded-full blur-3xl" />
        <h1 className="text-[40px] font-black text-white uppercase tracking-tighter leading-none italic relative z-10">
          Account Settings
        </h1>
      </div>

      {/* Verification Status Banner */}
      {verificationStatus !== 'verified' && verificationStatus !== 'unverified' && (
        <div className={`mx-8 mt-6 p-4 border-2 rounded-xl flex items-start gap-3 ${
          verificationStatus === 'rejected' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            verificationStatus === 'rejected' ? 'text-red-500' : 'text-amber-500'
          }`} />
          <div>
            <p className={`text-sm font-black mb-1 ${
              verificationStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
            }`}>
              {verificationStatus === 'rejected' ? 'Verification Rejected' : 'Verification Pending'}
            </p>
            <p className={`text-xs ${
              verificationStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {verificationStatus === 'rejected' 
                ? `Your documents were rejected: ${rejectionReason || 'Please upload valid business documents'}`
                : 'Your documents are under review. This usually takes 1-2 business days.'
              }
            </p>
          </div>
        </div>
      )}

      {verificationStatus === 'unverified' && (
        <div className="mx-8 mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-blue-700 mb-1">Verification Required</p>
            <p className="text-xs text-blue-600">
              Complete your profile and upload verification documents to start creating campaigns and receiving payments.
            </p>
          </div>
        </div>
      )}

      <div className="px-8 mt-12 flex flex-col gap-12 max-w-[480px]">
        {/* Profile Details */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Profile Details
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.yourName}
                  onChange={(e) => setFormData({ ...formData, yourName: e.target.value })}
                  className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${
                    errors.yourName ? 'border-red-500' : 'border-[#1D1D1D]/10'
                  }`}
                  placeholder="John Doe"
                />
                {errors.yourName && (
                  <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.yourName}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${
                    errors.email ? 'border-red-500' : 'border-[#1D1D1D]/10'
                  }`}
                  placeholder="contact@business.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${
                    errors.contactNumber ? 'border-red-500' : 'border-[#1D1D1D]/10'
                  }`}
                  placeholder="+44 123 456 7890"
                />
                {errors.contactNumber && (
                  <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.contactNumber}</p>
                )}
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
                Business Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${
                    errors.businessName ? 'border-red-500' : 'border-[#1D1D1D]/10'
                  }`}
                  placeholder="Acme Inc."
                />
                {errors.businessName && (
                  <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.businessName}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. United Kingdom"
                  className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all ${
                    errors.country ? 'border-red-500' : 'border-[#1D1D1D]/10'
                  }`}
                />
                {errors.country && (
                  <p className="text-red-500 text-[8px] font-black uppercase tracking-widest mt-1">{errors.country}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Website
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.com"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Industry
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none appearance-none cursor-pointer rounded-xl pr-12"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  {industryOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40 text-[#389C9A]" />
              </div>
            </div>

            {/* Additional Business Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="12345678"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Tax ID / VAT
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="GB123456789"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Year Founded
                </label>
                <input
                  type="text"
                  value={formData.yearFounded}
                  onChange={(e) => setFormData({ ...formData, yearFounded: e.target.value })}
                  placeholder="2020"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  Employees
                </label>
                <select
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                >
                  <option value="">Select</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex flex-col gap-3 mt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                Social Media Links
              </label>
              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {socialLinks.map((link, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="relative group"
                    >
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        {getPlatformIcon(link.platform)}
                      </div>
                      <select
                        value={link.platform}
                        onChange={(e) => updateSocialLink(i, 'platform', e.target.value)}
                        className="absolute left-12 top-1/2 -translate-y-1/2 bg-transparent text-[8px] font-black uppercase tracking-widest outline-none"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="twitter">Twitter</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                        <option value="tiktok">TikTok</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                        placeholder="https://"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-32 pr-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl transition-all"
                      />
                      {socialLinks.length > 1 && (
                        <button
                          onClick={() => removeSocialLink(i)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <button
                onClick={addSocialLink}
                className="flex items-center justify-center gap-2 border-2 border-[#1D1D1D] p-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl italic"
              >
                <Plus className="w-4 h-4 text-[#389C9A]" /> Add Social Link
              </button>
            </div>

            {/* About Section */}
            <div className="flex flex-col gap-1.5 mt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/60 italic">
                About your brand
              </label>
              <textarea
                rows={5}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell creators about your brand, mission, and what makes you unique..."
                className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-xl resize-none transition-all"
                maxLength={500}
              />
              <div className="text-right text-[8px] font-bold text-[#1D1D1D]/30">
                {formData.bio.length}/500
              </div>
            </div>
          </div>
        </section>

        {/* Verification Documents */}
        <section className="pt-8 border-t border-[#1D1D1D]/10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Verification Documents
          </h2>
          
          <div className="bg-[#F8F8F8] p-6 rounded-xl border-2 border-dashed border-[#1D1D1D]/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-black mb-1">Business Verification</p>
                <p className="text-[9px] opacity-40">Upload your business registration documents for admin approval</p>
              </div>
              {getOverallStatusBadge()}
            </div>

            {/* Document List */}
            {verificationDocuments.length > 0 && (
              <div className="mb-6 space-y-3">
                {verificationDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white p-4 rounded-xl border border-[#1D1D1D]/10 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[#389C9A] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold mb-1">{doc.name}</p>
                        <div className="flex items-center gap-2 text-[8px] text-[#1D1D1D]/40">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="p-2 hover:bg-[#1D1D1D]/5 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Section - Only show if not verified */}
            {verificationStatus !== 'verified' && (
              <div>
                <input
                  type="file"
                  id="document-upload"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="document-upload"
                  className={`w-full py-4 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    uploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {verificationDocuments.length > 0 ? 'Upload Additional Documents' : 'Upload Documents'}
                    </>
                  )}
                </label>
                <p className="text-[8px] text-center mt-3 text-[#1D1D1D]/40">
                  Accepted formats: PDF, JPG, PNG, DOC (Max 10MB per file)
                </p>
                <p className="text-[8px] text-center mt-1 text-[#1D1D1D]/40">
                  Upload business registration, tax documents, or proof of address
                </p>
              </div>
            )}

            {/* Rejection Message */}
            {verificationStatus === 'rejected' && rejectionReason && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-[10px] font-black text-red-700 mb-1">Rejection Reason:</p>
                <p className="text-xs text-red-600">{rejectionReason}</p>
                <p className="text-[8px] text-red-500 mt-2">
                  Please upload new documents addressing the issues above.
                </p>
              </div>
            )}

            {/* Info message for verified status */}
            {verificationStatus === 'verified' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Your business is verified. You can now create campaigns and receive payments.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 border-t border-[#1D1D1D]/10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Danger Zone
          </h2>
          <button className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors italic p-4 border-2 border-red-200 rounded-xl w-full justify-center">
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
          disabled={saving}
          className="w-full flex items-center justify-between bg-[#1D1D1D] text-white p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-xl border-2 border-[#1D1D1D] hover:bg-[#389C9A] disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving..." : saved ? "Changes Saved!" : "Save All Changes"}
          </span>
          {saved ? (
            <CheckCircle2 className="w-5 h-5 text-[#FEDB71]" />
          ) : (
            <ArrowRight className="w-5 h-5 text-[#FEDB71]" />
          )}
        </button>
      </div>
    </div>
  );

  // Helper functions for social links
  function addSocialLink() {
    setSocialLinks([...socialLinks, { platform: "other", url: "" }]);
  }

  function updateSocialLink(index: number, field: 'platform' | 'url', value: string) {
    const newLinks = [...socialLinks];
    newLinks[index][field] = value;
    setSocialLinks(newLinks);
  }

  function removeSocialLink(index: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  }

  function getPlatformIcon(platform: string) {
    const Icon = platformIcons[platform.toLowerCase()] || Share2;
    return typeof Icon === 'function' ? Icon() : <Icon className="w-4 h-4" />;
  }
}
