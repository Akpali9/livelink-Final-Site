import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  ChevronLeft,
  Plus,
  X,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  ArrowRight,
  Info,
  Calendar,
  Smartphone,
  Mail,
  Loader2,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

type CreatorFormData = {
  fullName: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneCountryCode: string;
  phoneNumber: string;
  country: string;
  city: string;
  platforms: { type: string; username: string; url: string; followers?: string }[];
  frequency: string;
  duration: string;
  days: string[];
  timeOfDay: string;
  avgConcurrent: string;
  categories: string[];
  referral: string;
};

const STEPS = ["Personal", "Presence", "Activity", "Proof", "Review"];

export function BecomeCreator() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");

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
      phoneCountryCode: "+234",
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "platforms" });

  const password = watch("password");
  const dob = watch("dob");
  const email = watch("email");
  const fullName = watch("fullName");
  const country = watch("country");
  const frequency = watch("frequency");

  // ✅ No email confirmation — redirect straight to dashboard
  useEffect(() => {
    if (!isSubmitted) return;
    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSubmitted, navigate]);

  const uploadVerificationDocument = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("creator-verifications")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("creator-verifications")
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("Error uploading verification:", error);
      return null;
    }
  };

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

  const calculateAge = (): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isUnder18 = () => calculateAge() < 18;

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

  const nextStep = async () => {
    const valid = await validateStep(step);
    if (!valid) { toast.error("Please fill in all required fields"); return; }
    if (step === 1 && isUnder18()) { toast.error("You must be 18 or older to become a creator"); return; }
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: CreatorFormData) => {
    setIsLoading(true);
    setRegisteredEmail(data.email);
    try {
      if (isUnder18()) { toast.error("You must be 18 or older"); return; }
      if (data.password !== data.confirmPassword) { toast.error("Passwords do not match"); return; }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: { full_name: data.fullName, user_type: "creator", role: "creator" },
          // ✅ REMOVED emailRedirectTo — was causing 422 Unprocessable Content
        },
      });

      if (signUpError) {
        if (
          signUpError.message.includes("User already registered") ||
          signUpError.message.includes("already been registered")
        ) {
          toast.error("An account with this email already exists. Please login instead.");
          setTimeout(() => navigate("/login/creator", { state: { email: data.email } }), 2000);
          return;
        }
        throw signUpError;
      }
      if (!authData.user) throw new Error("No user returned from signup");

      let verificationUrl = null;
      if (selectedFile) {
        verificationUrl = await uploadVerificationDocument(selectedFile, authData.user.id);
      }

