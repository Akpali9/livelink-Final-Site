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
  Instagram, 
  Youtube, 
  Facebook, 
  MessageSquare,
  ArrowRight,
  Info,
  Calendar,
  Lock,
  Mail,
  Smartphone,
  Globe,
  Briefcase,
  Target,
  Image as LucideImageIcon,
  Twitter,
  Linkedin,
  AlertCircle,
  LogIn
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
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  
  
  const { submitRegistration, loading, error } = useBusinessRegistration();
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // not logged in — show the form normally
 
      const userType = user.user_metadata?.user_type || user.user_metadata?.role;
 
      if (userType === "business") {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
 
        if (business) {
          // Profile already complete — go to dashboard
          navigate("/business/dashboard", { replace: true });
          return;
        }
        // No profile yet — let them complete registration (stay on form)
        return;
      }
 
      // Any other logged-in user type gets redirected away
      if (userType === "creator") navigate("/dashboard", { replace: true });
      else if (userType === "admin") navigate("/admin", { replace: true });
    };
 
    checkAuth();
  }, [navigate]);
  
  const { register, handleSubmit, watch, control, formState: { errors, isValid } } = useForm<BusinessFormData>({
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
    if (password.length < 6) return { label: "Weak", color: "text-red-500" };
    if (password.length < 10) return { label: "Fair", color: "text-[#FEDB71]" };
    return { label: "Strong", color: "text-[#389C9A]" };
  };

  const passwordsMatch = password === confirmPassword;

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, or PDF file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size must be less than 5MB');
        return;
      }
      
      setIdFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIdPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, show a PDF icon
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
    setRegisteredEmail(data.email);
  const result = await submitRegistration(data, idFile);
  
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      setUploadError('Please enter a valid email address');
      return;
    }

    // Validate password match
    if (data.password !== data.confirmPassword) {
      setUploadError('Passwords do not match');
      return;
    }

    // Validate password length
    if (data.password.length < 6) {
      setUploadError('Password must be at least 6 characters');
      return;
    }

    setRegisteredEmail(data.email);
    const result = await submitRegistration(data, idFile);
    
    if (result.success) {
      setIsSubmitted(true);
      window.scrollTo(0, 0);
      toast.success("Registration submitted successfully!");
      
      // Try to auto-login the user
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (!signInError) {
          // Redirect to business dashboard (they'll see the pending banner)
          setTimeout(() => {
            navigate("/business/dashboard", { replace: true });
          }, 2000);
        } else {
          // If auto-login fails, redirect to login portal
          setTimeout(() => {
            navigate("/login/portal", { replace: true });
          }, 3000);
        }
      } catch (error) {
        // If auto-login fails, redirect to login portal
        setTimeout(() => {
          navigate("/login/portal", { replace: true });
        }, 3000);
      }
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

  const goToLogin = () => {
     navigate("/login/portal", { replace: true });
  };

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
                <span className="text-xs">Our team reviews your business information and ID (usually within 48 hours)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">2.</span>
                <span className="text-xs">You'll receive an email at <span className="font-bold">{registeredEmail}</span> once approved</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-[#389C9A] font-black">3.</span>
                <span className="text-xs">You're being automatically redirected to your dashboard where you can track your application status</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-full bg-[#1D1D1D] text-white px-8 py-5 text-[10px] font-black uppercase tracking-widest rounded-none italic flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4 animate-pulse" />
              Redirecting to dashboard...
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
          Connect your brand with live creators and reach real audiences in real time. Complete your registration below and our team will review your application within 48 hours.
        </p>
        <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All business accounts are manually reviewed and approved by our team before going live. You will be notified by email once your application has been assessed.
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
                {s === 1 ? "Login" : s === 2 ? "Business" : s === 3 ? "Goals" : s === 4 ? "Verify" : "Final"}
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
                      placeholder="e.g. Owner, Marketing Manager, Brand Director"
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
                      <option value="+44">+44</option>
                      <option value="+1">+1</option>
                      <option value="+33">+33</option>
                      <option value="+49">+49</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="tel"
                        {...register("phoneNumber", { required: true })}
                        placeholder="Mobile or office number"
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] font-medium opacity-40 mt-1 italic">Used for account security and important notifications only.</p>
                </div>
              </div>
            </section>
          </motion.div>
        )}

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
                    placeholder="Tell us what your business does, what you sell, and who your typical customer is."
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none resize-none italic"
                  />
                  <p className="text-right text-[8px] font-bold opacity-30 italic">MAX 200 WORDS</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Business Website</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                    <input 
                      {...register("website")}
                      placeholder="e.g. www.yourbusiness.com"
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                    />
                  </div>
                  <p className="text-[9px] font-medium opacity-40 mt-1 italic">If you don't have a website, leave this blank.</p>
                </div>

                {/* Socials */}
                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Social Media Handles</label>
                  <div className="flex flex-col gap-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <select 
                          {...register(`socials.${index}.platform` as const)}
                          className="bg-white border-2 border-[#1D1D1D]/10 p-5 text-[10px] font-black uppercase tracking-tight outline-none rounded-none italic"
                        >
                          <option>Instagram</option>
                          <option>TikTok</option>
                          <option>Facebook</option>
                          <option>Twitter/X</option>
                        </select>
                        <input 
                          {...register(`socials.${index}.handle` as const)}
                          placeholder="@yourbusiness"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none italic"
                        />
                        {fields.length > 1 && (
                          <button onClick={() => remove(index)} className="p-5 bg-red-50 text-red-500 border border-red-200">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {fields.length < 4 && (
                      <button 
                        onClick={() => append({ platform: "Instagram", handle: "" })}
                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all italic text-[#389C9A]"
                      >
                        <Plus className="w-3 h-3" /> Add Another Handle
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t-2 border-[#1D1D1D]/10">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country</label>
                    <select {...register("country", { required: true })} className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic">
                      <option value="">Select Country</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="France">France</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">City</label>
                    <input {...register("city")} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none italic" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Postcode / ZIP</label>
                    <input {...register("postcode")} className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none focus:border-[#1D1D1D] rounded-none italic" />
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-16">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Advertising Goals</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Help us understand what you want to achieve so we can match you with the right creators.</p>

              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Primary Advertising Goals <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Brand Awareness", "Drive Website Traffic", "Promote a Product", "Promote a Service", "Grow Social Media", "Drive Footfall", "Launch Product", "Promote Event", "Direct Sales", "Other"
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
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                    Campaign Type Interests <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { val: "Banner Advertising", icon: "📺", sub: "My branded banner appears on creator live streams" },
                      { val: "Promo Code Promotion", icon: "🎟️", sub: "Creators share my discount code with their audience" },
                      { val: "Banner + Promo Code", icon: "⭐", sub: "Maximum exposure combining both options. Recommended" }
                    ].map(opt => (
                      <label key={opt.val} className="cursor-pointer">
                        <input type="radio" {...register("campaignType", { required: true })} value={opt.val} className="peer hidden" />
                        <div className="p-8 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white transition-all flex items-center gap-6 rounded-none">
                          <span className="text-3xl">{opt.icon}</span>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p>
                            <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 peer-checked:opacity-60 italic">{opt.sub}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">
                    Estimated Monthly Budget <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      "Under ₦100k", "₦100k to ₦300k", "₦300k to ₦500k", "₦500k to ₦1000k", "Over ₦1000k", "Not sure yet"
                    ].map(opt => (
                      <label key={opt} className="cursor-pointer">
                        <input type="radio" {...register("budget", { required: true })} value={opt} className="peer hidden" />
                        <div className="p-5 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] transition-all text-center rounded-none italic">
                          <p className="text-[10px] font-black uppercase tracking-widest">{opt}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-8 bg-white border-2 border-[#1D1D1D] p-8 rounded-none">
                  <label className="text-[10px] font-black uppercase tracking-widest underline decoration-[#389C9A] decoration-2 underline-offset-4 italic">Target Audience</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-black uppercase tracking-widest italic opacity-40">Age Range</label>
                      <div className="flex items-center gap-4">
                        <input type="number" {...register("ageMin")} placeholder="18" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-3 text-xs font-bold rounded-none" />
                        <span className="font-black italic">TO</span>
                        <input type="number" {...register("ageMax")} placeholder="65" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-3 text-xs font-bold rounded-none" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-black uppercase tracking-widest italic opacity-40">Gender</label>
                      <div className="flex gap-2">
                        {["M", "F", "All"].map(g => (
                          <label key={g} className="flex-1 cursor-pointer">
                            <input type="checkbox" {...register("gender")} value={g} className="peer hidden" />
                            <div className="p-3 border border-[#1D1D1D]/10 bg-[#F8F8F8] peer-checked:bg-[#1D1D1D] peer-checked:text-white transition-all text-center text-[10px] font-black rounded-none">{g}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-black uppercase tracking-widest italic opacity-40">Location</label>
                      <input {...register("targetLocation")} placeholder="e.g. UK, Nationwide" className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-3 text-xs font-bold rounded-none italic" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

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

        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
                 <div className="mt-8 flex flex-col gap-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    {...register("agreeToTerms")}
                    className="peer hidden" 
                  />
                  <div className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-all rounded-none ${
                    agreeToTerms ? 'bg-[#389C9A] border-[#389C9A]' : 'border-[#1D1D1D] bg-white'
                  }`}>
                    {agreeToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                    I agree to LiveLink's Terms of Service and Privacy Policy. I confirm that I am authorized to advertise on behalf of this business. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2 mt-12">Review Registration</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Please confirm your details are correct before submitting for review.</p>
              
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
              disabled={loading}
              className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button 
            onClick={step === 5 ? handleSubmit(onSubmit) : nextStep}
            disabled={!validateStep() || loading}
            className={`flex-1 flex items-center justify-between p-6 font-black uppercase tracking-tight transition-all rounded-none italic ${
              validateStep() && !loading
                ? 'bg-[#1D1D1D] text-white active:scale-[0.98]' 
                : 'bg-[#1D1D1D]/30 text-white/50 cursor-not-allowed'
            }`}
          >
            <span>
              {loading ? 'Submitting...' : (step === 5 ? 'Submit Registration' : 'Continue')}
            </span>
            {!loading && step < 5 && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
          </button>
        </div>
        
        {/* Step validation message */}
        {!validateStep() && step < 5 && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center">
            Please fill in all required fields before continuing
          </p>
        )}
        {step === 4 && !idFile && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center">
            Please upload your ID document to continue
          </p>
        )}
        {step === 5 && !agreeToTerms && (
          <p className="text-[9px] font-black uppercase text-red-500 mt-3 text-center">
            You must agree to the terms to submit
          </p>
        )}
      </div>
    </div>
  );
}
