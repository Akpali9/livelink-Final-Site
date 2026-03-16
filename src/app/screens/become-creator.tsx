import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ChevronLeft, 
  Plus, 
  X, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Instagram, 
  Youtube, 
  Facebook, 
  MessageSquare,
  ArrowRight,
  Info,
  Calendar,
  Mail,
  Smartphone,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { toast, Toaster } from "sonner";
import { supabase } from "../lib/supabase";

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
  platforms: { type: string; username: string; url: string }[];
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
  // Step 4 - Verification file
  referral: string;
  // Terms agreement
  termsAgreed: boolean;
};

export function BecomeCreator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [emailForResend, setEmailForResend] = useState<string>("");

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<CreatorFormData>({
    defaultValues: {
      platforms: [{ type: "Twitch", username: "", url: "" }],
      days: [],
      categories: [],
      termsAgreed: false
    },
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "platforms"
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const dob = watch("dob");
  const termsAgreed = watch("termsAgreed");
  const email = watch("email");

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Weak", color: "text-red-500" };
    if (password.length < 10) return { label: "Fair", color: "text-[#FEDB71]" };
    return { label: "Strong", color: "text-[#389C9A]" };
  };

  const passwordsMatch = password === confirmPassword;

  const isUnder18 = () => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, or PDF file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      
      setVerificationFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview('/pdf-icon.png');
      }
    }
  };

  const removeFile = () => {
    setVerificationFile(null);
    setFilePreview(null);
  };

  const handleResendVerification = async () => {
    if (!emailForResend) return;
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailForResend,
    });

    if (error) {
      toast.error('Failed to resend verification email');
    } else {
      toast.success('Verification email resent! Please check your inbox.');
    }
  };

  const uploadVerificationFile = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('creator-verification')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('creator-verification')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  };

  const onSubmit = async (data: CreatorFormData) => {
    if (!data.termsAgreed) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (!verificationFile) {
      setUploadError("Please upload your streaming analytics screenshot");
      return;
    }

    setLoading(true);
    setUploadError(null);

    try {
      // 1️⃣ Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: 'creator',
            phone: data.phoneNumber,
            country: data.country,
            city: data.city,
          },
          emailRedirectTo: `${window.location.origin}/confirm-email`,
        }
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          throw new Error("An account with this email already exists. Please login instead.");
        }
        throw new Error(authError.message);
      }

      if (!authData.user) throw new Error("No user returned from signup");

      // 2️⃣ Upload verification file to storage
      const fileUrl = await uploadVerificationFile(authData.user.id, verificationFile);

      // 3️⃣ Insert creator data into the creators table
      const { error: insertError } = await supabase
        .from('creators')
        .insert([
          {
            user_id: authData.user.id,
            full_name: data.fullName,
            email: data.email,
            phone_number: data.phoneNumber,
            country: data.country,
            city: data.city,
            platforms: data.platforms,
            frequency: data.frequency,
            duration: data.duration,
            days: data.days,
            time_of_day: data.timeOfDay,
            avg_concurrent: data.avgConcurrent ? parseInt(data.avgConcurrent) : null,
            avg_peak: data.avgPeak ? parseInt(data.avgPeak) : null,
            avg_weekly: data.avgWeekly ? parseInt(data.avgWeekly) : null,
            categories: data.categories,
            audience_bio: data.audienceBio,
            referral_code: data.referral || null,
            verification_file_url: fileUrl,
            status: 'pending_verification',
            agreed_to_terms: data.termsAgreed,
            terms_agreed_at: new Date().toISOString(),
          }
        ]);

      if (insertError) {
        // If insert fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error("Failed to save creator profile. Please try again.");
      }

      // 4️⃣ Success!
      setEmailForResend(data.email);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
      toast.success("Application submitted! Please check your email to verify your account.");

    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    switch(step) {
      case 1:
        return watch("fullName") && watch("email") && password?.length >= 6 && passwordsMatch && !isUnder18();
      case 2:
        return watch("platforms")?.length > 0 && watch("platforms.0.username");
      case 3:
        return watch("frequency") && watch("duration") && watch("avgConcurrent");
      case 4:
        return verificationFile !== null;
      case 5:
        return termsAgreed;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, 5));
      window.scrollTo(0, 0);
    } else {
      toast.error("Please fill in all required fields");
    }
  };
  
  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <Toaster position="top-center" richColors />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          
          {/* Email verification notice */}
          <div className="bg-[#389C9A]/10 border-2 border-[#389C9A] p-6 mb-8 text-left">
            <h2 className="text-[10px] font-black uppercase tracking-widest mb-2 text-[#389C9A] flex items-center gap-2">
              <Mail className="w-4 h-4" /> Important: Verify Your Email
            </h2>
            <p className="text-sm font-medium italic mb-4">
              We've sent a verification email to <span className="font-black break-all">{email}</span>. 
              You must verify your email address before our team can review your application.
            </p>
            <div className="bg-white p-4 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D]/60">
              <p>📧 Check your inbox (and spam folder) for the verification link</p>
            </div>
          </div>

          <p className="text-[#1D1D1D]/60 mb-8 text-sm leading-relaxed italic">
            Once you verify your email, our team will review your application within 48 hours.
          </p>

          <div className="mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">What happens next</h3>
            <div className="relative flex flex-col gap-6 text-left">
              {[
                { step: "01", text: "Verify your email address (check your inbox now)", highlight: true },
                { step: "02", text: "Our team reviews your application and streaming analytics" },
                { step: "03", text: "You receive an approval or feedback email within 48 hours" },
                { step: "04", text: "Once approved, you get instant access to your creator dashboard" }
              ].map((item, i) => (
                <div key={i} className={`flex gap-4 items-start ${item.highlight ? 'bg-[#FEDB71]/10 p-3 -mx-3' : ''}`}>
                  <span className={`font-black italic ${item.highlight ? 'text-[#FEDB71]' : 'text-[#389C9A]'}`}>{item.step}</span>
                  <p className="text-sm font-bold uppercase tracking-tight italic">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => window.location.href = 'https://mail.google.com'}
              className="flex-1 bg-[#1D1D1D] text-white p-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all italic flex items-center justify-center gap-2"
            >
              Open Gmail <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="flex-1 border-2 border-[#1D1D1D] p-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] transition-all italic"
            >
              Resend Email
            </button>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest mb-4 italic text-[#1D1D1D]/40">Follow us while you wait</p>
          <div className="flex justify-center gap-6 mb-8 text-[#389C9A]">
            <Instagram className="w-6 h-6" />
            <Youtube className="w-6 h-6" />
            <Facebook className="w-6 h-6" />
            <MessageSquare className="w-6 h-6" />
          </div>

          <Link to="/" className="inline-block border-2 border-[#1D1D1D] px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all mb-6 italic w-full">
            Back to Home
          </Link>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest">
            Questions? Contact support@livelink.com
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 italic">
          <ChevronLeft className="w-4 h-4 text-[#1D1D1D]" /> Back
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Become a Creator on LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Join hundreds of live creators already earning through their streams. Fill in your details below and our team will review your application within 48 hours.
        </p>
        <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All creator accounts are manually reviewed and approved by our team. You must verify your email to complete the process.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-[84px] z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4 scrollbar-hide">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-none border-2 ${
              step === s ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' : 
              step > s ? 'bg-[#389C9A] text-white border-[#389C9A]' : 
              'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'
            }`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {step === s && (
              <span className="text-[10px] font-black uppercase tracking-widest italic">
                {s === 1 ? "Personal" : s === 2 ? "Presence" : s === 3 ? "Activity" : s === 4 ? "Proof" : "Final"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="px-8 mt-4">
          <div className="bg-red-50 border border-red-200 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
              {uploadError}
            </p>
          </div>
        </div>
      )}

      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About You</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This information is kept private and is only used for verification purposes.</p>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register("fullName", { required: true })}
                    placeholder="As it appears on your ID"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                    <input 
                      type="date"
                      {...register("dob", { required: true })}
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none"
                    />
                  </div>
                  {isUnder18() && (
                    <p className="text-[9px] font-black uppercase text-red-500 mt-1">You must be 18 or over to join LiveLink as a creator.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                    <input 
                      type="email"
                      {...register("email", { required: true })}
                      placeholder="This will be your login email"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        {...register("password", { required: true, minLength: 6 })}
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}
                      </button>
                    </div>
                    {getPasswordStrength() && (
                      <p className={`text-[9px] font-black uppercase mt-1 ${getPasswordStrength()?.color}`}>
                        Strength: {getPasswordStrength()?.label}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password"
                      {...register("confirmPassword", { required: true })}
                      className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                        confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-[#1D1D1D]/10'
                      }`}
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-[9px] font-black uppercase text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex">
                    <select 
                      {...register("phoneNumber")}
                      className="bg-white border border-[#1D1D1D]/10 border-r-0 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                    >
                      <option value="+234">+234</option>
                      <option value="+263">+263</option>
                      <option value="+27">+27</option>
                      <option value="+233">+233</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="tel"
                        {...register("phoneNumber")}
                        placeholder="Phone number"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select 
                      {...register("country", { required: true })}
                      className="w-full bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                    >
                      <option value="">Select Country</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register("city", { required: true })}
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                    />
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Streaming Presence</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us where you go live. Add at least one platform to continue.</p>

              <div className="flex flex-col gap-8">
                {fields.map((field, index) => (
                  <div key={field.id} className="relative p-8 border-2 border-[#1D1D1D] bg-white rounded-none">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#389C9A]">Platform {index + 1}</span>
                      {fields.length > 1 && (
                        <button onClick={() => remove(index)} className="p-2 hover:bg-red-50 text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                          Platform <span className="text-red-500">*</span>
                        </label>
                        <select 
                          {...register(`platforms.${index}.type` as const)}
                          className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                        >
                          <option>TikTok</option>
                          <option>Instagram</option>
                          <option>Facebook</option>
                          <option>YouTube</option>
                          <option>Twitch</option>
                          <option>Kick</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input 
                          {...register(`platforms.${index}.username` as const, { required: true })}
                          placeholder="@yourusername"
                          className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Profile URL</label>
                        <input 
                          {...register(`platforms.${index}.url` as const)}
                          placeholder="https://..."
                          className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {fields.length < 5 && (
                  <button 
                    onClick={() => append({ type: "Twitch", username: "", url: "" })}
                    className="w-full border-2 border-dashed border-[#1D1D1D]/20 p-8 flex flex-col items-center gap-2 hover:border-[#1D1D1D] transition-all text-[#1D1D1D]/40 hover:text-[#1D1D1D] rounded-none group"
                  >
                    <Plus className="w-6 h-6 text-[#389C9A]" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Add Another Platform</span>
                  </button>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-16">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Live Streaming Habits</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Be as accurate as possible. This information determines which campaigns you are matched with.</p>

              <div className="flex flex-col gap-12">
                {/* Frequency */}
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    How often do you go live? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    {[
                      { val: "Daily", sub: "I go live every day" },
                      { val: "Several times a week", sub: "I go live 3 to 5 times per week" },
                      { val: "Weekly", sub: "I go live once a week" },
                      { val: "A few times a month", sub: "I go live 2 to 3 times per month" }
                    ].map(opt => (
                      <label key={opt.val} className="relative group cursor-pointer">
                        <input type="radio" {...register("frequency", { required: true })} value={opt.val} className="peer hidden" />
                        <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all rounded-none">
                          <p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p>
                          <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 peer-checked:opacity-60 italic">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Average stream length <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "30 to 45 minutes",
                      "45 minutes to 1 hour",
                      "1 to 2 hours",
                      "Over 2 hours"
                    ].map(opt => (
                      <label key={opt} className="relative cursor-pointer">
                        <input type="radio" {...register("duration", { required: true })} value={opt} className="peer hidden" />
                        <div className="p-5 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] transition-all text-center rounded-none italic">
                          <p className="text-[9px] font-black uppercase tracking-widest">{opt}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Viewership */}
                <div className="flex flex-col gap-8">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Average Viewers <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">1</span>
                        <input 
                          type="number"
                          {...register("avgConcurrent", { required: true })}
                          placeholder="e.g. 250"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                        />
                      </div>
                      <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">Average concurrent viewers</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">2</span>
                        <input 
                          type="number"
                          {...register("avgPeak")}
                          placeholder="e.g. 500"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-4 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                        />
                      </div>
                      <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">Average peak viewers</p>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">Content Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Gaming", "Beauty", "Fashion", "Fitness", "Music", "Comedy", 
                      "Education", "Lifestyle", "Sports", "Tech", "Travel"
                    ].map(cat => (
                      <label key={cat} className="cursor-pointer">
                        <input type="checkbox" {...register("categories")} value={cat} className="peer hidden" />
                        <div className="px-3 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[8px] font-black uppercase tracking-widest transition-all rounded-none italic">
                          {cat}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Upload Verification</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Upload a screenshot of your streaming analytics from the last 30 days.</p>
              
              {!verificationFile ? (
                <div className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] rounded-none group hover:border-[#1D1D1D] cursor-pointer transition-all">
                  <input
                    type="file"
                    id="verification-upload"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="verification-upload" className="cursor-pointer text-center w-full">
                    <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all rounded-none inline-block mb-4">
                      <Upload className="w-8 h-8 text-[#389C9A] group-hover:text-[#FEDB71]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">Upload Analytics Screenshot</p>
                      <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">JPG, PNG OR PDF · MAX 10MB</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-[#389C9A] p-8 bg-[#F8F8F8] flex items-center gap-6">
                  {filePreview && verificationFile.type.startsWith('image/') ? (
                    <img src={filePreview} alt="Preview" className="w-20 h-20 object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-[#1D1D1D] flex items-center justify-center text-white font-black">
                      PDF
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase mb-1">{verificationFile.name}</p>
                    <p className="text-[8px] opacity-40 uppercase">{(verificationFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-3 bg-red-50 text-red-500 border border-red-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-6 pt-12 border-t-2 border-[#1D1D1D]/10">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Referral Code (Optional)</label>
                  <input 
                    {...register("referral")}
                    placeholder="If you were referred by another creator"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                  />
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Final Review</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Please confirm your details are correct before submitting.</p>
              
              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 rounded-none flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Name</span>
                  <span className="text-[10px] font-black uppercase">{watch("fullName") || "Not entered"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Email</span>
                  <span className="text-[10px] font-black uppercase">{watch("email") || "Not entered"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Main Platform</span>
                  <span className="text-[10px] font-black uppercase">{watch("platforms.0.type") || "Not entered"}</span>
                </div>
                <div className="flex justify-between items-center italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Avg Viewers</span>
                  <span className="text-[10px] font-black uppercase">{watch("avgConcurrent") || "Not entered"}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    {...register("termsAgreed")}
                    className="hidden" 
                  />
                  <div 
                    onClick={() => {
                      const current = termsAgreed;
                      setValue("termsAgreed", !current, { shouldValidate: true });
                    }}
                    className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-all rounded-none cursor-pointer ${
                      termsAgreed ? 'bg-[#389C9A] border-[#389C9A]' : 'border-[#1D1D1D] bg-white'
                    }`}
                  >
                    {termsAgreed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                    I agree to LiveLink's <Link to="/terms" className="underline font-black hover:text-[#389C9A]">Terms of Service</Link> and 
                    <Link to="/privacy" className="underline font-black hover:text-[#389C9A]"> Privacy Policy</Link>. I confirm that all information is accurate. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </section>
          </motion.div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
        <div className="flex gap-4">
          {step > 1 && (
            <button 
              onClick={prevStep}
              className="px-6 py-4 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic"
            >
              Back
            </button>
          )}
          {step < 5 ? (
            <button 
              onClick={nextStep}
              disabled={!validateStep()}
              className={`flex-1 py-4 font-black uppercase tracking-widest text-[10px] transition-all rounded-none italic ${
                validateStep() 
                  ? 'bg-[#1D1D1D] text-white active:scale-[0.98]' 
                  : 'bg-[#1D1D1D]/30 text-white/50 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleSubmit(onSubmit)}
              disabled={!validateStep() || loading}
              className={`flex-1 flex items-center justify-between p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-none italic ${
                validateStep() && !loading
                  ? 'bg-[#1D1D1D] text-white' 
                  : 'bg-[#1D1D1D]/50 cursor-not-allowed text-white/50'
              }`}
            >
              <span>{loading ? "Submitting..." : "Submit Application"}</span>
              {!loading && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
            </button>
          )}
        </div>
        
        {step === 5 && !termsAgreed && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center">
            You must agree to the terms to submit your application
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminApplicationQueue() {
  const [apps, setApps] = useState([
    { id: 1, name: "Jordan Plays", platform: "Twitch", viewers: "450", status: "pending", appliedAt: "2024-01-15", email: "jordan@example.com" },
    { id: 2, name: "Sarah Stream", platform: "TikTok", viewers: "1.2k", status: "pending", appliedAt: "2024-01-14", email: "sarah@example.com" }
  ]);

  const handleApprove = async (id: number) => {
    try {
      // In a real app, you would update the database
      // const { error } = await supabase
      //   .from('creators')
      //   .update({ status: 'approved', reviewed_at: new Date() })
      //   .eq('id', id);
      
      toast.success("Application approved! Creator will be notified.");
      setApps(prev => prev.filter(app => app.id !== id));
    } catch (error) {
      toast.error("Failed to approve application");
    }
  };

  const handleReject = async (id: number) => {
    try {
      // In a real app, you would update the database
      toast.error("Application rejected.");
      setApps(prev => prev.filter(app => app.id !== id));
    } catch (error) {
      toast.error("Failed to reject application");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <Toaster position="top-center" richColors />
      <AppHeader title="Admin Review" showLogo />
      <main className="p-8 max-w-[600px] mx-auto w-full pb-32">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Pending Applications</h1>
          <span className="bg-[#FEDB71] px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            {apps.length} new
          </span>
        </div>
        
        {apps.length === 0 ? (
          <div className="border-2 border-[#1D1D1D]/10 p-12 text-center">
            <p className="text-xs text-[#1D1D1D]/40">No pending applications to review.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {apps.map(app => (
              <motion.div 
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex flex-col gap-4 rounded-none"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg italic">{app.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#389C9A]">
                      {app.platform} · {app.viewers} Avg Viewers
                    </p>
                    <p className="text-[8px] font-medium text-[#1D1D1D]/40 uppercase tracking-widest mt-1">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                    <p className="text-[8px] font-medium text-[#1D1D1D]/40 uppercase tracking-widest">
                      {app.email}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase border border-[#1D1D1D]/10">
                    Pending Review
                  </span>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-[#1D1D1D]/10">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Platforms</p>
                    <p className="text-xs font-black mt-1">2</p>
                  </div>
                  <div className="text-center border-l border-r border-[#1D1D1D]/10">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Categories</p>
                    <p className="text-xs font-black mt-1">Gaming</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Streams/Week</p>
                    <p className="text-xs font-black mt-1">4-5</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(app.id)}
                    className="flex-1 bg-[#1D1D1D] text-white p-4 text-[10px] font-black uppercase tracking-widest italic border-2 border-[#1D1D1D] hover:bg-[#389C9A] hover:border-[#389C9A] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(app.id)}
                    className="flex-1 border-2 border-[#1D1D1D] text-[#1D1D1D] p-4 text-[10px] font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>

                {/* View Details Link */}
                <Link 
                  to={`/admin/application/${app.id}`}
                  className="text-[9px] font-black uppercase tracking-widest text-[#389C9A] underline italic text-center hover:opacity-70 transition-opacity"
                >
                  View Full Application Details
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Admin Quick Stats */}
        <div className="mt-12 pt-8 border-t-2 border-[#1D1D1D]/10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40">Quick Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#F8F8F8] p-4 text-center">
              <p className="text-2xl font-black italic text-[#389C9A]">{apps.length}</p>
              <p className="text-[8px] font-black uppercase tracking-widest mt-1">Pending</p>
            </div>
            <div className="bg-[#F8F8F8] p-4 text-center">
              <p className="text-2xl font-black italic text-[#FEDB71]">12</p>
              <p className="text-[8px] font-black uppercase tracking-widest mt-1">Approved</p>
            </div>
            <div className="bg-[#F8F8F8] p-4 text-center">
              <p className="text-2xl font-black italic text-[#1D1D1D]/40">3</p>
              <p className="text-[8px] font-black uppercase tracking-widest mt-1">Rejected</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
