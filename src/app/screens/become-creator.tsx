import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ChevronLeft, ArrowRight, Plus, X, Eye, EyeOff, CheckCircle2,
  Instagram, Youtube, Facebook, MessageSquare, Calendar, Mail, Smartphone
} from "lucide-react";
import { motion } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { supabase } from "../supabaseClient"; // Import your Supabase client

type CreatorFormData = {
  fullName: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  country: string;
  city: string;
  platforms: { type: string; username: string; url: string }[];
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

  const { register, handleSubmit, watch, control } = useForm<CreatorFormData>({
    defaultValues: {
      platforms: [{ type: "Twitch", username: "", url: "" }],
      days: [],
      categories: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "platforms",
  });

  const password = watch("password");
  const dob = watch("dob");

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Weak", color: "text-red-500" };
    if (password.length < 10) return { label: "Fair", color: "text-[#FEDB71]" };
    return { label: "Strong", color: "text-[#389C9A]" };
  };

  const isUnder18 = () => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age < 18;
  };

  const onSubmit = async (data: CreatorFormData) => {
    try {
      // Insert into Supabase
      const { error } = await supabase.from("creators").insert([
        {
          full_name: data.fullName,
          dob: data.dob,
          email: data.email,
          password: data.password, // TODO: hash before production
          phone_number: data.phoneNumber,
          country: data.country,
          city: data.city,
          platforms: data.platforms,
          frequency: data.frequency,
          duration: data.duration,
          days: data.days,
          time_of_day: data.timeOfDay,
          avg_concurrent: data.avgConcurrent,
          avg_peak: data.avgPeak,
          avg_weekly: data.avgWeekly,
          categories: data.categories,
          audience_bio: data.audienceBio,
          referral: data.referral || null,
          status: "Pending",
        },
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Error saving data:", err.message || err);
      alert("Failed to submit application. Please try again.");
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-[#1D1D1D] flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-12 italic">
            Thank you for applying to join LiveLink as a creator. Our team will review your application and get back to you within 48 hours via your email.
          </p>
          <Link to="/" className="inline-block border-2 border-[#1D1D1D] px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all mb-8 italic">
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <AppHeader showBack title="Creator Registration" />
      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        {/* Step Components */}
        {step === 1 && <Step1 register={register} watch={watch} showPassword={showPassword} setShowPassword={setShowPassword} getPasswordStrength={getPasswordStrength} isUnder18={isUnder18} />}
        {step === 2 && <Step2 register={register} fields={fields} append={append} remove={remove} />}
        {step === 3 && <Step3 register={register} watch={watch} />}
        {step === 4 && <Step4 register={register} />}
        {step === 5 && <Step5 watch={watch} />}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
        <div className="flex gap-4">
          {step > 1 && (
            <button onClick={prevStep} className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic">
              Back
            </button>
          )}
          <button onClick={step === 5 ? handleSubmit(onSubmit) : nextStep} className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-none italic">
            <span>{step === 5 ? "Submit Application" : "Continue"}</span>
            <ArrowRight className="w-5 h-5 text-[#FEDB71]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// For brevity, you can reuse your Step1-5 JSX components from your original code
// Just pass props as above: register, watch, fields, append, remove, etc.
