import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
  MapPin,
  User,
  Globe,
  Video,
  Award,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

type CreatorFormData = {
  fullName: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  country: string;
  city: string;
  platforms: { type: string; username: string; url: string; followers?: string }[];
  frequency: string;
  duration: string;
  days: string[];
  timeOfDay: string;
  avgConcurrent: string;
  avgPeak: string;
  avgWeekly: string;
  categories: string[];
  audienceBio: string;
  referral: string;
};

export function BecomeCreator() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState(5);
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
              email: registeredEmail,
            },
            replace: true,
          });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, navigate, registeredEmail]);

  const uploadVerificationDocument = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('creator-verifications')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('creator-verifications')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading verification:", error);
      return null;
    }
  };

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

  const onSubmit = async (data: CreatorFormData) => {
    setIsLoading(true);
    setRegisteredEmail(data.email);

    try {
      if (isUnder18()) {
        toast.error("You must be 18 or older to become a creator");
        return;
      }
      if (data.password !== data.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: "creator",
            role: "creator"
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=creator`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please login instead.");
          setTimeout(() => navigate("/login/creator", { state: { email: data.email } }), 3000);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error("No user returned from signup");

      // Upload verification document
      let verificationUrl = null;
      if (selectedFile) {
        verificationUrl = await uploadVerificationDocument(selectedFile, authData.user.id);
      }

      // Create creator profile
      const { data: profileData, error: profileError } = await supabase
        .from("creator_profiles")
        .insert({
          user_id: authData.user.id,
          full_name: data.fullName,
          username: data.email.split('@')[0],
          email: data.email.toLowerCase().trim(),
          phone_number: data.phoneNumber,
          country: data.country,
          city: data.city,
          location: `${data.city}, ${data.country}`,
          niche: data.categories || [],
          avg_viewers: parseInt(data.avgConcurrent) || 0,
          total_streams: 0,
          rating: 0,
          status: "pending_review",
          verification_document_url: verificationUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (profileError) {
        console.error("Profile creation error:", profileError);
        toast.error("Failed to create creator profile");
        return;
      }

      // Add platforms
      if (profileData?.id && data.platforms?.length > 0) {
        const platformRows = data.platforms
          .filter((p) => p.username && p.url)
          .map((p) => ({
            creator_id: profileData.id,
            platform_type: p.type,
            username: p.username,
            profile_url: p.url,
            followers_count: p.followers ? parseInt(p.followers) : 0,
            created_at: new Date().toISOString()
          }));

        if (platformRows.length > 0) {
          const { error: platformError } = await supabase
            .from("creator_platforms")
            .insert(platformRows);

          if (platformError) {
            console.error("Platform insert error:", platformError);
          }
        }
      }

      // Send welcome notification
      await supabase.from("notifications").insert({
        user_id: authData.user.id,
        type: "welcome",
        title: "Welcome to LiveLink! 🎉",
        message: "Your creator application has been submitted and is under review.",
        created_at: new Date().toISOString()
      });

      // Send admin notification
      await supabase.from("notifications").insert({
        user_id: "admin",
        type: "admin_notification",
        title: "New Creator Application",
        message: `${data.fullName} has submitted a creator application for review.`,
        data: { creator_name: data.fullName, user_id: authData.user.id },
        created_at: new Date().toISOString()
      });

      setIsSubmitted(true);
      toast.success("Application submitted successfully!");

    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-4 sm:px-8 text-[#1D1D1D]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md w-full"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-4">
            Application Submitted!
          </h1>

          <p className="text-[#1D1D1D]/60 mb-8 italic text-sm">
            Thank you for applying to become a creator on LiveLink. Our team will review your application.
          </p>

          <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 italic">What happens next:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">1.</span>
                <span className="text-xs">Verify your email address</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">2.</span>
                <span className="text-xs">Our team reviews your application (usually within 48 hours)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">3.</span>
                <span className="text-xs">You'll receive an email at <span className="font-bold">{registeredEmail}</span> once approved</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login/creator")}
              className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all rounded-xl flex items-center justify-center gap-2"
            >
              Go to Creator Login
            </button>
            
            <Link to="/" className="w-full border-2 border-[#1D1D1D] text-[#1D1D1D] px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-xl text-center">
              Return to Homepage
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            All creator accounts are manually reviewed. You'll be notified via email once approved.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 sm:px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-0 z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
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
            </div>
            {step === s && (
              <span className="text-[10px] font-black uppercase tracking-widest italic hidden sm:block">
                {["Personal", "Presence", "Activity", "Proof", "Final"][s - 1]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Form Steps */}
      <div className="px-4 sm:px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About You</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This information is kept private and used for verification only.</p>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Full Legal Name <span className="text-red-500">*</span></label>
                    <input {...register("fullName", { required: "Full name is required" })} placeholder="As it appears on your ID" className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all italic ${errors.fullName ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                    {errors.fullName && <p className="text-red-500 text-[9px] font-black uppercase">{errors.fullName.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Date of Birth <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input type="date" {...register("dob", { required: "Date of birth is required", validate: { under18: (v) => { const age = calculateAge(); return age >= 18 || "You must be 18 or older"; } } })} max={new Date().toISOString().split("T")[0]} className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.dob ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
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
                        <input type={showPassword ? "text" : "password"} {...register("password", { required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } })} className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.password ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}</button>
                      </div>
                      {getPasswordStrength() && (
                        <p className={`text-[9px] font-black uppercase mt-1 ${getPasswordStrength()?.color}`}>
                          Strength: {getPasswordStrength()?.label}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Confirm Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword", { required: "Please confirm your password", validate: (v) => v === password || "Passwords do not match" })} className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.confirmPassword ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">{showConfirmPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}</button>
                      </div>
                      {errors.confirmPassword && <p className="text-red-500 text-[9px] font-black uppercase">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Phone Number <span className="text-red-500">*</span></label>
                    <div className="relative flex">
                      <select {...register("phoneCountryCode")} className="bg-white border border-[#1D1D1D]/10 border-r-0 p-5 text-xs font-black uppercase tracking-tight outline-none">
                        <option value="+44">+44</option>
                        <option value="+1">+1</option>
                        <option value="+234">+234</option>
                      </select>
                      <div className="relative flex-1">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                        <input type="tel" {...register("phoneNumber", { required: "Phone number is required" })} placeholder="Phone number" className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all ${errors.phoneNumber ? "border-red-500" : "border-[#1D1D1D]/10"}`} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country <span className="text-red-500">*</span></label>
                      <select {...register("country", { required: "Country is required" })} className={`w-full bg-white border p-5 text-xs font-black uppercase tracking-tight outline-none ${errors.country ? "border-red-500" : "border-[#1D1D1D]/10"}`}>
                        <option value="">Select Country</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Nigeria">Nigeria</option>
                      </select>
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

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Streaming Presence</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us where you go live.</p>
                <div className="flex flex-col gap-8">
                  {fields.map((field, index) => (
                    <div key={field.id} className="relative p-8 border-2 border-[#1D1D1D] bg-white">
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#389C9A]">Platform {index + 1}</span>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="p-2 hover:bg-red-50 text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Platform</label>
                          <select {...register(`platforms.${index}.type` as const)} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none">
                            <option value="Twitch">Twitch</option>
                            <option value="YouTube">YouTube</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Kick">Kick</option>
                          </select>
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
                    </div>
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

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-16">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Live Streaming Habits</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Be as accurate as possible — this determines which campaigns you match with.</p>
                <div className="flex flex-col gap-12">
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">How often do you go live? <span className="text-red-500">*</span></label>
                    <div className="flex flex-col gap-3">
                      {[{ val: "Daily", sub: "Every day" }, { val: "Several times a week", sub: "3–5 times per week" }, { val: "Weekly", sub: "Once a week" }, { val: "A few times a month", sub: "2–3 times per month" }].map((opt) => (
                        <label key={opt.val} className="cursor-pointer">
                          <input type="radio" {...register("frequency", { required: "Please select frequency" })} value={opt.val} className="peer hidden" />
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all">
                            <p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p>
                            <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 italic">{opt.sub}</p>
                          </div>
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
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all text-center italic">
                            <p className="text-[10px] font-black uppercase tracking-widest">{opt}</p>
                          </div>
                        </label>
                      ))}
                    </div>
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
                      <select {...register("timeOfDay", { required: "Please select typical time" })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none italic">
                        <option value="">Select time</option>
                        <option value="morning">Morning (6am–12pm)</option>
                        <option value="afternoon">Afternoon (12pm–5pm)</option>
                        <option value="evening">Evening (5pm–9pm)</option>
                        <option value="night">Late Night (9pm–12am)</option>
                        <option value="varies">Varies</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-8">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">Average Viewership</label>
                    {[{ field: "avgConcurrent" as const, label: "Average concurrent viewers per stream", placeholder: "e.g. 250" }].map((item, i) => (
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
                      {["Gaming", "Beauty", "Fashion", "Fitness", "Food", "Music", "Comedy", "Education", "Business", "Lifestyle", "Sports", "Tech", "Travel", "Other"].map((cat) => (
                        <label key={cat} className="cursor-pointer">
                          <input type="checkbox" {...register("categories")} value={cat} className="peer hidden" />
                          <div className="px-4 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-widest transition-all italic">{cat}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Upload Verification</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Proof of your streaming analytics from the last 30 days.</p>
                <div className="relative">
                  <input type="file" id="verification" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} className="hidden" />
                  <label htmlFor="verification" className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] group hover:border-[#1D1D1D] transition-all cursor-pointer">
                    <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      {selectedFile ? (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic text-[#389C9A]">{selectedFile.name}</p>
                          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">Click to Upload Screenshot</p>
                          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">JPG, PNG OR PDF · MAX 10MB</p>
                        </>
                      )}
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

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-12">
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Final Review</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Please confirm your details before submitting.</p>
                <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Name</span>
                    <span className="text-[10px] font-black uppercase">{fullName || "Not entered"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Email</span>
                    <span className="text-[10px] font-black uppercase break-all">{email || "Not entered"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Country</span>
                    <span className="text-[10px] font-black uppercase">{country || "Not entered"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Stream Frequency</span>
                    <span className="text-[10px] font-black uppercase">{frequency || "Not entered"}</span>
                  </div>
                </div>
                <div className="mt-8">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="peer hidden" />
                    <div className="mt-1 w-5 h-5 border-2 border-[#1D1D1D] flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                      I agree to LiveLink's Terms of Service and Privacy Policy. I confirm all information provided is accurate.
                    </span>
                  </label>
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
                  Processing...
                </span>
              ) : step === 5 ? "Submit Application" : "Continue"}
            </span>
            {!isLoading && step < 5 && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
