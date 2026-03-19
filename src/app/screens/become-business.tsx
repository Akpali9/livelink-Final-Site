import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../lib/supabase";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Eye, 
  EyeOff, 
  Upload, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Calendar,
  Mail,
  Smartphone,
  Globe,
  Briefcase,
  Target,
  AlertCircle,
  LogIn,
  Loader2,
  Building2,
  MapPin,
  User,
  FileText,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { useBusinessRegistration } from "../hooks/useBusinessRegistration";
import { AppHeader } from "../components/app-header";
import { toast } from "sonner";

type BusinessFormData = {
  // Step 1
  fullName: string;
  jobTitle: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  phoneCountryCode: string;
  // Step 2
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
  // Step 3
  goals: string[];
  campaignType: string;
  budget: string;
  ageMin: number;
  ageMax: number;
  gender: string[];
  targetLocation: string;
  // Step 5
  referral: string;
  agreeToTerms: boolean;
};

export function BecomeBusiness() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { submitRegistration, loading, error } = useBusinessRegistration();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userType = user.user_metadata?.user_type || user.user_metadata?.role;

      if (userType === "business") {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (business) {
          navigate("/business/dashboard", { replace: true });
          return;
        }
        return;
      }

      if (userType === "creator") navigate("/dashboard", { replace: true });
      else if (userType === "admin") navigate("/admin", { replace: true });
    };

    checkAuth();
  }, [navigate]);
  
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<BusinessFormData>({
    defaultValues: {
      socials: [{ platform: "Instagram", handle: "" }],
      goals: [],
      gender: [],
      ageMin: 18,
      ageMax: 65,
      phoneCountryCode: "+44",
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

  const onSubmit = async (data: BusinessFormData) => {
    if (!idFile) {
      setUploadError('Please upload a government ID for verification');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      setUploadError('Please enter a valid email address');
      return;
    }

    if (data.password !== data.confirmPassword) {
      setUploadError('Passwords do not match');
      return;
    }

    if (data.password.length < 6) {
      setUploadError('Password must be at least 6 characters');
      return;
    }

    setRegisteredEmail(data.email);
    setIsLoading(true);
    
    const result = await submitRegistration(data, idFile);
    setIsLoading(false);
    
    if (result.success) {
      setIsSubmitted(true);
      window.scrollTo(0, 0);
      toast.success("Registration submitted successfully!");
      
      setTimeout(() => {
        navigate("/confirm-email", { 
          state: { 
            email: data.email,
            role: "business"
          } 
        });
      }, 3000);
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
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const strength = getPasswordStrength();

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-6 text-sm leading-relaxed italic">
            Thank you for registering your business on LiveLink. Your application is being reviewed.
          </p>
          
          <div className="bg-[#F8F8F8] border border-[#1D1D1D]/10 p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40 italic">What happens next:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">1.</span>
                <span className="text-xs">Verify your email address</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">2.</span>
                <span className="text-xs">Our team reviews your business information and ID (usually within 48 hours)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">3.</span>
                <span className="text-xs">You'll receive an email at <span className="font-bold">{registeredEmail}</span> once approved</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest rounded-none italic flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to email confirmation...
            </div>
            
            <Link to="/" className="w-full border-2 border-[#1D1D1D] text-[#1D1D1D] px-8 py-5 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all rounded-none italic text-center">
              Return to Homepage
            </Link>
          </div>
          
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest mt-6">
            Questions? Contact business@livelink.com
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
     
      {/* Header */}
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 italic">
          <ChevronLeft className="w-4 h-4 text-[#1D1D1D]" /> Back
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Register Your Business on LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Connect your brand with live creators and reach real audiences in real time.
        </p>
        <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All business accounts are manually reviewed. You'll be notified by email once approved.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-[84px] z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4 scrollbar-hide">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-none border-2 ${step === s ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' : step > s ? 'bg-[#389C9A] text-white border-[#389C9A]' : 'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'}`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {step === s && (
              <span className="text-[10px] font-black uppercase tracking-widest italic">
                {s === 1 ? "Account" : s === 2 ? "Business" : s === 3 ? "Goals" : s === 4 ? "Verify" : "Final"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {(error || uploadError) && (
        <div className="px-8 mt-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 p-4 flex gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
              {error || uploadError}
            </p>
          </motion.div>
        </div>
      )}

      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        {/* Step 1: Account */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Create Your Account</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This is how you will access your business dashboard.</p>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register("fullName", { required: true })}
                    placeholder="Your full name"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all placeholder:opacity-30 rounded-none italic"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Job Title / Role <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                    <input 
                      {...register("jobTitle", { required: true })}
                      placeholder="e.g. Owner, Marketing Manager"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all placeholder:opacity-30 rounded-none italic"
                    />
                  </div>
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
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all placeholder:opacity-30 rounded-none italic"
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
                    {strength && (
                      <div className="mt-1">
                        <div className="flex gap-1 h-1 mb-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 h-full rounded-full transition-all ${
                                i <= strength.score
                                  ? strength.color.replace("text", "bg")
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[9px] font-black uppercase ${strength.color}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        {...register("confirmPassword", { required: true })}
                        className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                          confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-[#1D1D1D]/10'
                        }`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 opacity-30" /> : <Eye className="w-4 h-4 opacity-30" />}
                      </button>
                    </div>
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
                      <option value="+44">+44</option>
                      <option value="+1">+1</option>
                      <option value="+234">+234</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="tel"
                        {...register("phoneNumber", { required: true })}
                        placeholder="Phone number"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 2: Business Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About Your Business</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Tell us about the business you will be advertising.</p>

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

                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { val: "Sole Trader", sub: "I run my business independently" },
                      { val: "Limited Company", sub: "Registered as a Ltd company" },
                      { val: "Partnership", sub: "Run by two or more people" },
                      { val: "Other / Not Registered", sub: "Informal or early stages" }
                    ].map(type => (
                      <label key={type.val} className="cursor-pointer group">
                        <input type="radio" {...register("businessType", { required: true })} value={type.val} className="peer hidden" />
                        <div className="p-4 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white transition-all rounded-none">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic">{type.val}</p>
                          <p className="text-[8px] font-medium uppercase opacity-40 peer-checked:opacity-60 italic">{type.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Industry / Category <span className="text-red-500">*</span>
                    </label>
                    <select {...register("industry", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option value="">Select Category</option>
                      <option>Food & Drink</option>
                      <option>Health & Fitness</option>
                      <option>Beauty & Cosmetics</option>
                      <option>Fashion & Clothing</option>
                      <option>Technology</option>
                      <option>Gaming</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Operating Since</label>
                    <select {...register("operatingTime")} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option>Less than 6 months</option>
                      <option>6 months to 1 year</option>
                      <option>1 to 3 years</option>
                      <option>3 to 5 years</option>
                      <option>Over 5 years</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Business Description</label>
                  <textarea 
                    {...register("description")}
                    rows={4}
                    placeholder="Tell us what your business does"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none resize-none italic"
                  />
                </div>
