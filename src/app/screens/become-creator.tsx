import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  Instagram,
  Youtube,
  Facebook,
  MessageSquare,
  ArrowRight,
  Info,
  Calendar,
  Smartphone,
  Mail,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type CreatorFormData = {
  // Step 1
  fullName: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  country: string;
  city: string;
  // Step 2
  platforms: { type: string; username: string; url: string; followers?: string }[];
  // Step 3
  frequency: string;
  duration: string;
  days: string[];
  timeOfDay: string;
  avgConcurrent: string;
  avgPeak: string;
  avgWeekly: string;
  categories: string[];
  audienceBio: string;
  // Step 4
  referral: string;
};

// ─────────────────────────────────────────────
// BECOME CREATOR
// ─────────────────────────────────────────────

export function BecomeCreator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
    trigger,
  } = useForm<CreatorFormData>({
    defaultValues: {
      platforms: [{ type: "Twitch", username: "", url: "", followers: "" }],
      days: [],
      categories: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "platforms" });

  const password  = watch("password");
  const dob       = watch("dob");
  const email     = watch("email");
  const fullName  = watch("fullName");
  const country   = watch("country");
  const frequency = watch("frequency");
  const platforms = watch("platforms");

  // Auto-redirect after success
  useEffect(() => {
    if (!isSubmitted) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login/creator", {
            state: {
              message: "Your creator application has been submitted! Please login to check your status.",
              type: "success",
              email,
            },
            replace: true,
          });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, navigate, email]);

  // Guard: already logged in
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  const getPasswordStrength = (): { label: string; color: string; score: number } | null => {
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

  const calculateAge = (): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isUnder18 = (): boolean => calculateAge() < 18;

  const uploadVerificationDocument = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
    if (file.size / 1024 / 1024 > 10) throw new Error("File size must be less than 10MB");

    const { error: uploadError } = await supabase.storage
      .from("creator-verifications")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("creator-verifications")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // ─── STEP VALIDATION ─────────────────────────────────────────────────────

  const validateStep = async (stepNumber: number): Promise<boolean> => {
    switch (stepNumber) {
      case 1:
        return await trigger(["fullName", "dob", "email", "password", "confirmPassword", "phoneNumber", "country", "city"]);
      case 2: {
        const ok = await trigger(["platforms"]);
        if (!ok) toast.error("Please add at least one platform");
        return ok;
      }
      case 3:
        return await trigger(["frequency", "duration", "timeOfDay"]);
      default:
        return true;
    }
  };

  // ─── SUBMIT ───────────────────────────────────────────────────────────────

  const onSubmit = async (data: CreatorFormData) => {
    setIsLoading(true);
    setUploadProgress(0);

    try {
      if (isUnder18()) {
        toast.error("You must be 18 or older to become a creator");
        return;
      }
      if (data.password !== data.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: { full_name: data.fullName, user_type: "creator" },
          emailRedirectTo: `${window.location.origin}/login/creator?verified=true`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please login instead.", { duration: 5000 });
          setTimeout(() => navigate("/login/creator", { state: { email: data.email } }), 3000);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error("No user returned from signup");

      let verificationUrl: string | null = null;
      if (selectedFile) {
        try {
          setUploadProgress(10);
          verificationUrl = await uploadVerificationDocument(selectedFile, authData.user.id);
          setUploadProgress(80);
        } catch (uploadError: any) {
          console.error("Document upload failed:", uploadError);
          toast.error("Document upload failed. You can upload it later.");
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from("creator_profiles")
        .insert({
          user_id:                   authData.user.id,
          full_name:                 data.fullName,
          email:                     data.email.toLowerCase().trim(),
          dob:                       data.dob,
          age:                       calculateAge(),
          phone_number:              data.phoneNumber,
          country:                   data.country,
          city:                      data.city,
          location:                  `${data.city}, ${data.country}`,
          niche:                     data.categories || [],
          avg_viewers:               data.avgConcurrent ? parseInt(data.avgConcurrent) : 0,
          total_streams:             0,
          streaming_frequency:       data.frequency,
          streaming_duration:        data.duration,
          streaming_days:            data.days || [],
          streaming_time:            data.timeOfDay,
          avg_peak:                  data.avgPeak ? parseInt(data.avgPeak) : 0,
          avg_weekly:                data.avgWeekly ? parseInt(data.avgWeekly) : 0,
          audience_bio:              data.audienceBio || "",
          referral_code:             data.referral || null,
          verification_document_url: verificationUrl,
          status:                    "pending_review",
        })
        .select("id")
        .single();

      if (profileError) {
        console.error("Profile creation error:", profileError);
        if (profileError.code === "23505") {
          toast.error("A profile already exists for this user");
        } else {
          toast.error("Failed to create creator profile");
        }
        return;
      }

      if (profileData?.id && data.platforms?.length > 0) {
        const platformRows = data.platforms
          .filter((p) => p.username && p.url)
          .map((p) => ({
            creator_id:      profileData.id,
            platform_type:   p.type,
            username:        p.username,
            profile_url:     p.url,
            followers_count: p.followers ? parseInt(p.followers) : 0,
          }));

        if (platformRows.length > 0) {
          const { error: platformError } = await supabase
            .from("creator_platforms")
            .insert(platformRows);

          if (platformError) {
            console.error("Platform insert error:", platformError);
            toast.error("Profile created but platforms could not be saved. You can add them later.");
          }
        }
      }

      setUploadProgress(100);
      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      let msg = "Failed to submit application";
      if (error.message?.includes("Failed to fetch")) msg = "Network error. Please check your connection.";
      else if (error.message?.includes("duplicate key")) msg = "An account with this information already exists";
      else if (error.message) msg = error.message;
      toast.error(msg, { duration: 4000 });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // ─── NAVIGATION ───────────────────────────────────────────────────────────

  const nextStep = async () => {
    const valid = await validateStep(step);
    if (!valid) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step === 1 && isUnder18()) {
      toast.error("You must be 18 or older to become a creator");
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-4 sm:px-8 text-[#1D1D1D]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center max-w-md w-full"
        >
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-[#1D1D1D] flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]"
          >
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-4"
          >
            Application Submitted!
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#1D1D1D]/60 mb-8 italic text-sm"
          >
            Our team will review your application and get back to you within 48 hours.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 p-6 bg-[#FEDB71]/10 border-2 border-[#FEDB71]"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-[#389C9A]" />
              <p className="text-sm font-black uppercase tracking-tight italic">✓ Check Your Email</p>
            </div>
            <p className="text-[10px] font-medium opacity-60 italic">
              We've sent a verification link to{" "}
              <span className="font-black text-[#389C9A] break-all">{email}</span>. Please verify before logging in.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">What happens next</h3>
            <div className="flex flex-col gap-4 text-left">
              {[
                "Verify your email address",
                "Our team reviews your application",
                "You receive an approval email within 48 hours",
                "Once approved, access your creator dashboard",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <span className="font-black italic text-[#389C9A] text-sm">0{i + 1}</span>
                  <p className="text-xs font-bold uppercase tracking-tight italic">{text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mb-4"
          >
            <p className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/60">
              Redirecting to login in {countdown} seconds...
            </p>
            <div className="w-full h-1 bg-[#1D1D1D]/10 mt-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-[#389C9A]"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <button
              onClick={() =>
                navigate("/login/creator", {
                  state: { message: "Application submitted! Please login.", type: "success", email },
                  replace: true,
                })
              }
              className="inline-flex items-center gap-2 border-2 border-[#1D1D1D] px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all mb-8 italic"
            >
              Go to Login Now <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <div className="px-4 sm:px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-opacity italic"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Become a Creator on LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Join hundreds of live creators already earning through their streams.
        </p>
        <div className="bg-[#FEDB71]/10 border-2 border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All creator accounts are manually reviewed. Incomplete applications will not be reviewed.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 sm:px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-0 z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all border-2 cursor-pointer ${
                step === s
                  ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                  : step > s
                  ? "bg-[#389C9A] text-white border-[#389C9A]"
                  : "bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10"
              }`}
              onClick={() => s < step && setStep(s)}
            >
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </motion.div>
            {step === s && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-black uppercase tracking-widest italic hidden sm:block"
              >
                {["Personal", "Presence", "Activity", "Proof", "Final"][s - 1]}
              </motion.span>
            )}
          </div>
        ))}
      </div>

      {/* Form Steps */}
      <div className="px-4 sm:px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        <AnimatePresence mode="wait">

          {/* Step 1 */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About You</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This information is kept private and used for verification only.</p>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Full Legal Name <span className="text-red-500">*</span></label>
                    <input {...register("fullName", { required: "Full name is required", minLength: { value: 2, message: "At least 2 characters" } })} placeholder="As it appears on your ID" className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic ${errors.fullName ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                    {errors.fullName && <p className="text-red-500 text-[9px] font-black uppercase">{errors.fullName.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Date of Birth <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input type="date" {...register("dob", { required: "Date of birth is required", validate: { under18: (v) => { const bd = new Date(v); const today = new Date(); let age = today.getFullYear() - bd.getFullYear(); const m = today.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--; return age >= 18 || "You must be 18 or older"; } } })} max={new Date().toISOString().split("T")[0]} className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.dob ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                    </div>
                    {errors.dob && <p className="text-red-500 text-[9px] font-black uppercase">{errors.dob.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input type="email" {...register("email", { required: "Email is required", pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" } })} placeholder="This will be your login email" className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic ${errors.email ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                    </div>
                    {errors.email && <p className="text-red-500 text-[9px] font-black uppercase">{errors.email.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Create Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} {...register("password", { required: "Password is required", minLength: { value: 6, message: "At least 6 characters" }, pattern: { value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/, message: "Must contain a letter and a number" } })} className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.password ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-4 h-4 opacity-30 hover:opacity-100" /> : <Eye className="w-4 h-4 opacity-30 hover:opacity-100" />}</button>
                      </div>
                      {getPasswordStrength() && (
                        <div className="mt-1">
                          <div className="flex gap-1 h-1 mb-1">{[1, 2, 3, 4].map((i) => (<div key={i} className={`flex-1 h-full rounded-full transition-all ${i <= (getPasswordStrength()?.score || 0) ? getPasswordStrength()?.color.replace("text", "bg") : "bg-gray-200"}`} />))}</div>
                          <p className={`text-[9px] font-black uppercase ${getPasswordStrength()?.color}`}>Strength: {getPasswordStrength()?.label}</p>
                        </div>
                      )}
                      {errors.password && <p className="text-red-500 text-[9px] font-black uppercase">{errors.password.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Confirm Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword", { required: "Please confirm your password", validate: (v) => v === password || "Passwords do not match" })} className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.confirmPassword ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showConfirmPassword ? <EyeOff className="w-4 h-4 opacity-30 hover:opacity-100" /> : <Eye className="w-4 h-4 opacity-30 hover:opacity-100" />}</button>
                      </div>
                      {errors.confirmPassword && <p className="text-red-500 text-[9px] font-black uppercase">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Phone Number <span className="text-red-500">*</span></label>
                    <div className="relative flex">
                      <select className="bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none border-r-0"><option value="+44">+44</option><option value="+1">+1</option><option value="+33">+33</option><option value="+49">+49</option><option value="+61">+61</option><option value="+234">+234</option></select>
                      <div className="relative flex-1">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                        <input type="tel" {...register("phoneNumber", { required: "Phone number is required", pattern: { value: /^[0-9]{7,15}$/, message: "Invalid phone number" } })} placeholder="Phone number" className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.phoneNumber ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                      </div>
                    </div>
                    {errors.phoneNumber && <p className="text-red-500 text-[9px] font-black uppercase">{errors.phoneNumber.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country <span className="text-red-500">*</span></label>
                      <select {...register("country", { required: "Country is required" })} className={`w-full bg-white border p-5 text-xs font-black uppercase tracking-tight outline-none ${errors.country ? "border-red-500" : "border-[#1D1D1D]/10"}`}><option value="">Select Country</option><option value="United Kingdom">United Kingdom</option><option value="United States">United States</option><option value="Canada">Canada</option><option value="France">France</option><option value="Germany">Germany</option><option value="Australia">Australia</option><option value="Nigeria">Nigeria</option></select>
                      {errors.country && <p className="text-red-500 text-[9px] font-black uppercase">{errors.country.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">City <span className="text-red-500">*</span></label>
                      <input {...register("city", { required: "City is required" })} className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic ${errors.city ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                      {errors.city && <p className="text-red-500 text-[9px] font-black uppercase">{errors.city.message}</p>}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Streaming Presence</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us where you go live.</p>
                <div className="flex flex-col gap-8">
                  {fields.map((field, index) => (
                    <motion.div key={field.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.1 }} className="relative p-8 border-2 border-[#1D1D1D] bg-white">
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#389C9A]">Platform {index + 1}</span>
                        {fields.length > 1 && (<button type="button" onClick={() => remove(index)} className="p-2 hover:bg-red-50 text-red-500 transition-colors"><X className="w-4 h-4" /></button>)}
                      </div>
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Platform</label>
                          <select {...register(`platforms.${index}.type` as const)} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none"><option value="Twitch">Twitch</option><option value="YouTube">YouTube</option><option value="TikTok">TikTok</option><option value="Instagram">Instagram</option><option value="Facebook">Facebook</option><option value="Kick">Kick</option><option value="Rumble">Rumble</option><option value="Other">Other</option></select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Username <span className="text-[#389C9A]">*</span></label>
                          <input {...register(`platforms.${index}.username` as const, { required: "Username required" })} placeholder="e.g. @creatorname" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] italic" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Profile URL <span className="text-[#389C9A]">*</span></label>
                          <input {...register(`platforms.${index}.url` as const, { required: "Profile URL required", pattern: { value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, message: "Valid URL required" } })} placeholder="https://twitch.tv/yourname" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] italic" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Followers (optional)</label>
                          <input {...register(`platforms.${index}.followers` as const)} placeholder="e.g. 10000" type="number" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] italic" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {fields.length < 5 && (
                    <button type="button" onClick={() => append({ type: "Twitch", username: "", url: "", followers: "" })} className="w-full border-2 border-dashed border-[#1D1D1D]/20 p-8 flex flex-col items-center gap-2 hover:border-[#1D1D1D] transition-all text-[#1D1D1D]/40 hover:text-[#1D1D1D] group">
                      <Plus className="w-6 h-6 text-[#389C9A] group-hover:rotate-90 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">Add Another Platform</span>
                    </button>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-16">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Live Streaming Habits</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Be as accurate as possible — this determines which campaigns you match with.</p>
                <div className="flex flex-col gap-12">
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">How often do you go live? <span className="text-red-500">*</span></label>
                    <div className="flex flex-col gap-3">
                      {[{ val: "Daily", sub: "Every day" }, { val: "Several times a week", sub: "3–5 times per week" }, { val: "Weekly", sub: "Once a week" }, { val: "A few times a month", sub: "2–3 times per month" }, { val: "Monthly or less", sub: "Once a month or occasionally" }].map((opt) => (
                        <label key={opt.val} className="cursor-pointer">
                          <input type="radio" {...register("frequency", { required: "Please select frequency" })} value={opt.val} className="peer hidden" />
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all"><p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p><p className="text-[9px] font-medium uppercase tracking-widest opacity-40 italic">{opt.sub}</p></div>
                        </label>
                      ))}
                    </div>
                    {errors.frequency && <p className="text-red-500 text-[9px] font-black uppercase">{errors.frequency.message}</p>}
                  </div>
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">How long are your streams on average? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {["Under 30 minutes", "30 to 45 minutes", "45 minutes to 1 hour", "1 to 2 hours", "Over 2 hours"].map((opt) => (
                        <label key={opt} className="cursor-pointer">
                          <input type="radio" {...register("duration", { required: "Please select duration" })} value={opt} className="peer hidden" />
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all text-center italic"><p className="text-[10px] font-black uppercase tracking-widest">{opt}</p></div>
                        </label>
                      ))}
                    </div>
                    {errors.duration && <p className="text-red-500 text-[9px] font-black uppercase">{errors.duration.message}</p>}
                    <div className="bg-[#FEDB71]/10 border-2 border-[#FEDB71] p-4 text-[9px] font-black uppercase tracking-widest text-center italic">Note: only streams of 45 minutes or longer qualify for banner campaign billing.</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="flex flex-col gap-6">
                      <label className="text-[10px] font-black uppercase tracking-widest italic">Days you go live</label>
                      <div className="flex flex-wrap gap-2">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <label key={day} className="cursor-pointer">
                            <input type="checkbox" {...register("days")} value={day} className="peer hidden" />
                            <div className="w-12 h-12 flex items-center justify-center border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[10px] font-black transition-all italic">{day[0]}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-6">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Typical Time <span className="text-red-500">*</span></label>
                      <select {...register("timeOfDay", { required: "Please select typical time" })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none italic"><option value="">Select time</option><option value="morning">Morning (6am–12pm)</option><option value="afternoon">Afternoon (12pm–5pm)</option><option value="evening">Evening (5pm–9pm)</option><option value="night">Late Night (9pm–12am)</option><option value="varies">Varies</option></select>
                      {errors.timeOfDay && <p className="text-red-500 text-[9px] font-black uppercase">{errors.timeOfDay.message}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-8">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">Average Viewership</label>
                    {[{ field: "avgConcurrent" as const, label: "Average concurrent viewers per stream", placeholder: "e.g. 250" }, { field: "avgPeak" as const, label: "Average peak viewers per stream", placeholder: "e.g. 500" }, { field: "avgWeekly" as const, label: "Average weekly total viewers", placeholder: "e.g. 1200" }].map((item, i) => (
                      <div key={item.field} className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">{i + 1}</span>
                          <input type="number" {...register(item.field)} placeholder={item.placeholder} min="0" className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] transition-all italic" />
                        </div>
                        <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">What content do you create?</label>
                    <div className="flex flex-wrap gap-2">
                      {["Gaming", "Beauty & Makeup", "Fashion", "Fitness & Health", "Food & Cooking", "Music", "Comedy", "Education", "Business & Finance", "Lifestyle", "Sports", "Tech", "Travel", "Other"].map((cat) => (
                        <label key={cat} className="cursor-pointer">
                          <input type="checkbox" {...register("categories")} value={cat} className="peer hidden" />
                          <div className="px-4 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-widest transition-all italic">{cat}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">Describe your audience</label>
                    <textarea {...register("audienceBio")} rows={4} placeholder="Who watches you? age, interests, location..." className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all italic" />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Upload Verification</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Proof of your streaming analytics from the last 30 days.</p>
                <div className="relative">
                  <input type="file" id="verification" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} className="hidden" />
                  <label htmlFor="verification" className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] group hover:border-[#1D1D1D] transition-all cursor-pointer">
                    <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all"><Upload className="w-8 h-8" /></div>
                    <div className="text-center">
                      {selectedFile ? (<><p className="text-[10px] font-black uppercase tracking-widest mb-2 italic text-[#389C9A]">{selectedFile.name}</p><p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></>) : (<><p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">Click to Upload Screenshot</p><p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">JPG, PNG OR PDF · MAX 10MB</p></>)}
                    </div>
                  </label>
                </div>
                <div className="flex flex-col gap-6 pt-12 border-t-2 border-[#1D1D1D]/10">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Referral Code (Optional)</label>
                    <input {...register("referral")} placeholder="If you were referred by another creator" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic" />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-12">
              <section>
                 <div className="mt-8 mb-12">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="peer hidden" />
                    <div className="mt-1 w-5 h-5 border-2 border-[#1D1D1D] flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all flex-shrink-0"><CheckCircle2 className="w-3 h-3 text-white" /></div>
                    <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">I agree to LiveLink's Terms of Service and Privacy Policy. I confirm all information provided is accurate.</span>
                  </label>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Final Review</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Confirm your details before submitting.</p>
                <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 flex flex-col gap-6">
                  {[{ label: "Name", value: fullName }, { label: "Email", value: email }, { label: "Country", value: country }, { label: "Main Platform", value: platforms?.[0]?.type }, { label: "Stream Frequency", value: frequency }, { label: "Verification Doc", value: selectedFile ? selectedFile.name : "Not uploaded (optional)" }].map((row, i, arr) => (
                    <div key={row.label} className={`flex justify-between items-center italic ${i < arr.length - 1 ? "border-b border-[#1D1D1D]/10 pb-4" : ""}`}>
                      <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">{row.label}</span>
                      <span className="text-[10px] font-black uppercase break-all">{row.value || "Not entered"}</span>
                    </div>
                  ))}
                </div>
               
              </section>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
        <div className="flex gap-4">
          {step > 1 && (
            <button onClick={prevStep} disabled={isLoading} className="px-6 py-5 border-2 border-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all italic disabled:opacity-50">Back</button>
          )}
          <button
            onClick={step === 5 ? handleSubmit(onSubmit) : nextStep}
            disabled={isLoading}
            className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white p-5 sm:p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all italic disabled:opacity-50"
          >
            <span>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Processing..."}
                </span>
              ) : step === 5 ? "Submit Application" : "Continue"}
            </span>
            {!isLoading && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN APPLICATION QUEUE  ✅ exported so routes.tsx can import it
// ─────────────────────────────────────────────

interface ApplicationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  niche: string[] | null;
  avg_viewers: number;
  status: string;
  created_at: string;
  // joined
  creator_platforms: { platform_type: string; followers_count: number }[];
}

export function AdminApplicationQueue() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending_review" | "approved" | "rejected">("pending_review");

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("creator_profiles")
        .select(`
          id,
          user_id,
          full_name,
          username,
          avatar_url,
          location,
          niche,
          avg_viewers,
          status,
          created_at,
          creator_platforms (
            platform_type,
            followers_count
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications((data as ApplicationRow[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [filter]);

  const updateStatus = async (id: string, newStatus: "active" | "suspended") => {
    try {
      const { error } = await supabase
        .from("creator_profiles")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Creator ${newStatus === "active" ? "approved" : "rejected"}`);
      setApplications(prev =>
        prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "active":        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "suspended":     return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending_review":return <Clock className="w-4 h-4 text-[#FEDB71]" />;
      default:              return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusBadge = (status: string) => {
    const base = "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full";
    switch (status) {
      case "active":         return `${base} bg-green-100 text-green-700`;
      case "suspended":      return `${base} bg-red-100 text-red-700`;
      case "pending_review": return `${base} bg-[#FEDB71]/30 text-[#1D1D1D]`;
      default:               return `${base} bg-gray-100 text-gray-500`;
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1D] pb-20">
    

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Application Queue</h1>
            <p className="text-xs text-gray-400 mt-1">{applications.length} applications</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-3 border-2 border-[#1D1D1D] hover:bg-[#1D1D1D] hover:text-white transition-colors disabled:opacity-50 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#1D1D1D]/10">
          {(["pending_review", "active", "suspended", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
                filter === tab
                  ? "border-b-2 border-[#1D1D1D] text-[#1D1D1D]"
                  : "text-gray-400 hover:text-[#1D1D1D]"
              }`}
            >
              {tab === "pending_review" ? "Pending" : tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 p-16 text-center rounded-xl">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No applications in this category</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {applications.map(app => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {app.avatar_url ? (
                      <img src={app.avatar_url} alt={app.full_name || ""} className="w-12 h-12 rounded-xl border-2 border-[#1D1D1D] object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border-2 border-[#1D1D1D] bg-[#F8F8F8] flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-sm uppercase tracking-tight">{app.full_name || "Unknown"}</h3>
                        {statusIcon(app.status)}
                      </div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest">{app.username || "—"}</p>
                      {app.location && <p className="text-[9px] text-gray-400 mt-0.5">{app.location}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={statusBadge(app.status)}>{app.status}</span>
                    <p className="text-[8px] text-gray-400">{new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Niches */}
                {app.niche && app.niche.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {app.niche.map(n => (
                      <span key={n} className="text-[7px] font-black uppercase bg-[#F8F8F8] border border-[#1D1D1D]/10 px-2 py-0.5 rounded-full">{n}</span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex gap-4 mt-4 text-[8px] font-black uppercase text-gray-400">
                  <span>~{app.avg_viewers?.toLocaleString() || 0} avg viewers</span>
                  {app.creator_platforms?.length > 0 && (
                    <span>{app.creator_platforms.length} platform{app.creator_platforms.length > 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Action Buttons — only show for pending */}
                {app.status === "pending_review" && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => updateStatus(app.id, "active")}
                      className="flex-1 bg-[#1D1D1D] text-white py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, "suspended")}
                      className="flex-1 border-2 border-[#1D1D1D] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => navigate(`/profile/${app.id}`)}
                      className="px-4 border-2 border-[#1D1D1D]/20 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-[#1D1D1D] transition-colors"
                    >
                      View
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