const { data: profileData, error: profileError } = await supabase
  .from("creator_profiles")
  .insert({
    // Identity
    user_id:                   authData.user.id,
    full_name:                 data.fullName,
    username:                  data.email.split("@")[0],
    email:                     data.email.toLowerCase().trim(),
    phone_number:              data.phoneNumber,
    phone_country_code:        data.phoneCountryCode,
    // Location
    country:                   data.country,
    city:                      data.city,
    location:                  `${data.city}, ${data.country}`,
    // Streaming habits — exact column names from your schema
    frequency:                 data.frequency,
    duration:                  data.duration,
    days:                      data.days || [],
    time_of_day:               data.timeOfDay,
    avg_concurrent:            parseInt(data.avgConcurrent) || 0,
    // Content
    categories:                data.categories || [],
    niche:                     data.categories || [],
    // Verification
    verification_document_url: verificationUrl,
    verification_status:       "pending",
    referral_code:             data.referral || null,
    // Defaults matching your schema
    status:                    "active",
    platforms:                 [],
    avg_viewers:               0,
    avg_peak:                  0,
    avg_weekly:                0,
    total_streams:             0,
    total_earned:              0,
    pending_earnings:          0,
    paid_out:                  0,
    rating:                    0,
    bio:                       "",
    created_at:                new Date().toISOString(),
    updated_at:                new Date().toISOString(),
  })
  .select("id")
  .single();
      if (profileError) {
        console.error("Profile creation error:", profileError);
        toast.error("Failed to create creator profile");
        return;
      }

      if (profileData?.id && data.platforms?.length > 0) {
        const platformRows = data.platforms
          .filter((p) => p.username && p.url)
          .map((p) => ({
            creator_id: profileData.id,
            platform_type: p.type,
            username: p.username,
            profile_url: p.url,
            followers_count: p.followers ? parseInt(p.followers) : 0,
            created_at: new Date().toISOString(),
          }));
        if (platformRows.length > 0) {
          const { error: platformError } = await supabase
            .from("creator_platforms")
            .insert(platformRows);
          if (platformError) console.error("Platform insert error:", platformError);
        }
      }

      await supabase.from("notifications").insert({
        user_id: authData.user.id,
        type: "welcome",
        title: "Welcome to LiveLink! 🎉",
        message: "Your creator application has been submitted and is under review.",
        created_at: new Date().toISOString(),
      });

      setIsSubmitted(true);
      toast.success("Application submitted! Redirecting...");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ──
  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-[#1D1D1D] rounded-2xl flex items-center justify-center mx-auto mb-8 border-4 border-[#FEDB71]">
            <CheckCircle2 className="w-10 h-10 text-[#389C9A]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-3">
            Application Submitted!
          </h1>
          <p className="text-sm text-[#1D1D1D]/50 italic mb-6">
            Our team will review your application and reach out via email.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#389C9A]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to your dashboard...
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Field helpers ──
  const inputClass = (hasError?: boolean) =>
    `w-full bg-[#F8F8F8] border-2 ${
      hasError ? "border-red-400" : "border-[#E8E8E8]"
    } focus:border-[#1D1D1D] rounded-xl px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:opacity-40 placeholder:font-normal`;

  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/50 mb-1.5";
  const errorClass = "text-red-500 text-[9px] font-bold uppercase tracking-wide mt-1";

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[60px] max-w-[480px] mx-auto w-full">

      {/* ── Top banner ── */}
      <div className="px-5 pt-12 pb-6 border-b-2 border-[#1D1D1D]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-opacity italic"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Become a Creator
        </h1>
        <p className="text-sm text-[#1D1D1D]/50 italic mb-5">
          Join hundreds of creators already earning through their streams.
        </p>
        <div className="flex gap-3 bg-[#FEDB71]/10 border-2 border-[#FEDB71] rounded-xl p-4">
          <Info className="w-4 h-4 text-[#389C9A] shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">
            All creator accounts are manually reviewed. You'll be notified via email once approved.
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#1D1D1D]/10 px-5 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <button
                  key={s}
                  onClick={() => s < step && setStep(s)}
                  className={`flex items-center gap-1.5 transition-all ${s < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${
                      isActive
                        ? "bg-[#1D1D1D] text-white border-[#1D1D1D]"
                        : isDone
                        ? "bg-[#389C9A] text-white border-[#389C9A]"
                        : "bg-white text-[#1D1D1D]/30 border-[#E8E8E8]"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${
                      isActive ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-0.5 bg-[#E8E8E8] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#389C9A] rounded-full"
              animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Form body ── */}
      <div className="px-5 pt-8 max-w-lg mx-auto mb-12">
        <AnimatePresence mode="wait">

          {/* STEP 1 — Personal */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">About You</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">
                  Kept private — used for verification only.
                </p>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>Full Legal Name <span className="text-red-400">*</span></label>
                  <input
                    {...register("fullName", { required: "Full name is required" })}
                    placeholder="As it appears on your ID"
                    className={inputClass(!!errors.fullName)}
                  />
                  {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Date of Birth <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" />
                    <input
                      type="date"
                      {...register("dob", {
                        required: "Date of birth is required",
                        validate: { under18: () => calculateAge() >= 18 || "You must be 18 or older" },
                      })}
                      max={new Date().toISOString().split("T")[0]}
                      className={`${inputClass(!!errors.dob)} pl-10`}
                    />
                  </div>
                  {errors.dob && <p className={errorClass}>{errors.dob.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" />
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" },
                      })}
                      placeholder="your@email.com"
                      className={`${inputClass(!!errors.email)} pl-10`}
                    />
                  </div>
                  {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        {...register("password", {
                          required: "Password is required",
                          minLength: { value: 6, message: "At least 6 characters" },
                        })}
                        className={`${inputClass(!!errors.password)} pr-10`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {getPasswordStrength() && (
                      <p className={`text-[9px] font-black uppercase mt-1 ${getPasswordStrength()?.color}`}>
                        {getPasswordStrength()?.label}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Confirm Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        {...register("confirmPassword", {
                          required: "Please confirm your password",
                          validate: (v) => v === password || "Passwords do not match",
                        })}
                        className={`${inputClass(!!errors.confirmPassword)} pr-10`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone Number <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <select {...register("phoneCountryCode")} className="bg-[#F8F8F8] border-2 border-[#E8E8E8] rounded-xl px-3 py-3.5 text-xs font-black outline-none focus:border-[#1D1D1D] shrink-0">
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+234">🇳🇬 +234</option>
                      <option value="+1-CA">🇨🇦 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" />
                      <input
                        type="tel"
                        {...register("phoneNumber", { required: "Phone number is required" })}
                        placeholder="Phone number"
                        className={`${inputClass(!!errors.phoneNumber)} pl-10`}
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Country <span className="text-red-400">*</span></label>
                    <select
                      {...register("country", { required: "Country is required" })}
                      className={`w-full bg-[#F8F8F8] border-2 ${errors.country ? "border-red-400" : "border-[#E8E8E8]"} focus:border-[#1D1D1D] rounded-xl px-4 py-3.5 text-xs font-semibold outline-none transition-colors`}
                    >
                      <option value="">Select</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Nigeria">Nigeria</option>
                    </select>
                    {errors.country && <p className={errorClass}>{errors.country.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>City <span className="text-red-400">*</span></label>
                    <input {...register("city", { required: "City is required" })} placeholder="Your city" className={inputClass(!!errors.city)} />
                    {errors.city && <p className={errorClass}>{errors.city.message}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Streaming Presence */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Your Streaming Presence</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">Tell us where you go live.</p>
              </div>
              <div className="flex flex-col gap-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border-2 border-[#1D1D1D] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#389C9A]">Platform {index + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className={labelClass}>Platform</label>
                        <select {...register(`platforms.${index}.type`)} className="w-full bg-[#F8F8F8] border-2 border-[#E8E8E8] rounded-xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-[#1D1D1D] transition-colors">
                          {["Twitch", "YouTube", "TikTok", "Instagram", "Facebook", "Kick"].map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Username <span className="text-[#389C9A]">*</span></label>
                          <input {...register(`platforms.${index}.username`, { required: "Required" })} placeholder="@yourname" className={inputClass(!!errors.platforms?.[index]?.username)} />
                        </div>
                        <div>
                          <label className={labelClass}>Followers</label>
                          <input {...register(`platforms.${index}.followers`)} placeholder="e.g. 10000" type="number" className={inputClass()} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Profile URL <span className="text-[#389C9A]">*</span></label>
                        <input
                          {...register(`platforms.${index}.url`, {
                            required: "URL required",
                            pattern: { value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, message: "Valid URL required" },
                          })}
                          placeholder="https://twitch.tv/yourname"
                          className={inputClass(!!errors.platforms?.[index]?.url)}
                        />
                        {errors.platforms?.[index]?.url && <p className={errorClass}>{errors.platforms[index].url?.message}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {fields.length < 5 && (
                  <button type="button" onClick={() => append({ type: "Twitch", username: "", url: "", followers: "" })} className="w-full border-2 border-dashed border-[#1D1D1D]/20 rounded-2xl p-6 flex items-center justify-center gap-2 hover:border-[#389C9A] hover:text-[#389C9A] transition-colors text-[#1D1D1D]/40 group">
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Add Another Platform</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Activity */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Streaming Habits</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">Determines which campaigns you match with.</p>
              </div>
              <div>
                <label className={`${labelClass} mb-3`}>How often do you go live? <span className="text-red-400">*</span></label>
                <div className="flex flex-col gap-2">
                  {[{ val: "Daily", sub: "Every day" }, { val: "Several times a week", sub: "3–5 times per week" }, { val: "Weekly", sub: "Once a week" }, { val: "A few times a month", sub: "2–3 times per month" }].map((opt) => (
                    <label key={opt.val} className="cursor-pointer">
                      <input type="radio" {...register("frequency", { required: true })} value={opt.val} className="peer hidden" />
                      <div className="peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] border-2 border-[#E8E8E8] rounded-xl p-4 transition-all hover:border-[#1D1D1D]/40">
                        <p className="text-[11px] font-black uppercase tracking-wide italic">{opt.val}</p>
                        <p className="text-[9px] opacity-50 mt-0.5">{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.frequency && <p className={errorClass}>Please select a frequency</p>}
              </div>
              <div>
                <label className={`${labelClass} mb-3`}>Average stream length <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["Under 30 min", "30–45 min", "45 min–1 hr", "1–2 hours", "Over 2 hours"].map((opt) => (
                    <label key={opt} className="cursor-pointer">
                      <input type="radio" {...register("duration", { required: true })} value={opt} className="peer hidden" />
                      <div className="peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] border-2 border-[#E8E8E8] rounded-xl p-3 text-center transition-all hover:border-[#1D1D1D]/40">
                        <p className="text-[10px] font-black uppercase tracking-wide italic">{opt}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={`${labelClass} mb-3`}>Days you go live</label>
                  <div className="flex flex-wrap gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <label key={day} className="cursor-pointer">
                        <input type="checkbox" {...register("days")} value={day} className="peer hidden" />
                        <div className="w-11 h-11 flex items-center justify-center border-2 border-[#E8E8E8] rounded-xl peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[10px] font-black transition-all hover:border-[#1D1D1D]/40">{day[0]}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Typical Time <span className="text-red-400">*</span></label>
                  <select {...register("timeOfDay", { required: true })} className="w-full bg-[#F8F8F8] border-2 border-[#E8E8E8] rounded-xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-[#1D1D1D] transition-colors">
                    <option value="">Select time</option>
                    <option value="morning">Morning (6am–12pm)</option>
                    <option value="afternoon">Afternoon (12pm–5pm)</option>
                    <option value="evening">Evening (5pm–9pm)</option>
                    <option value="night">Late Night (9pm–12am)</option>
                    <option value="varies">Varies</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Average Concurrent Viewers</label>
                <input type="number" {...register("avgConcurrent")} placeholder="e.g. 250" min="0" className={inputClass()} />
              </div>
              <div>
                <label className={`${labelClass} mb-3`}>Content Categories</label>
                <div className="flex flex-wrap gap-2">
                  {["Gaming", "Beauty", "Fashion", "Fitness", "Food", "Music", "Comedy", "Education", "Business", "Lifestyle", "Sports", "Tech", "Travel", "Other"].map((cat) => (
                    <label key={cat} className="cursor-pointer">
                      <input type="checkbox" {...register("categories")} value={cat} className="peer hidden" />
                      <div className="px-3.5 py-2 border-2 border-[#E8E8E8] rounded-full peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-wide transition-all hover:border-[#1D1D1D]/40">{cat}</div>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Proof */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Upload Verification</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">Proof of your streaming analytics from the last 30 days.</p>
              </div>
              <input type="file" id="verification" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} className="hidden" />
              <label htmlFor="verification" className="border-2 border-dashed border-[#1D1D1D]/20 rounded-2xl p-10 flex flex-col items-center gap-5 bg-[#F8F8F8] hover:border-[#389C9A] hover:bg-[#F0FAFA] transition-all cursor-pointer group">
                <div className="w-14 h-14 border-2 border-[#1D1D1D] rounded-xl bg-white flex items-center justify-center group-hover:bg-[#1D1D1D] group-hover:text-white transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#389C9A] italic">{selectedFile.name}</p>
                    <p className="text-[9px] opacity-40 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-wide italic">Click to upload screenshot</p>
                    <p className="text-[9px] opacity-40 mt-1">JPG, PNG or PDF · Max 10MB</p>
                  </div>
                )}
              </label>
              <div className="border-t-2 border-[#E8E8E8] pt-6">
                <label className={labelClass}>Referral Code (Optional)</label>
                <input {...register("referral")} placeholder="If referred by another creator" className={inputClass()} />
              </div>
            </motion.div>
          )}

          {/* STEP 5 — Review */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-8">
              <div>
                <label className="flex items-start gap-3 cursor-pointer mb-8">
                <input type="checkbox" required className="peer hidden" />
                <div className="mt-0.5 w-5 h-5 border-2 border-[#1D1D1D] rounded-md flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] font-semibold leading-relaxed opacity-60 italic">
                  I agree to LiveLink's Terms of Service and Privacy Policy. I confirm all information provided is accurate.
                </span>
              </label>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Final Review</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">Confirm your details before submitting.</p>
              </div>
              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] rounded-2xl overflow-hidden">
                {[
                  { label: "Name", value: fullName },
                  { label: "Email", value: email },
                  { label: "Country", value: country },
                  { label: "Stream Frequency", value: frequency },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`flex justify-between items-center px-5 py-4 ${i < 3 ? "border-b border-[#1D1D1D]/10" : ""}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{label}</span>
                    <span className="text-[10px] font-black uppercase text-right max-w-[60%] truncate">
                      {value || <span className="opacity-30">Not entered</span>}
                    </span>
                  </div>
                ))}
              </div>
              
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fixed footer nav ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t-2 border-[#1D1D1D] px-5 py-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button type="button" onClick={prevStep} disabled={isLoading} className="px-5 py-4 border-2 border-[#1D1D1D] rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-colors disabled:opacity-50">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={step === 5 ? handleSubmit(onSubmit) : nextStep}
            disabled={isLoading}
            className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white px-5 py-4 rounded-xl font-black uppercase tracking-tight text-[11px] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span>
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span>
              ) : step === 5 ? "Submit Application" : "Continue"}
            </span>
            {!isLoading && step < 5 && <ArrowRight className="w-4 h-4 text-[#FEDB71]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
