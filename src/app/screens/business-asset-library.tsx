import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  X, 
  Download, 
  Trash2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { toast } from "sonner";

interface Asset {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export function BusinessAssetLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch business ID
  useEffect(() => {
    if (!user) return;
    const fetchBusiness = async () => {
      const { data: business, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error(error);
      if (business) {
        setBusinessId(business.id);
      } else {
        toast.error("Business profile not found");
        navigate("/become-business");
      }
    };
    fetchBusiness();
  }, [user]);

  // Fetch assets and subscribe to real-time
  useEffect(() => {
    if (!businessId) return;

    const fetchAssets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_assets")
        .select("*")
        .eq("business_id", businessId)
        .order("uploaded_at", { ascending: false });
      if (error) console.error(error);
      setAssets(data || []);
      setLoading(false);
    };
    fetchAssets();

    // Real-time subscription
    const channel = supabase
      .channel("asset-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "business_assets", filter: `business_id=eq.${businessId}` },
        (payload) => {
          const newAsset = payload.new as Asset;
          setAssets(prev => [newAsset, ...prev]);
          toast.success(`Asset uploaded: ${newAsset.file_name}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "business_assets", filter: `business_id=eq.${businessId}` },
        (payload) => {
          const deletedId = payload.old.id;
          setAssets(prev => prev.filter(a => a.id !== deletedId));
          toast.info("Asset deleted");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setUploading(true);

    try {
      // Upload to storage bucket
      const fileExt = file.name.split(".").pop();
      const fileName = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-assets")
        .getPublicUrl(fileName);

      // Insert metadata into business_assets table
      const { error: insertError } = await supabase
        .from("business_assets")
        .insert({
          business_id: businessId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        });
      if (insertError) throw insertError;

      toast.success("Asset uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const handleDelete = async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    try {
      // Delete from storage (extract path from URL)
      const path = asset.file_url.split("/business-assets/")[1];
      if (path) {
        const { error: storageError } = await supabase.storage
          .from("business-assets")
          .remove([path]);
        if (storageError) console.error("Storage delete error:", storageError);
      }

      // Delete from table
      const { error } = await supabase
        .from("business_assets")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Optimistic update is handled by real-time subscription
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const downloadAsset = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-32 max-w-[480px] mx-auto w-full">
        <AppHeader showBack title="Asset Library" backPath="/business/dashboard" userType="business" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-32 max-w-[480px] mx-auto w-full">
      <AppHeader showBack title="Asset Library" backPath="/business/dashboard" userType="business" />

      <main className="flex-1 px-6 pt-8 pb-20">
        {/* Upload Button */}
        <label className="w-full bg-[#1D1D1D] text-white p-6 text-xl font-black uppercase tracking-tight flex items-center justify-center gap-4 active:scale-[0.98] transition-all italic mb-8 cursor-pointer disabled:opacity-50">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-[#FEDB71]" />
              UPLOADING...
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-[#FEDB71]" /> UPLOAD NEW ASSET
            </>
          )}
        </label>

        {/* Asset Grid */}
        {assets.length === 0 ? (
          <div className="border-2 border-dashed border-[#1D1D1D]/20 p-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20 text-[#389C9A]" />
            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">No assets uploaded yet</p>
            <p className="text-[8px] font-medium mt-2 opacity-30">Upload banners, logos, and other creatives</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {assets.map(asset => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="border-2 border-[#1D1D1D] bg-white group relative"
                >
                  {/* Preview */}
                  <div className="aspect-square bg-[#F8F8F8] flex items-center justify-center overflow-hidden">
                    {asset.file_type?.startsWith("image/") ? (
                      <ImageWithFallback src={asset.file_url} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-12 h-12 text-[#1D1D1D]/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest truncate">{asset.file_name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[7px] font-bold opacity-40">{formatFileSize(asset.file_size)}</span>
                      <span className="text-[7px] font-bold opacity-40">
                        {new Date(asset.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => downloadAsset(asset.file_url, asset.file_name)}
                      className="p-2 bg-white rounded-full hover:bg-[#389C9A] transition-colors"
                    >
                      <Download className="w-4 h-4 text-[#1D1D1D]" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 bg-white rounded-full hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-[#1D1D1D]" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Helper text */}
        <p className="text-center text-[8px] font-bold uppercase tracking-widest opacity-30 mt-8 italic">
          Supported formats: JPG, PNG, PDF (max 10MB)
        </p>
      </main>

      <BottomNav />
    </div>
  );
}