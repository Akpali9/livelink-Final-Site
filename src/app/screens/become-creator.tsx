import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router";
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
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

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
  verificationDocument?: FileList;
};

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

  const { register, handleSubmit, watch, control, formState: { errors, isValid }, trigger } = useForm<CreatorFormData>({
    defaultValues: {
      platforms: [{ type: "Twitch", username: "", url: "", followers: "" }],
      days: [],
      categories: []
    },
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "platforms"
  });

  const password = watch("password");
  const dob = watch("dob");
  const email = watch("email");
  const fullName = watch("fullName");
  const country = watch("country");
  const frequency = watch("frequency");
  const platforms = watch("platforms");

  // Auto redirect countdown
  useEffect(() => {
    if (isSubmitted) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login/creator', { 
              state: { 
                message: 'Your creator application has been submitted successfully! Please login to check your status.',
                type: 'success',
                email: email
              },
              replace: true
            });
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isSubmitted, navigate, email]);

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  const isUnder18 = (): boolean => {
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

  const calculateAge = (): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const uploadVerificationDocument = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/verification-${Date.now()}.${fileExt}`;
    const fileSize = file.size / 1024 / 1024; // in MB
    
    if (fileSize > 10) {
      throw new Error("File size must be less than 10MB");
    }
    
    const { error: uploadError, data } = await supabase.storage
      .from('creator-verifications')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('creator-verifications')
      .getPublicUrl(fileName);
      
    return publicUrl;
  };

const validateStep = async (stepNumber: number): Promise<boolean> => {
  switch (stepNumber) {
    case 1:
      return await trigger(['fullName', 'dob', 'email', 'password', 'confirmPassword', 'phoneNumber', 'country', 'city']);
    case 2:
      const platformsValid = await trigger(['platforms']);
      if (!platformsValid) {
        toast.error("Let's add at least one platform to get started", {
          icon: '🎯',
          style: {
            border: '2px solid #1D1D1D',
            padding: '16px',
            color: '#1D1D1D',
            background: '#FEDB71',
            fontWeight: 'bold',
            fontSize: '12px'
          }
        });
      }
      return platformsValid;
    case 3:
      return await trigger(['frequency', 'duration', 'timeOfDay']);
    case 4:
      return true; // Optional fields
    default:
      return true;
  }
};

  const onSubmit = async (data: CreatorFormData) => {
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Validate age
      if (isUnder18()) {
        toast.error("You must be 18 or older to become a creator");
        return;
      }

      // Check if passwords match
      if (data.password !== data.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: 'creator',
            phone: data.phoneNumber,
            country: data.country,
            city: data.city
          },
          emailRedirectTo: `${window.location.origin}/login/creator?verified=true`
        }
      });

      // Handle specific error cases
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          toast.error("An account with this email already exists. Please login instead.", {
            duration: 5000,
            position: 'top-center',
            icon: '❌',
            style: {
              border: '2px solid #1D1D1D',
              padding: '16px',
              color: '#1D1D1D',
              background: '#FEDB71',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '0.1em'
            }
          });
          
          setTimeout(() => {
            navigate('/login/creator', { 
              state: { 
                message: 'Please login with your existing account',
                type: 'info',
                email: data.email
              }
            });
          }, 3000);
          return;
        }
        
        if (signUpError.message.includes('Password should be at least 6 characters')) {
          toast.error("Password must be at least 6 characters long");
          return;
        }
        
        if (signUpError.message.includes('Unable to validate email address')) {
          toast.error("Please enter a valid email address");
          return;
        }
        
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("No user returned from signup");
      }

      // Upload verification document if exists
      let verificationUrl = null;
      if (selectedFile) {
        try {
          verificationUrl = await uploadVerificationDocument(selectedFile, authData.user.id);
        } catch (uploadError: any) {
          console.error("Document upload failed:", uploadError);
          toast.error("Document upload failed. You can upload it later.");
        }
      }

      // Create creator profile
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .insert({
          user_id: authData.user.id,
          full_name: data.fullName,
          email: data.email.toLowerCase().trim(),
          dob: data.dob,
          age: calculateAge(),
          phone_number: data.phoneNumber,
          country: data.country,
          city: data.city,
          platforms: data.platforms,
          streaming_frequency: data.frequency,
          streaming_duration: data.duration,
          streaming_days: data.days || [],
          streaming_time: data.timeOfDay,
          avg_concurrent: data.avgConcurrent ? parseInt(data.avgConcurrent) : null,
          avg_peak: data.avgPeak ? parseInt(data.avgPeak) : null,
          avg_weekly: data.avgWeekly ? parseInt(data.avgWeekly) : null,
          categories: data.categories || [],
          audience_bio: data.audienceBio || '',
          referral_code: data.referral || null,
          verification_document_url: verificationUrl,
          status: 'pending_review',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        
        // Attempt to clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        if (profileError.code === '23505') {
          toast.error("A profile already exists for this user");
        } else {
          toast.error("Failed to create creator profile");
        }
        return;
      }

      // Show success popup
      setIsSubmitted(true);

      // Show success toast
      toast.success("Application submitted successfully!", {
        duration: 4000,
        position: 'top-center',
        icon: '✅',
        style: {
          border: '2px solid #1D1D1D',
          padding: '16px',
          color: '#1D1D1D',
          background: '#389C9A',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '12px'
        }
      });

    } catch (error: any) {
      console.error("Error submitting application:", error);
      
      let errorMessage = "Failed to submit application";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "An account with this information already exists";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          border: '2px solid #1D1D1D',
          padding: '16px',
          color: '#1D1D1D',
          background: '#FFE5E5',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '12px'
        }
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(step);
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (step === 1 && isUnder18()) {
      toast.error("You must be 18 or older to become a creator");
      return;
    }
    
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Success Popup/Page
  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-4 sm:px-8 text-[#1D1D1D]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center max-w-md w-full"
        >
          {/* Success Icon with Animation */}
          <motion.div 
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-[#1D1D1D] rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]"
          >
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-4"
          >
            Application Submitted!
          </motion.h1>

          {/* Thank You Message */}
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#1D1D1D]/60 mb-8 italic text-sm"
          >
            Thank you for applying to join LiveLink as a creator. Our team will review your application and get back to you within 48 hours.
          </motion.p>

          {/* Email Verification Notice */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 p-6 bg-[#FEDB71]/10 border-2 border-[#FEDB71] rounded-none"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-[#389C9A]" />
              <p className="text-sm font-black uppercase tracking-tight italic">
                ✓ Check Your Email
              </p>
            </div>
            <p className="text-[10px] font-medium opacity-60 italic">
              We've sent a verification link to <span className="font-black text-[#389C9A] break-all">{email}</span>. 
              Please verify your email address before logging in.
            </p>
          </motion.div>

          {/* What Happens Next */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-40 italic">
              What happens next
            </h3>
            <div className="relative flex flex-col gap-6 text-left">
              {[
                { step: "01", text: "Verify your email address (check your inbox)" },
                { step: "02", text: "Our team reviews your application and documents" },
                { step: "03", text: "You receive an approval email within 48 hours" },
                { step: "04", text: "Once approved, access your creator dashboard" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + (i * 0.1) }}
                  className="flex gap-4 items-start"
                >
                  <span className="font-black italic text-[#389C9A] text-sm">{item.step}</span>
                  <p className="text-xs font-bold uppercase tracking-tight italic">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 italic text-[#1D1D1D]/40">
              While you wait, follow us
            </p>
            <div className="flex justify-center gap-6 mb-8 text-[#389C9A]">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                <Youtube className="w-6 h-6" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </a>
            </div>
          </motion.div>

          {/* Redirect Timer with Progress Bar */}
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

          {/* Manual Redirect Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <button
              onClick={() => navigate('/login/creator', { 
                state: { 
                  message: 'Your creator application has been submitted successfully! Please login to check your status.',
                  type: 'success',
                  email: email
                },
                replace: true
              })}
              className="inline-flex items-center gap-2 border-2 border-[#1D1D1D] px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all mb-8 italic"
            >
              Go to Login Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Support Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-[9px] font-medium opacity-40 uppercase tracking-widest"
          >
            Have a question? Contact us at{' '}
            <a 
              href="mailto:support@livelink.com" 
              className="text-[#389C9A] underline hover:text-[#1D1D1D] transition-colors"
            >
              support@livelink.com
            </a>
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-opacity italic"
        >
          <ChevronLeft className="w-4 h-4 text-[#1D1D1D]" /> Back
        </button>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic leading-tight mb-2">
          Become a Creator on LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium mb-6 italic">
          Join hundreds of live creators already earning through their streams. Fill in your details below and our team will review your application within 48 hours.
        </p>
        <div className="bg-[#FEDB71]/10 border-2 border-[#FEDB71] p-4 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-[#389C9A]" />
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            All creator accounts are manually reviewed and approved by our team. Incomplete applications will not be reviewed.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 sm:px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-0 z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4 scrollbar-hide">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-none border-2 cursor-pointer ${
                step === s 
                  ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' 
                  : step > s 
                    ? 'bg-[#389C9A] text-white border-[#389C9A]' 
                    : 'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'
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
                {s === 1 ? "Personal" : s === 2 ? "Presence" : s === 3 ? "Activity" : s === 4 ? "Proof" : "Final"}
              </motion.span>
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="px-4 sm:px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-12"
            >
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About You</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">
                  This information is kept private and is only used for verification purposes.
                </p>
                
                <div className="flex flex-col gap-6">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register("fullName", { 
                        required: "Full name is required",
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters"
                        }
                      })}
                      placeholder="As it appears on your ID"
                      className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic ${
                        errors.fullName ? 'border-red-500' : 'border-[#1D1D1D]/10'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="date"
                        {...register("dob", { 
                          required: "Date of birth is required",
                          validate: {
                            under18: (value) => {
                              const birthDate = new Date(value);
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();
                              const m = today.getMonth() - birthDate.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }
                              return age >= 18 || "You must be 18 or older to become a creator";
                            }
                          }
                        })}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                          errors.dob ? 'border-red-500' : 'border-[#1D1D1D]/10'
                        }`}
                      />
                    </div>
                    {errors.dob && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.dob.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="email"
                        {...register("email", { 
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address"
                          }
                        })}
                        placeholder="This will be your login email"
                        className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic ${
                          errors.email ? 'border-red-500' : 'border-[#1D1D1D]/10'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                        Create Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          {...register("password", { 
                            required: "Password is required", 
                            minLength: {
                              value: 6,
                              message: "Password must be at least 6 characters"
                            },
                            pattern: {
                              value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
                              message: "Password must contain at least one letter and one number"
                            }
                          })}
                          className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                            errors.password ? 'border-red-500' : 'border-[#1D1D1D]/10'
                          }`}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          {showPassword ? 
                            <EyeOff className="w-4 h-4 opacity-30 hover:opacity-100" /> : 
                            <Eye className="w-4 h-4 opacity-30 hover:opacity-100" />
                          }
                        </button>
                      </div>
                      {getPasswordStrength() && (
                        <div className="mt-1">
                          <div className="flex gap-1 h-1 mb-1">
                            {[1, 2, 3, 4].map((i) => (
                              <div 
                                key={i}
                                className={`flex-1 h-full rounded-full transition-all ${
                                  i <= (getPasswordStrength()?.score || 0) 
                                    ? getPasswordStrength()?.color.replace('text', 'bg')
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-[9px] font-black uppercase ${getPasswordStrength()?.color}`}>
                            Strength: {getPasswordStrength()?.label}
                          </p>
                        </div>
                      )}
                      {errors.password && (
                        <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          {...register("confirmPassword", { 
                            required: "Please confirm your password",
                            validate: (value) => value === password || "Passwords do not match"
                          })}
                          className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                            errors.confirmPassword ? 'border-red-500' : 'border-[#1D1D1D]/10'
                          }`}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          {showConfirmPassword ? 
                            <EyeOff className="w-4 h-4 opacity-30 hover:opacity-100" /> : 
                            <Eye className="w-4 h-4 opacity-30 hover:opacity-100" />
                          }
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex">
                      <select className="bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none border-r-0 rounded-none">
                        <option value="+44">+44</option>
                        <option value="+1">+1</option>
                        <option value="+33">+33</option>
                        <option value="+49">+49</option>
                        <option value="+61">+61</option>
                      </select>
                      <div className="relative flex-1">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                        <input 
                          type="tel"
                          {...register("phoneNumber", { 
                            required: "Phone number is required",
                            pattern: {
                              value: /^[0-9]{10,15}$/,
                              message: "Invalid phone number"
                            }
                          })}
                          placeholder="Phone number"
                          className={`w-full bg-[#F8F8F8] border p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none ${
                            errors.phoneNumber ? 'border-red-500' : 'border-[#1D1D1D]/10'
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-[9px] font-medium opacity-40 mt-1 italic">
                      Used for account security and important notifications only.
                    </p>
                    {errors.phoneNumber && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.phoneNumber.message}
                      </p>
                    )}
                  </div>

                  {/* Country and City */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <select 
                        {...register("country", { required: "Country is required" })}
                        className={`w-full bg-white border p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none ${
                          errors.country ? 'border-red-500' : 'border-[#1D1D1D]/10'
                        }`}
                      >
                        <option value="">Select Country</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="France">France</option>
                        <option value="Germany">Germany</option>
                        <option value="Australia">Australia</option>
                      </select>
                      {errors.country && (
                        <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                          {errors.country.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input 
                        {...register("city", { required: "City is required" })}
                        className={`w-full bg-[#F8F8F8] border p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic ${
                          errors.city ? 'border-red-500' : 'border-[#1D1D1D]/10'
                        }`}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                          {errors.city.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

       {/* Step 2: Streaming Presence */}
{step === 2 && (
  <motion.div 
    key="step2"
    initial={{ opacity: 0, x: 20 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col gap-12"
  >
    <section>
      <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Streaming Presence</h2>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">
        Tell us where you go live. We'd love to see at least one platform to get started.
      </p>

      <div className="flex flex-col gap-8">
        {fields.map((field, index) => (
          <motion.div 
            key={field.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            className="relative p-8 border-2 border-[#1D1D1D] bg-white rounded-none"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#389C9A]">
                Platform {index + 1}
              </span>
              {fields.length > 1 && (
                <button 
                  type="button"
                  onClick={() => remove(index)} 
                  className="p-2 hover:bg-red-50 text-red-500 transition-colors rounded-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                  Which platform do you use? <span className="text-[#389C9A]">(required)</span>
                </label>
                <select 
                  {...register(`platforms.${index}.type` as const)}
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                >
                  <option value="Twitch">Twitch</option>
                  <option value="YouTube">YouTube</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Kick">Kick</option>
                  <option value="Rumble">Rumble</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                  What's your username or channel name? <span className="text-[#389C9A]">(required)</span>
                </label>
                <input 
                  {...register(`platforms.${index}.username` as const, { 
                    required: "We'd love to know your username" 
                  })}
                  placeholder="e.g. @creatorname"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                  Share your profile link <span className="text-[#389C9A]">(required)</span>
                </label>
                <input 
                  {...register(`platforms.${index}.url` as const, { 
                    required: "A link helps us verify your presence",
                    pattern: {
                      value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                      message: "Please enter a valid URL"
                    }
                  })}
                  placeholder="Paste a direct link to your profile or channel"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                  How many followers do you have? <span className="text-[#1D1D1D]/40">(optional)</span>
                </label>
                <input 
                  {...register(`platforms.${index}.followers` as const)}
                  placeholder="e.g. 10,000"
                  type="number"
                  className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                />
                <p className="text-[8px] font-medium opacity-40 mt-1 italic">
                  This helps us understand your reach better
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {fields.length < 5 && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => append({ type: "Twitch", username: "", url: "", followers: "" })}
            className="w-full border-2 border-dashed border-[#1D1D1D]/20 p-8 flex flex-col items-center gap-2 hover:border-[#1D1D1D] transition-all text-[#1D1D1D]/40 hover:text-[#1D1D1D] rounded-none group"
          >
            <Plus className="w-6 h-6 text-[#389C9A] group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">
              Add Another Platform
            </span>
            <span className="text-[8px] font-medium opacity-40 italic">
              The more platforms you add, the better we can match you with campaigns
            </span>
          </motion.button>
        )}
        
        {fields.length === 1 && (
          <p className="text-[10px] text-[#389C9A] font-medium italic text-center mt-2">
            ✨ You can always add more platforms later
          </p>
        )}
      </div>
    </section>
  </motion.div>
)}

          {/* Step 3: Streaming Habits */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-16"
            >
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Your Live Streaming Habits</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">
                  Be as accurate as possible. This information determines which campaigns you are matched with and what you earn.
                </p>

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
                        { val: "A few times a month", sub: "I go live 2 to 3 times per month" },
                        { val: "Monthly or less", sub: "I go live once a month or occasionally" }
                      ].map(opt => (
                        <label key={opt.val} className="relative group cursor-pointer">
                          <input 
                            type="radio" 
                            {...register("frequency", { required: "Please select frequency" })} 
                            value={opt.val} 
                            className="peer hidden" 
                          />
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all rounded-none">
                            <p className="text-[11px] font-black uppercase tracking-widest mb-1 italic">{opt.val}</p>
                            <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 peer-checked:opacity-60 italic">{opt.sub}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.frequency && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.frequency.message}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">
                      How long are your live streams on average? <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "Under 30 minutes",
                        "30 to 45 minutes",
                        "45 minutes to 1 hour",
                        "1 to 2 hours",
                        "Over 2 hours"
                      ].map(opt => (
                        <label key={opt} className="relative cursor-pointer">
                          <input 
                            type="radio" 
                            {...register("duration", { required: "Please select duration" })} 
                            value={opt} 
                            className="peer hidden" 
                          />
                          <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all text-center rounded-none italic">
                            <p className="text-[10px] font-black uppercase tracking-widest">{opt}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.duration && (
                      <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                        {errors.duration.message}
                      </p>
                    )}
                    <div className="bg-[#FEDB71]/10 border-2 border-[#FEDB71] p-4 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D] text-center italic">
                      Note: only streams of 45 minutes or longer qualify for banner campaign billing.
                    </div>
                  </div>

                  {/* Days and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="flex flex-col gap-6">
                      <label className="text-[10px] font-black uppercase tracking-widest italic">
                        Days you go live
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                          <label key={day} className="cursor-pointer">
                            <input 
                              type="checkbox" 
                              {...register("days")} 
                              value={day} 
                              className="peer hidden" 
                            />
                            <div className="w-12 h-12 flex items-center justify-center border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[10px] font-black transition-all rounded-none italic">
                              {day[0]}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-6">
                      <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                        Typical Time <span className="text-red-500">*</span>
                      </label>
                      <select 
                        {...register("timeOfDay", { required: "Please select typical time" })}
                        className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic"
                      >
                        <option value="">Select time</option>
                        <option value="morning">Morning (6am–12pm)</option>
                        <option value="afternoon">Afternoon (12pm–5pm)</option>
                        <option value="evening">Evening (5pm–9pm)</option>
                        <option value="night">Late Night (9pm–12am)</option>
                        <option value="varies">Varies</option>
                      </select>
                      {errors.timeOfDay && (
                        <p className="text-red-500 text-[9px] font-black uppercase mt-1">
                          {errors.timeOfDay.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Viewership Numbers */}
                  <div className="flex flex-col gap-8">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">
                      Average Viewership
                    </label>
                    <div className="flex flex-col gap-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">
                            1
                          </span>
                          <input 
                            type="number"
                            {...register("avgConcurrent")}
                            placeholder="e.g. 250"
                            min="0"
                            className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                          />
                        </div>
                        <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">
                          Average concurrent viewers per stream
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">
                            2
                          </span>
                          <input 
                            type="number"
                            {...register("avgPeak")}
                            placeholder="e.g. 500"
                            min="0"
                            className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                          />
                        </div>
                        <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">
                          Average peak viewers per stream
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">
                            3
                          </span>
                          <input 
                            type="number"
                            {...register("avgWeekly")}
                            placeholder="e.g. 1,200"
                            min="0"
                            className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                          />
                        </div>
                        <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">
                          Average weekly total viewers
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content Categories */}
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">
                      What content do you create?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Gaming", "Beauty & Makeup", "Fashion", "Fitness & Health", 
                        "Food & Cooking", "Music", "Comedy", "Education", 
                        "Business & Finance", "Lifestyle", "Sports", "Tech", 
                        "Travel", "Other"
                      ].map(cat => (
                        <label key={cat} className="cursor-pointer">
                          <input 
                            type="checkbox" 
                            {...register("categories")} 
                            value={cat} 
                            className="peer hidden" 
                          />
                          <div className="px-4 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-widest transition-all rounded-none italic">
                            {cat}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Audience Bio */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">
                      Describe your audience
                    </label>
                    <textarea 
                      {...register("audienceBio")}
                      rows={4}
                      placeholder="Who watches you? age, interests, location..."
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-medium outline-none focus:border-[#1D1D1D] resize-none transition-all rounded-none italic"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Step 4: Verification Upload */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-12"
            >
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Upload Verification</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">
                  Proof of your streaming analytics from the last 30 days.
                </p>
                
                <div className="relative">
                  <input
                    type="file"
                    id="verification"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="verification"
                    className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] rounded-none group hover:border-[#1D1D1D] transition-all cursor-pointer"
                  >
                    <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all rounded-none">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      {selectedFile ? (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic text-[#389C9A]">
                            {selectedFile.name}
                          </p>
                          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">
                            Click to Upload Screenshot
                          </p>
                          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">
                            JPG, PNG OR PDF · MAX 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="w-full h-2 bg-[#1D1D1D]/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-[#389C9A]"
                        />
                      </div>
                      <p className="text-[9px] font-black uppercase mt-2 text-center">
                        Uploading: {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6 pt-12 border-t-2 border-[#1D1D1D]/10">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">
                      Referral Code (Optional)
                    </label>
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

          {/* Step 5: Final Review */}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-12"
            >
              <section>
                 <div className="mt-8 flex flex-col gap-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" required className="peer hidden" />
                    <div className="mt-1 w-5 h-5 border-2 border-[#1D1D1D] flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all rounded-none">
                      <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                      I agree to LiveLink's Terms of Service and Privacy Policy. I confirm that all information provided is accurate and my own.
                    </span>
                  </label>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2 mt-12">Final Review</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">
                  Please confirm your details are correct before submitting.
                </p>
                
                <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-8 rounded-none flex flex-col gap-6">
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
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Main Platform</span>
                    <span className="text-[10px] font-black uppercase">{platforms?.[0]?.type || "Not entered"}</span>
                  </div>
                  <div className="flex justify-between items-center italic">
                    <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Stream Frequency</span>
                    <span className="text-[10px] font-black uppercase">{frequency || "Not entered"}</span>
                  </div>
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
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={prevStep}
              disabled={isLoading}
              className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </motion.button>
          )}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={step === 5 ? handleSubmit(onSubmit) : nextStep}
            disabled={isLoading}
            className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white p-5 sm:p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-none italic disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Processing..."}
                </span>
              ) : (
                step === 5 ? "Submit Application" : "Continue"
              )}
            </span>
            {!isLoading && <ArrowRight className="w-5 h-5 text-[#FEDB71]" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Admin Application Queue Component
export function AdminApplicationQueue() {
  const [apps, setApps] = useState([
    { id: 1, name: "Jordan Plays", platform: "Twitch", viewers: "450", status: "pending", submitted: "2024-01-15" },
    { id: 2, name: "Sarah Stream", platform: "TikTok", viewers: "1.2k", status: "pending", submitted: "2024-01-16" },
    { id: 3, name: "Mike Talks", platform: "YouTube", viewers: "2.5k", status: "pending", submitted: "2024-01-16" }
  ]);

  const [filter, setFilter] = useState("all");

  const filteredApps = apps.filter(app => 
    filter === "all" ? true : app.status === filter
  );

  const handleApprove = (id: number) => {
    setApps(prev => prev.map(app => 
      app.id === id ? { ...app, status: "approved" } : app
    ));
    toast.success("Application approved successfully!");
  };

  const handleReject = (id: number) => {
    setApps(prev => prev.map(app => 
      app.id === id ? { ...app, status: "rejected" } : app
    ));
    toast.success("Application rejected");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <AppHeader title="Admin Review" />
      <main className="p-4 sm:p-8 max-w-[600px] mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic">
            Pending Applications
          </h1>
          <span className="bg-[#FEDB71] px-3 py-1 text-sm font-black">
            {apps.filter(a => a.status === 'pending').length}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {["all", "pending", "approved", "rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest italic border-2 transition-all ${
                filter === f 
                  ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' 
                  : 'border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
              }`}
            >
              {f} {f === 'all' ? `(${apps.length})` : `(${apps.filter(a => a.status === f).length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#1D1D1D]/20">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                No applications found
              </p>
            </div>
          ) : (
            filteredApps.map(app => (
              <motion.div 
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex flex-col gap-4 rounded-none"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg italic">{app.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#389C9A]">
                      {app.platform} · {app.viewers} Avg Viewers
                    </p>
                    <p className="text-[8px] font-medium opacity-40 mt-1">
                      Submitted: {new Date(app.submitted).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-[8px] font-black uppercase border ${
                    app.status === 'pending' ? 'bg-[#FEDB71] text-[#1D1D1D]' :
                    app.status === 'approved' ? 'bg-[#389C9A] text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    {app.status}
                  </span>
                </div>
                
                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(app.id)}
                      className="flex-1 bg-[#1D1D1D] text-white p-3 text-[10px] font-black uppercase tracking-widest italic border-2 border-[#1D1D1D] hover:bg-[#389C9A] hover:border-[#389C9A] transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(app.id)}
                      className="flex-1 border-2 border-[#1D1D1D] text-[#1D1D1D] p-3 text-[10px] font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
