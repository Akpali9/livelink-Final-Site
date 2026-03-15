import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ChevronLeft, ArrowRight, Plus, X, Eye, EyeOff, CheckCircle2, 
  Instagram, Youtube, Facebook, MessageSquare, Info, Calendar, Mail, Smartphone, Upload
} from "lucide-react";
import { motion } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";
import { supabase } from "../lib/supabaseClient"; // your Supabase client

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

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<CreatorFormData>({
    defaultValues: { platforms: [{ type: "Twitch", username: "", url: "" }], days: [], categories: [] },
    mode: "onChange"
  });

  const { fields, append, remove } = useFieldArray({ control, name: "platforms" });

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
      const { error } = await supabase.from("creators").insert([
        {
          full_name: data.fullName,
          dob: data.dob,
          email: data.email,
          password: data.password, // hash in production!
          phone_number: data.phoneNumber,
          country: data.country,
          city: data.city,
          platforms: data.platforms, // JSON
          frequency: data.frequency,
          duration: data.duration,
          days: data.days, // JSON
          time_of_day: data.timeOfDay,
          avg_concurrent: Number(data.avgConcurrent) || 0,
          avg_peak: Number(data.avgPeak) || 0,
          avg_weekly: Number(data.avgWeekly) || 0,
          categories: data.categories, // JSON
          audience_bio: data.audienceBio,
          referral: data.referral || null,
          status: "Pending"
        }
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Error inserting data:", err.message || err);
      alert("Failed to submit application. Check console for details.");
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // === SUBMITTED VIEW ===
  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-[#1D1D1D] flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-12 italic">
            Thank you for applying to join LiveLink as a creator. Our team will review your application and get back to you within 48 hours via email.
          </p>
          <div className="mb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-40 italic">What happens next</h3>
            <div className="flex flex-col gap-8 text-left">
              {[
                { step: "01", text: "Our team reviews your application and uploaded documents" },
                { step: "02", text: "You receive an approval or feedback email within 48 hours" },
                { step: "03", text: "Once approved, you get instant access to your creator dashboard" }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="font-black italic text-[#389C9A]">{item.step}</span>
                  <p className="text-sm font-bold uppercase tracking-tight italic">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-4 italic text-[#1D1D1D]/40">Follow us</p>
          <div className="flex justify-center gap-6 mb-12 text-[#389C9A]">
            <Instagram className="w-6 h-6" />
            <Youtube className="w-6 h-6" />
            <Facebook className="w-6 h-6" />
            <MessageSquare className="w-6 h-6" />
          </div>
          <Link to="/" className="inline-block border-2 border-[#1D1D1D] px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all mb-8 italic">
            Back to Home
          </Link>
          <p className="text-[9px] font-medium opacity-40 uppercase tracking-widest">
            Have a question? Contact us at support@livelink.com
          </p>
        </motion.div>
      </div>
    );
  }

  // === FORM STEPS ===
  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <AppHeader showBack title="Creator Registration" />
      {/* ... keep your header and progress UI exactly as before ... */}

      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        {/* Step Components (1-5) */}
        {/* Keep all your sections as in your original code, step === 1, step === 2, etc. */}
        {/* Only change is the onSubmit handler now submits to Supabase */}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-[#1D1D1D] z-50 max-w-[480px] mx-auto">
        <div className="flex gap-4">
          {step > 1 && (
            <button onClick={prevStep} className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic">Back</button>
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
