import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  ChevronLeft, Plus, X, Eye, EyeOff, Upload, CheckCircle2, 
  Instagram, Youtube, Facebook, MessageSquare, ArrowRight,
  Info, Calendar, Smartphone, Mail, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

type CreatorFormData = {
  fullName: string; dob: string; email: string; password: string;
  confirmPassword: string; phoneNumber: string; country: string; city: string;
  platforms: { type: string; username: string; url: string; followers?: string }[];
  frequency: string; duration: string; days: string[]; timeOfDay: string;
  avgConcurrent: string; avgPeak: string; avgWeekly: string;
  categories: string[]; audienceBio: string; referral: string;
  verificationDocument?: FileList;
};

export function BecomeCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { register, handleSubmit, watch, control, formState: { errors }, trigger } = useForm<CreatorFormData>({
    defaultValues: { platforms: [{ type: "Twitch", username: "", url: "", followers: "" }], days: [], categories: [] },
    mode: "onChange"
  });
  const { fields, append, remove } = useFieldArray({ control, name: "platforms" });
  const password = watch("password");
  const dob = watch("dob");
  const email = watch("email");
  const fullName = watch("fullName");
  const country = watch("country");
  const frequency = watch("frequency");
  const platforms = watch("platforms");

  useEffect(() => {
    if (isSubmitted) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); navigate('/login/creator', { state: { email }, replace: true }); }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSubmitted, navigate, email]);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const getPasswordStrength = () => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^A-Za-z0-9]/)) score++;
    if (password.length < 6) return { label: "Too Short", color: "text-red-500", score: 0 };
    if (score <= 1) return { label: "Weak", color: "text-red-500", score: 1 };
    if (score === 2) return { label: "Fair", color: "text-[#FEDB71]", score: 2 };
    if (score === 3) return { label: "Good", color: "text-[#389C9A]", score: 3 };
    return { label: "Strong", color: "text-green-500", score: 4 };
  };

  const calculateAge = () => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isUnder18 = () => calculateAge() < 18 && !!dob;

  const validateStep = async (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return await trigger(['fullName', 'dob', 'email', 'password', 'confirmPassword', 'phoneNumber', 'country', 'city']);
      case 2: return await trigger(['platforms']);
      case 3: return await trigger(['frequency', 'duration', 'timeOfDay']);
      default: return true;
    }
  };

  const onSubmit = async (data: CreatorFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: { data: { full_name: data.fullName, user_type: 'creator' } }
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("No user returned");

      let verificationUrl = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${authData.user.id}/verification-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('creator-verifications').upload(fileName, selectedFile);
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('creator-verifications').getPublicUrl(fileName);
          verificationUrl = publicUrl;
        }
      }

      await supabase.from('creator_profiles').insert({
        user_id: authData.user.id, full_name: data.fullName,
        email: data.email.toLowerCase().trim(), dob: data.dob,
        age: calculateAge(), phone_number: data.phoneNumber,
        country: data.country, city: data.city, platforms: data.platforms,
        streaming_frequency: data.frequency, streaming_duration: data.duration,
        streaming_days: data.days || [], streaming_time: data.timeOfDay,
        avg_concurrent: data.avgConcurrent ? parseInt(data.avgConcurrent) : null,
        avg_peak: data.avgPeak ? parseInt(data.avgPeak) : null,
        avg_weekly: data.avgWeekly ? parseInt(data.avgWeekly) : null,
        categories: data.categories || [], audience_bio: data.audienceBio || '',
        referral_code: data.referral || null,
        verification_document_url: verificationUrl,
        application_status: 'pending',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });

      setIsSubmitted(true);
      toast.success("Application submitted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    if (!await validateStep(step)) { toast.error("Please fill in all required fields"); return; }
    if (step === 1 && isUnder18()) { toast.error("You must be 18 or older"); return; }
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prevStep = () => { setStep(s => Math.max(s - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md w-full">
          <div className="w-24 h-24 bg-[#1D1D1D] flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-8 italic text-sm">Our team will review your application within 48 hours.</p>
          <p className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/60">
            Redirecting in {countdown} seconds...
          </p>
          <div className="w-full h-1 bg-[#1D1D1D]/10 mt-2 rounded-full overflow-hidden">
            <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: "linear" }} className="h-full bg-[#389C9A]" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <div className="px-4 sm:px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-opacity italic">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">Become a Creator on LiveLink</h1>
        <div className="bg-[#FEDB71]/10 border-2 border-[#FEDB71] p-4 flex gap-3 mt-4">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">All creator accounts are manually reviewed.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-0 z-30 flex justify-between items-center gap-4">
        {[1,2,3,4,5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all border-2 cursor-pointer ${
                step === s ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' : step > s ? 'bg-[#389C9A] text-white border-[#389C9A]' : 'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'
              }`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {step === s && <span className="text-[10px] font-black uppercase tracking-widest italic hidden sm:block">
              {s === 1 ? "Personal" : s === 2 ? "Presence" : s === 3 ? "Activity" : s === 4 ? "Proof" : "Final"}
            </span>}
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">About You</h2>
              {[
                { name: "fullName", label: "Full Legal Name", placeholder: "As it appears on your ID", rules: { required: "Required" } },
              ].map(f => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">{f.label} *</label>
                  <input {...register(f.name as any, f.rules)} placeholder={f.placeholder}
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Date of Birth *</label>
                <input type="date" {...register("dob", { required: true })} max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Email *</label>
                <input type="email" {...register("email", { required: true, pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i })}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Password *</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} {...register("password", { required: true, minLength: 6 })}
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D]" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Confirm *</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword", { required: true, validate: v => v === password })}
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D]" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Phone *</label>
                <input type="tel" {...register("phoneNumber", { required: true })}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country *</label>
                  <select {...register("country", { required: true })} className="w-full bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black outline-none">
                    <option value="">Select</option>
                    {["United Kingdom","United States","Canada","France","Germany","Australia","Nigeria"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">City *</label>
                  <input {...register("city", { required: true })} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">Your Streaming Presence</h2>
              {fields.map((field, index) => (
                <div key={field.id} className="p-8 border-2 border-[#1D1D1D] bg-white flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#389C9A]">Platform {index + 1}</span>
                    {fields.length > 1 && <button type="button" onClick={() => remove(index)}><X className="w-4 h-4 text-red-500" /></button>}
                  </div>
                  <select {...register(`platforms.${index}.type`)} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-xs font-black uppercase outline-none">
                    {["Twitch","YouTube","TikTok","Instagram","Facebook","Kick","Rumble","Other"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input {...register(`platforms.${index}.username`, { required: true })} placeholder="@username"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                  <input {...register(`platforms.${index}.url`, { required: true })} placeholder="Profile URL"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                  <input {...register(`platforms.${index}.followers`)} placeholder="Followers (optional)" type="number"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                </div>
              ))}
              {fields.length < 5 && (
                <button type="button" onClick={() => append({ type: "Twitch", username: "", url: "", followers: "" })}
                  className="w-full border-2 border-dashed border-[#1D1D1D]/20 p-8 flex flex-col items-center gap-2 hover:border-[#1D1D1D] transition-all">
                  <Plus className="w-6 h-6 text-[#389C9A]" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Add Another Platform</span>
                </button>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">Streaming Habits</h2>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest italic">How often? *</label>
                {["Daily","Several times a week","Weekly","A few times a month","Monthly or less"].map(opt => (
                  <label key={opt} className="cursor-pointer">
                    <input type="radio" {...register("frequency", { required: true })} value={opt} className="peer hidden" />
                    <div className="p-4 border-2 border-[#1D1D1D]/10 peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all">
                      <p className="text-[11px] font-black uppercase italic">{opt}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest italic">Stream Duration *</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Under 30 minutes","30 to 45 minutes","45 minutes to 1 hour","1 to 2 hours","Over 2 hours"].map(opt => (
                    <label key={opt} className="cursor-pointer">
                      <input type="radio" {...register("duration", { required: true })} value={opt} className="peer hidden" />
                      <div className="p-4 border-2 border-[#1D1D1D]/10 peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all text-center">
                        <p className="text-[10px] font-black uppercase italic">{opt}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest italic">Typical Time *</label>
                <select {...register("timeOfDay", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-4 text-xs font-black uppercase outline-none italic">
                  <option value="">Select time</option>
                  {["morning","afternoon","evening","night","varies"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[["avgConcurrent","Avg Concurrent"],["avgPeak","Avg Peak"],["avgWeekly","Avg Weekly"]].map(([n,l]) => (
                  <div key={n} className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase italic text-[#1D1D1D]/40">{l}</label>
                    <input type="number" {...register(n as any)} min="0" placeholder="0"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">Upload Verification</h2>
              <input type="file" id="verification" accept="image/*,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
              <label htmlFor="verification" className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-4 bg-[#F8F8F8] hover:border-[#1D1D1D] transition-all cursor-pointer">
                <Upload className="w-8 h-8" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">
                  {selectedFile ? selectedFile.name : "Click to Upload Screenshot"}
                </p>
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Referral Code (Optional)</label>
                <input {...register("referral")} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold outline-none focus:border-[#1D1D1D] italic" />
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">Final Review</h2>
              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 flex flex-col gap-4">
                {[["Name", fullName],["Email", email],["Country", country],["Platform", platforms?.[0]?.type],["Frequency", frequency]].map(([k,v]) => (
                  <div key={k} className="flex justify-between border-b border-[#1D1D1D]/10 pb-3 last:border-0 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">{k}</span>
                    <span className="text-[10px] font-black uppercase">{v || "Not entered"}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required className="peer hidden" />
                <div className="mt-1 w-5 h-5 border-2 border-[#1D1D1D] flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                </div>
                <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                  I agree to LiveLink's Terms of Service and confirm all information is accurate.
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
        <div className="flex gap-4">
          {step > 1 && (
            <button onClick={prevStep} disabled={isLoading}
              className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all italic disabled:opacity-50">
              Back
            </button>
          )}
          <button onClick={step === 5 ? handleSubmit(onSubmit) : nextStep} disabled={isLoading}
            className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white p-5 font-black uppercase tracking-tight transition-all italic disabled:opacity-50">
            <span>{isLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span> : step === 5 ? "Submit Application" : "Continue"}</span>
            {!isLoading && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Application Queue (no nav) ───────────────────────
export function AdminApplicationQueue() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('creator_profiles')
      .select(`id, user_id, full_name, application_status, submitted_at, avg_concurrent, creator_platforms(platform_type, username, followers_count)`)
      .order('submitted_at', { ascending: false });
    setApplications(data || []);
    setLoading(false);
  };

  const handle = async (userId: string, id: string, status: 'approved' | 'rejected') => {
    const field = status === 'approved' ? 'approved_at' : 'rejected_at';
    const { error } = await supabase.from('creator_profiles')
      .update({ application_status: status, [field]: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success(`Application ${status}`); fetchApplications(); }
    else toast.error('Failed to update');
  };

  const filtered = applications.filter(a => filter === 'all' ? true : a.application_status === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
              filter === f
                ? 'bg-[#00FF94] text-black border-[#00FF94]'
                : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
            }`}>
            {f} ({f === 'all' ? applications.length : applications.filter(a => a.application_status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">No applications found</p>
        </div>
      ) : filtered.map((app, i) => (
        <motion.div key={app.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-white text-sm">{app.full_name || 'Unnamed'}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {app.creator_platforms?.map((p: any) => (
                  <span key={p.platform_type} className="text-[9px] font-bold text-[#00FF94] font-mono">
                    {p.platform_type} · {p.followers_count || 0} followers
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-white/30 font-mono mt-1">
                {app.avg_concurrent || 0} avg viewers · {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'No date'}
              </p>
            </div>
            <span className={`px-2 py-1 text-[8px] font-bold rounded-full border ${
              app.application_status === 'pending' ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' :
              app.application_status === 'approved' ? 'bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30' :
              'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {app.application_status?.toUpperCase()}
            </span>
          </div>
          {app.application_status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => handle(app.user_id, app.id, 'approved')}
                className="flex-1 bg-[#00FF94]/15 text-[#00FF94] border border-[#00FF94]/30 py-2 text-[10px] font-bold rounded-lg hover:bg-[#00FF94]/25 transition-colors">
                Approve
              </button>
              <button onClick={() => handle(app.user_id, app.id, 'rejected')}
                className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                Reject
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
