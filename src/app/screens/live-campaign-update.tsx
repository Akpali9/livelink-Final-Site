import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  ArrowRight, 
  Upload, 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock,
  Eye,
  Download,
  AlertTriangle,
  RefreshCw,
  Award,
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  HelpCircle,
  Camera,
  Video,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  total_streams: number;
  streams_completed: number;
  budget?: number;
  earned_so_far?: number;
  price_per_stream?: number;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  promo_code?: string;
  requirements?: string[];
  business: {
    id: string;
    business_name: string;
    logo_url?: string;
    contact_email?: string;
  };
}

interface Stream {
  id: string;
  stream_number: number;
  status: 'Pending' | 'Upload Required' | 'Under Review' | 'Verified' | 'Rejected';
  stream_date: string;
  duration: string;
  proof_url?: string;
  proof_status?: string;
  viewer_count?: number;
  notes?: string;
  submitted_at?: string;
  verified_at?: string;
}

export function LiveCampaignUpdate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'screenshot' | 'video'>('screenshot');
  const [viewerCount, setViewerCount] = useState('');
  const [streamNotes, setStreamNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  useEffect(() => {
    if (campaign && user) {
      fetchStreams();
    }
  }, [campaign, user]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);

      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            logo_url,
            contact_email
          )
        `)
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;

      // Fetch campaign requirements
      const { data: requirementsData } = await supabase
        .from("campaign_requirements")
        .select("*")
        .eq("campaign_id", id);

      setCampaign({
        ...campaignData,
        requirements: requirementsData?.map(r => r.description) || [],
        earned_so_far: calculateEarned(campaignData.streams_completed, campaignData.price_per_stream)
      });

    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStreams = async () => {
    if (!user || !campaign) return;

    try {
      const { data, error } = await supabase
        .from("stream_updates")
        .select("*")
        .eq("campaign_id", id)
        .eq("creator_id", user.id)
        .order("stream_number", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setStreams(data);
      } else {
        // Generate placeholder streams
        const placeholders: Stream[] = [];
        for (let i = 1; i <= (campaign.total_streams || 12); i++) {
          const isCompleted = i <= (campaign.streams_completed || 0);
          placeholders.push({
            id: `temp-${i}`,
            stream_number: i,
            status: isCompleted ? "Verified" : i === (campaign.streams_completed || 0) + 1 ? "Upload Required" : "Pending",
            stream_date: isCompleted ? new Date(Date.now() - (i * 86400000)).toLocaleDateString() : "Not scheduled",
            duration: isCompleted ? `${45 + i} mins` : "--",
            viewer_count: isCompleted ? Math.floor(Math.random() * 500) + 100 : undefined
          });
        }
        setStreams(placeholders);
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
    }
  };

  const calculateEarned = (completed: number, pricePerStream: number = 15) => {
    return completed * pricePerStream;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaignData();
    await fetchStreams();
    setRefreshing(false);
    toast.success("Campaign data updated");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error("Please upload an image or video file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploadFile(file);
    setUploadType(isImage ? 'screenshot' : 'video');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadSubmit = async () => {
    if (!selectedStream || !user || !campaign || !uploadFile) return;

    try {
      setUploadProgress(0);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${user.id}/${campaign.id}/stream-${selectedStream.stream_number}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("stream-proofs")
        .upload(fileName, uploadFile, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("stream-proofs")
        .getPublicUrl(fileName);

      clearInterval(interval);
      setUploadProgress(100);

      // Create stream update record
      const streamData = {
        campaign_id: campaign.id,
        creator_id: user.id,
        stream_number: selectedStream.stream_number,
        status: "Under Review",
        stream_date: new Date().toISOString(),
        duration: "Stream recorded",
        proof_url: publicUrl,
        proof_type: uploadType,
        viewer_count: parseInt(viewerCount) || null,
        notes: streamNotes,
        submitted_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from("stream_updates")
        .upsert(streamData);

      if (insertError) throw insertError;

      // Update local state
      setStreams(prev => prev.map(s => 
        s.stream_number === selectedStream.stream_number 
          ? { 
              ...s, 
              status: "Under Review",
              proof_url: publicUrl,
              viewer_count: parseInt(viewerCount) || undefined,
              notes: streamNotes,
              submitted_at: new Date().toISOString()
            }
          : s
      ));

      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedStream(null);
        setUploadFile(null);
        setPreviewUrl(null);
        setViewerCount('');
        setStreamNotes('');
        setUploadProgress(0);
        toast.success("Stream proof submitted! Verification typically takes 24 hours.");
      }, 500);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload stream proof");
    }
  };

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank');
  };

  const handleMessageBusiness = () => {
    if (campaign?.business_id) {
      navigate(`/messages/${campaign.business_id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Verified': return 'bg-[#389C9A] text-white border-[#389C9A]';
      case 'Under Review': return 'bg-[#FEDB71] text-[#1D1D1D] border-[#FEDB71]';
      case 'Upload Required': return 'bg-red-500 text-white border-red-500';
      case 'Rejected': return 'bg-gray-500 text-white border-gray-500';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Verified': return <CheckCircle2 className="w-4 h-4" />;
      case 'Under Review': return <Clock className="w-4 h-4" />;
      case 'Upload Required': return <AlertTriangle className="w-4 h-4" />;
      case 'Rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="CAMPAIGN DETAILS" backPath="/dashboard" />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading campaign...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="CAMPAIGN DETAILS" backPath="/dashboard" />
        <div className="flex flex-col items-center justify-center h-[80vh] px-8">
          <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Campaign Not Found</h2>
          <p className="text-gray-400 text-center mb-8">The campaign you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest"
          >
            Back to Dashboard
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const completedStreams = streams.filter(s => s.status === "Verified").length;
  const pendingStreams = streams.filter(s => s.status === "Under Review").length;
  const requiredStreams = streams.filter(s => s.status === "Upload Required").length;
  const progress = (completedStreams / campaign.total_streams) * 100;
  const earnedSoFar = campaign.earned_so_far || calculateEarned(completedStreams, campaign.price_per_stream);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="CAMPAIGN DETAILS" backPath="/dashboard" />
      
      <main className="flex-1 max-w-[480px] mx-auto w-full px-6 pt-6 pb-20">
        {/* Header with Refresh */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border-2 border-[#1D1D1D] rounded-xl overflow-hidden">
              <ImageWithFallback 
                src={campaign.business.logo_url} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight">{campaign.business.business_name}</h2>
              <p className="text-[8px] font-medium opacity-40 uppercase tracking-widest">{campaign.name}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] transition-colors rounded-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Progress Card */}
        <div className="bg-white border-2 border-[#1D1D1D] p-8 mb-8 rounded-xl">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 italic">STREAMS PROGRESS</p>
              <h3 className="text-4xl font-black italic tracking-tighter leading-none">
                {completedStreams} / {campaign.total_streams}
              </h3>
            </div>
            <p className="text-2xl font-black italic text-[#389C9A] tracking-tighter">
              £{earnedSoFar}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 bg-[#1D1D1D]/5 w-full rounded-full overflow-hidden mb-3">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ duration: 1, ease: "easeOut" }} 
              className="h-full bg-[#389C9A] rounded-full"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="text-center">
              <p className="text-lg font-black text-[#389C9A]">{completedStreams}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-[#FEDB71]">{pendingStreams}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-red-500">{requiredStreams}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Required</p>
            </div>
          </div>

          <p className="text-[8px] font-black uppercase tracking-[0.1em] opacity-30 text-center italic mt-4">
            {Math.round(progress)}% OF CAMPAIGN COMPLETED
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={handleMessageBusiness}
            className="py-4 border-2 border-[#1D1D1D] rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-[#389C9A]" /> Message
          </button>
          <button
            onClick={() => navigate(`/campaign/${campaign.id}/analytics`)}
            className="py-4 border-2 border-[#1D1D1D] rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#1D1D1D] hover:text-white transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-[#FEDB71]" /> Analytics
          </button>
        </div>

        {/* Stream List */}
        <div className="mb-14">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">STREAM UPDATES</h4>
            <span className="text-[8px] font-black opacity-40">
              {completedStreams}/{campaign.total_streams} Complete
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {streams.map((stream) => (
              <motion.div 
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-[#1D1D1D] p-6 rounded-xl flex flex-col gap-4"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-base uppercase italic">Stream {stream.stream_number}</span>
                  <div className={`px-3 py-1 text-[7px] font-black uppercase tracking-widest border rounded-full flex items-center gap-1 ${getStatusColor(stream.status)}`}>
                    {getStatusIcon(stream.status)}
                    {stream.status}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{stream.stream_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{stream.duration}</span>
                  </div>
                </div>

                {stream.viewer_count && (
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                    <Users className="w-3 h-3 text-[#389C9A]" />
                    <span>{stream.viewer_count} avg viewers</span>
                  </div>
                )}

                {stream.proof_url && (
                  <button
                    onClick={() => handleViewProof(stream.proof_url!)}
                    className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#389C9A] hover:underline"
                  >
                    <Eye className="w-3 h-3" /> View Proof
                  </button>
                )}

                {stream.status === "Upload Required" && (
                  <button 
                    onClick={() => {
                      setSelectedStream(stream);
                      setIsUploadModalOpen(true);
                    }}
                    className="w-full bg-[#1D1D1D] text-white py-4 px-5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#389C9A] transition-all rounded-xl"
                  >
                    <Upload className="w-4 h-4 text-[#FEDB71]" /> UPLOAD STREAM PROOF
                  </button>
                )}

                {stream.status === "Under Review" && (
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#FEDB71] bg-[#FEDB71]/10 p-3 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span>Under review - typically takes 24 hours</span>
                  </div>
                )}

                {stream.status === "Verified" && (
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#389C9A] bg-[#389C9A]/10 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified and approved! Payment processing</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        {campaign.requirements && campaign.requirements.length > 0 && (
          <div className="bg-[#F8F8F8] p-6 rounded-xl mb-8">
            <h5 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
              <HelpCircle className="w-3 h-3 text-[#389C9A]" /> Campaign Requirements
            </h5>
            <ul className="space-y-2">
              {campaign.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-[8px]">
                  <Check className="w-3 h-3 text-[#389C9A] mt-0.5" />
                  <span className="opacity-60">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && selectedStream && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4">
            <motion.div 
              onClick={() => setIsUploadModalOpen(false)} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] max-h-[95vh] overflow-y-auto rounded-t-3xl"
            >
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              
              <div className="px-6 pt-4 pb-8 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-1">
                      Submit Proof
                    </h2>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 italic">
                      Stream {selectedStream.stream_number}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)} 
                    className="p-2 bg-white border border-[#1D1D1D]/10 rounded-xl hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* File Upload Area */}
                <div className="relative">
                  <input
                    type="file"
                    id="stream-proof"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {!previewUrl ? (
                    <label
                      htmlFor="stream-proof"
                      className="block w-full aspect-video border-2 border-dashed border-[#1D1D1D] bg-[#F8F8F8] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#1D1D1D] hover:text-white transition-all group rounded-xl p-4"
                    >
                      <Upload className="w-8 h-8 text-[#1D1D1D] group-hover:text-[#FEDB71]" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] italic text-center">
                        Click to upload screenshot or video
                      </p>
                      <p className="text-[7px] font-medium opacity-40 uppercase tracking-widest">
                        PNG, JPG or MP4 (max 50MB)
                      </p>
                    </label>
                  ) : (
                    <div className="relative aspect-video border-2 border-[#1D1D1D] rounded-xl overflow-hidden">
                      {uploadType === 'screenshot' ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <video src={previewUrl} controls className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => {
                          setUploadFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Viewer Count */}
                <div>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                    Average Viewer Count (optional)
                  </label>
                  <input
                    type="number"
                    value={viewerCount}
                    onChange={(e) => setViewerCount(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 block">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={streamNotes}
                    onChange={(e) => setStreamNotes(e.target.value)}
                    placeholder="Any additional information about this stream..."
                    rows={3}
                    className="w-full p-4 border-2 border-[#1D1D1D]/10 focus:border-[#389C9A] outline-none transition-colors text-sm rounded-xl resize-none"
                  />
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="h-1 bg-[#1D1D1D]/10 w-full rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#389C9A] transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-center opacity-40">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploadProgress > 0}
                  className="w-full bg-[#1D1D1D] text-white py-5 text-sm font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 hover:bg-[#389C9A] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                >
                  {uploadProgress > 0 ? 'UPLOADING...' : 'SUBMIT STREAM PROOF'}
                  {uploadProgress === 0 && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
                </button>

                {/* Requirements */}
                <div className="bg-[#F8F8F8] p-4 rounded-lg">
                  <h5 className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Verification Requirements
                  </h5>
                  <ul className="space-y-1 text-[7px] font-medium">
                    <li>• Screenshot must show viewer count clearly</li>
                    <li>• Stream duration must be visible</li>
                    <li>• Campaign banner should be in frame</li>
                    <li>• No offensive or inappropriate content</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}