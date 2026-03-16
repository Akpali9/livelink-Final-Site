import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "motion/react";
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
  Briefcase,
  Mail,
  Smartphone,
  Globe,
  AlertCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, Toaster } from "sonner";

type BusinessFormData = {
  fullName: string;
  jobTitle: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  phoneCountryCode: string;
  businessName: string;
  businessType: string;
  industry: string;
  description: string;
  website: string;
  socials: { platform: string; handle: string }[];
  country: string;
  city: string;
  postcode: string;
  operatingTime: string;
  goals: string[];
  campaignType: string;
  budget: string;
  ageMin: number;
  ageMax: number;
  gender: string[];
  targetLocation: string;
  referral: string;
  agreeToTerms: boolean;
};

export function BecomeBusiness() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailForResend, setEmailForResend] = useState<string>("");

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<BusinessFormData>({
    defaultValues: {
      socials: [{ platform: "Instagram", handle: "" }],
      goals: [],
      gender: [],
      ageMin: 18,
      ageMax: 65,
      phoneCountryCode: "+234",
      agreeToTerms: false
    },
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "socials"
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const agreeToTerms = watch("agreeToTerms");
  const email = watch("email");

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Weak", color: "text-red-500" };
    if (password.length < 10) return { label: "Fair", color: "text-[#FEDB71]" };
    return { label: "Strong", color: "text-[#389C9A]" };
  };

  const passwordsMatch = password === confirmPassword;

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, or PDF file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size must be less than 5MB');
        return;
      }
      
      setIdFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setIdPreview('/pdf-icon.png');
      }
    }
  };

  const removeIdFile = () => {
    setIdFile(null);
    setIdPreview(null);
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

  const uploadIDFile = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/id-verification.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('business-verification')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('business-verification')
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  };

  const onSubmit = async (data: BusinessFormData) => {
    if (!idFile) {
      setUploadError("Please upload a government ID for verification");
      return;
    }

    if (!data.agreeToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);
    setUploadError(null);

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: 'business',
            job_title: data.jobTitle,
            phone: `${data.phoneCountryCode}${data.phoneNumber}`,
          },
          emailRedirectTo: `${window.location.origin}/confirm-email`,
        }
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("No user returned from signup");

      // 2. Upload ID file to storage
      const idFileUrl = await uploadIDFile(authData.user.id, idFile);

      // 3. Insert business data into the businesses table
      const { error: insertError } = await supabase
        .from('businesses')
        .insert([
          {
            user_id: authData.user.id,
            full_name: data.fullName,
            job_title: data.jobTitle,
            email: data.email,
            phone_number: `${data.phoneCountryCode}${data.phoneNumber}`,
            business_name: data.businessName,
            business_type: data.businessType,
            industry: data.industry,
            description: data.description || null,
            website: data.website || null,
            socials: data.socials,
            country: data.country,
            city: data.city,
            postcode: data.postcode || null,
            operating_time: data.operatingTime || null,
            goals: data.goals,
            campaign_type: data.campaignType,
            budget: data.budget,
            age_min: data.ageMin,
            age_max: data.ageMax,
            gender: data.gender,
            target_location: data.targetLocation || null,
            referral_code: data.referral || null,
            agreed_to_terms: data.agreeToTerms,
            id_verification_url: idFileUrl,
            status: 'pending_verification'
          }
        ]);

      if (insertError) throw new Error(insertError.message);

      // 4. Success!
      setEmailForResend(data.email);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
      toast.success("Registration submitted! Please check your email to verify your account.");

    } catch (err: any) {
      console.error("Registration error:", err);
      
      // If auth succeeded but something else failed, try to clean up
      if (err.message.includes("Failed to insert")) {
        toast.error("Account created but failed to save business data. Please contact support.");
      } else {
        toast.error(err.message || "Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    switch(step) {
      case 1:
        return watch("fullName") && watch("email") && password?.length >= 6 && passwordsMatch;
      case 2:
        return watch("businessName") && watch("businessType") && watch("industry");
      case 3:
        return watch("goals")?.length > 0 && watch("campaignType") && watch("budget");
      case 4:
        return idFile !== null;
      case 5:
        return agreeToTerms;
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
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
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
            Once you verify your email, our team will review your application and verify your account holder ID within 48 hours.
          </p>

          <div className="mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">What happens next</h3>
            <div className="relative flex flex-col gap-6 text-left">
              {[
                { step: "01", text: "Verify your email address (check your inbox now)", highlight: true },
                { step: "02", text: "Our team reviews your business information and uploaded ID" },
                { step: "03", text: "You receive an approval or feedback email within 48 hours" },
              ].map((item, i) => (
                <div key={i} className={`flex gap-4 items-start ${item.highlight ? 'bg-[#FEDB71]/10 p-3 -mx-3' : ''}`}>
                  <span className={`font-black italic ${item.highlight ? 'text-[#FEDB71]' : 'text-[#389C9A]'}`}>{item.step}</span>
                  <p className="text-sm font-bold uppercase tracking-tight italic">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleResendVerification}
            className="border-2 border-[#1D1D1D] p-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#F8F8F8] transition-all italic w-full mb-4"
          >
            Resend Verification Email
          </button>

          <Link to="/" className="inline-block bg-[#1D1D1D] text-white px-12 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all w-full rounded-none italic text-center">
            Return to Homepage
          </Link>
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
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Register Your Business
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Connect your brand with live creators. Complete your registration below and our team will review your application within 48 hours.
        </p>
        <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All business accounts are manually reviewed before going live. You will be notified by email once your application has been assessed.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-[84px] z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4">
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
                {s === 1 ? "Login" : s === 2 ? "Business" : s === 3 ? "Goals" : s === 4 ? "Verify" : "Final"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {(uploadError) && (
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
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Create Your Login</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This is how you will access your LiveLink business dashboard.</p>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register("fullName", { required: true })}
                    placeholder="The name of the person managing this account"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Job Title / Role <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      {...register("jobTitle", { required: true })}
                      placeholder="e.g. Owner, Marketing Manager"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
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
                      {...register("phoneCountryCode")}
                      className="bg-white border border-[#1D1D1D]/10 border-r-0 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                    >
                      <option value="+234">+234</option>
                      <option value="+263">+263</option>
                      <option value="+27">+27</option>
                      <option value="+233">+233</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input 
                        type="tel"
                        {...register("phoneNumber", { required: true })}
                        placeholder="Mobile or office number"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 2 - Business Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About Your Business</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us about the business you will be advertising on LiveLink.</p>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register("businessName", { required: true })}
                    placeholder="Your official trading name"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select {...register("businessType", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option value="">Select Type</option>
                      <option value="Sole Trader">Sole Trader</option>
                      <option value="Limited Company">Limited Company</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <select {...register("industry", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option value="">Select Industry</option>
                      <option value="Food & Drink">Food & Drink</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Technology">Technology</option>
                      <option value="Gaming">Gaming</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Business Description</label>
                  <textarea 
                    {...register("description")}
                    rows={4}
                    placeholder="Tell us what your business does..."
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none resize-none italic"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Business Website</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      {...register("website")}
                      placeholder="e.g. www.yourbusiness.com"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country</label>
                    <select {...register("country", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option value="">Select</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">City</label>
                    <input {...register("city")} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none italic" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Postcode</label>
                    <input {...register("postcode")} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none italic" />
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 3 - Goals */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-16">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Advertising Goals</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Help us understand what you want to achieve.</p>

              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Primary Goals <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Brand Awareness", "Drive Website Traffic", "Promote a Product", 
                      "Promote a Service", "Grow Social Media", "Direct Sales"
                    ].map(goal => (
                      <label key={goal} className="cursor-pointer">
                        <input type="checkbox" {...register("goals")} value={goal} className="peer hidden" />
                        <div className="px-4 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-widest transition-all rounded-none italic">
                          {goal}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Campaign Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { val: "Banner Advertising", sub: "My branded banner appears on creator live streams" },
                      { val: "Promo Code Promotion", sub: "Creators share my discount code" },
                      { val: "Banner + Promo Code", sub: "Maximum exposure combining both options" }
                    ].map(opt => (
                      <label key={opt.val} className="cursor-pointer">
                        <input type="radio" {...register("campaignType", { required: true })} value={opt.val} className="peer hidden" />
                        <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white transition-all rounded-none">
                          <p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p>
                          <p className="text-[9px] font-medium uppercase opacity-40 peer-checked:opacity-60 italic">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Monthly Budget <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      "Under ₦100k", "₦100k to ₦300k", "₦300k to ₦500k", 
                      "₦500k to ₦1000k", "Over ₦1000k", "Not sure yet"
                    ].map(opt => (
                      <label key={opt} className="cursor-pointer">
                        <input type="radio" {...register("budget", { required: true })} value={opt} className="peer hidden" />
                        <div className="p-4 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] transition-all text-center rounded-none italic">
                          <p className="text-[9px] font-black uppercase tracking-widest">{opt}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 4 - Verification */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Account Verification</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Please upload a valid form of government ID for the account holder.</p>
              
              {!idFile ? (
                <div className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] rounded-none group hover:border-[#1D1D1D] cursor-pointer transition-all">
                  <input
                    type="file"
                    id="id-upload"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleIdUpload}
                    className="hidden"
                  />
                  <label htmlFor="id-upload" className="cursor-pointer text-center w-full">
                    <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all rounded-none inline-block mb-4">
                      <Upload className="w-8 h-8 text-[#389C9A] group-hover:text-[#FEDB71]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">Upload Government Issued ID</p>
                      <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest italic">Passport, Driver License, or National ID</p>
                      <p className="text-[8px] font-bold uppercase text-[#389C9A] mt-2">JPG, PNG, or PDF (Max 5MB)</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-[#389C9A] p-8 bg-[#F8F8F8] flex items-center gap-6">
                  {idPreview && idFile.type.startsWith('image/') ? (
                    <img src={idPreview} alt="ID Preview" className="w-20 h-20 object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-[#1D1D1D] flex items-center justify-center text-white font-black">
                      PDF
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase mb-1">{idFile.name}</p>
                    <p className="text-[8px] opacity-40 uppercase">{(idFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={removeIdFile}
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
                    placeholder="If you were referred by another brand"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                  />
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 5 - Review */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Review Registration</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Please confirm your details are correct before submitting.</p>
              
              <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 rounded-none flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Business</span>
                  <span className="text-[10px] font-black uppercase">{watch("businessName") || "Not entered"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Industry</span>
                  <span className="text-[10px] font-black uppercase">{watch("industry") || "Not entered"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Campaign Type</span>
                  <span className="text-[10px] font-black uppercase">{watch("campaignType") || "Not selected"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1D1D1D]/10 pb-4 italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Monthly Budget</span>
                  <span className="text-[10px] font-black uppercase">{watch("budget") || "Not selected"}</span>
                </div>
                <div className="flex justify-between items-center italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Contact</span>
                  <span className="text-[10px] font-black uppercase">{watch("fullName") || "Not entered"}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    {...register("agreeToTerms")}
                    className="hidden"
                  />
                  <div 
                    onClick={() => {
                      const current = agreeToTerms;
                      setValue("agreeToTerms", !current, { shouldValidate: true });
                    }}
                    className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-all rounded-none cursor-pointer ${
                      agreeToTerms ? 'bg-[#389C9A] border-[#389C9A]' : 'border-[#1D1D1D] bg-white'
                    }`}
                  >
                    {agreeToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                    I agree to LiveLink's Terms of Service and Privacy Policy. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </section>
          </motion.div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
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
              disabled={!agreeToTerms || loading}
              onClick={handleSubmit(onSubmit)}
              className={`flex-1 py-4 font-black uppercase tracking-widest text-[10px] transition-all rounded-none italic flex items-center justify-center gap-2 ${
                agreeToTerms && !loading
                  ? 'bg-[#1D1D1D] text-white active:scale-[0.98]' 
                  : 'bg-[#1D1D1D]/30 text-white/50 cursor-not-allowed'
              }`}
            >
              {loading ? "Submitting..." : "Submit Registration"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        {step === 5 && !agreeToTerms && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center">
            You must agree to the terms to submit
          </p>
        )}
      </div>
    </div>
  );
}
