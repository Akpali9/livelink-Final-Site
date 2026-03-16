import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowRight, Upload, X, CheckCircle2, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

// Initialize Supabase client
const supabaseUrl = "https://sivlvqpkgilbpvzuuwzc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdmx2cXBrZ2lsYnB2enV1d3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTk2ODcsImV4cCI6MjA4ODAzNTY4N30.bbpOoQOKe7Jyh05tVYNLPv13xjwOYVaGb0sjiH-vgzk";  // Replace with your Supabase Key
const supabase = createClient(supabaseUrl, supabaseKey);

export function LiveCampaignUpdate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch campaign & streams
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      setCampaign(campaignData);

      const { data: streamsData } = await supabase
        .from("streams")
        .select("*")
        .eq("campaign_id", id)
        .order("num", { ascending: true });

      setStreams(streamsData || []);
      setLoading(false);
    }

    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!campaign) return <div className="flex items-center justify-center min-h-screen">Campaign not found</div>;

  const completedStreams = streams.filter(s => s.status === "Verified").length;
  const progress = (completedStreams / campaign.total_streams) * 100;

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedStreamId) return;

    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `stream_${selectedStreamId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("stream-proofs")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      setUploading(false);
      return;
    }

    const publicUrl = uploadData?.publicURL;

    if (!publicUrl) {
      console.error("Error: Public URL not available after upload.");
      setUploading(false);
      return;
    }

    // Update stream record
    const { error: updateError } = await supabase
      .from("streams")
      .update({ proof_url: publicUrl, proof_status: "Submitted" })
      .eq("id", selectedStreamId);

    if (updateError) {
      console.error("Stream update error:", updateError.message);
      setUploading(false);
      return;
    }

    // Refresh streams locally
    setStreams(streams.map(s => 
      s.id === selectedStreamId ? { ...s, proof_url: publicUrl, proof_status: "Submitted", status: "Under Review" } : s
    ));

    setUploading(false);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="CAMPAIGN DETAILS" backPath="/dashboard" />
      <main className="flex-1 max-w-[480px] mx-auto w-full px-6 pt-10 pb-20">
        {/* Progress */}
        <div className="bg-white border-2 border-[#1D1D1D] p-10 mb-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 italic">STREAMS PROGRESS</p>
              <h3 className="text-4xl font-black italic tracking-tighter leading-none">
                {completedStreams} / {campaign.total_streams}
              </h3>
            </div>
            <p className="text-2xl font-black italic text-[#389C9A] tracking-tighter">
              £{campaign.earned_so_far || 0}
            </p>
          </div>
          <div className="h-2.5 bg-[#1D1D1D]/5 w-full rounded-none overflow-hidden mb-3">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-[#389C9A]" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.1em] opacity-30 text-center italic">
            {Math.round(progress)}% OF CAMPAIGN COMPLETED
          </p>
        </div>

        {/* Stream List */}
        <div className="mb-14">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">STREAM UPDATES</h4>
          <div className="flex flex-col gap-6">
            {streams.map((stream) => (
              <div key={stream.id} className="bg-white border-2 border-[#1D1D1D] p-8 flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <span className="font-black text-lg uppercase italic tracking-tighter leading-none">STREAM {stream.num}</span>
                  <div className={`px-2.5 py-1 text-[7px] font-black uppercase tracking-widest border italic ${
                    stream.status === 'Verified' ? 'bg-[#389C9A]/10 text-[#389C9A] border-[#389C9A]/20' :
                    stream.status === 'Under Review' ? 'bg-[#FEDB71]/10 text-[#D2691E] border-[#FEDB71]/20' :
                    'bg-[#F8F8F8] text-[#1D1D1D]/40 border-[#1D1D1D]/10'
                  }`}>
                    {stream.status.toUpperCase()}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/40 italic">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{stream.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{stream.duration}</span>
                  </div>
                </div>

                {stream.status === 'Upload Required' && (
                  <button onClick={() => { setSelectedStreamId(stream.id); setIsUploadModalOpen(true); }} className="w-full bg-[#1D1D1D] text-white py-5 px-6 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic border-2 border-[#1D1D1D]">
                    <Upload className="w-4 h-4 text-[#FEDB71]" /> UPLOAD STREAM PROOF
                  </button>
                )}

                {stream.proof_status && (
                  <div className={`flex items-center gap-3 text-[9px] font-black uppercase tracking-widest italic ${
                    stream.status === 'Verified' ? 'text-[#389C9A]' : 'text-[#D2691E]'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" /> <span>{stream.proof_status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4">
            <motion.div onClick={() => setIsUploadModalOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1D1D1D]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-[480px] bg-white border-t-4 border-[#1D1D1D] max-h-[95vh] overflow-y-auto">
              <div className="w-12 h-1 bg-[#1D1D1D]/10 rounded-full mx-auto my-6" />
              <div className="px-8 pt-4 pb-12 flex flex-col gap-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">SUBMIT PROOF</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40 leading-relaxed italic">Upload a screenshot showing your viewer count and duration.</p>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-white border border-[#1D1D1D]/10">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full border-2 border-dashed border-[#1D1D1D] p-8 cursor-pointer" disabled={uploading} />
                <button onClick={() => setIsUploadModalOpen(false)} className="w-full bg-[#1D1D1D] text-white py-6 text-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 active:scale-[0.98] transition-all">
                  {uploading ? "Uploading..." : "SUBMIT STREAM PROOF"} <ArrowRight className="w-6 h-6 text-[#FEDB71]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}