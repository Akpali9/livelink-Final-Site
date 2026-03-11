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
  const [showDocumentModal, setShowDocumentModal] = useState(false);
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

    setUploading(true);

    try {
      // Get the business ID first
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessError) throw businessError;
      if (!businessData) throw new Error("Business profile not found");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessData.id}/${Date.now()}-${file.name}`;
        const filePath = `verification-docs/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

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

        if (dbError) throw dbError;
      }

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

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from("verification_documents")
        .delete()
        .eq("id", documentId);

      if (dbError) throw dbError;

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
            .update({ verification_status: 'unverified' })
            .eq("id", businessData.id);
          
          setVerificationStatus('unverified');
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
        return <span className="px-2 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Pending Review</span>;
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
      {verificationStatus !== 'verified' && (
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
              {verificationStatus === 'rejected' ? 'Verification Rejected' : 'Verification Required'}
            </p>
            <p className={`text-xs ${
              verificationStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {verificationStatus === 'rejected' 
                ? `Your documents were rejected: ${rejectionReason || 'Please upload valid business documents'}`
                : 'Complete your profile and upload verification documents to start creating campaigns.'
              }
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
            {/* ... (keep existing profile details fields) ... */}
          </div>
        </section>

        {/* Business Details */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-[#1D1D1D]/40 italic">
            Business Details
          </h2>
          <div className="flex flex-col gap-4">
            {/* ... (keep existing business details fields) ... */}
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
              {verificationStatus === 'verified' ? (
                <span className="px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                getStatusBadge(verificationStatus)
              )}
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
                      Upload Documents
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
}
