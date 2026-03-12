import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { 
  ChevronLeft, 
  ChevronRight, 
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
  Monitor,
  Video as VideoIcon,
  ExternalLink,
  Lock,
  Mail,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { AppHeader } from "../components/app-header";

type CreatorFormData = {
  // Step 1
  fullName: string;
  dob: string;
  email: string;
  password: "";
  confirmPassword: "";
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
  // Step 4
  referral: string;
};

export function BecomeCreator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors, isValid } } = useForm<CreatorFormData>({
    defaultValues: {
      platforms: [{ type: "Twitch", username: "", url: "" }],
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
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
    setIsSubmitted(true);
    window.scrollTo(0, 0);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-8 text-[#1D1D1D]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none flex items-center justify-center mx-auto mb-8 border-2 border-[#FEDB71]">
            <CheckCircle2 className="w-12 h-12 text-[#389C9A]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Application Submitted!</h1>
          <p className="text-[#1D1D1D]/60 mb-12 italic">
            Thank you for applying to join LiveLink as a creator. Our team will review your application and get back to you within 48 hours via the email address you provided.
          </p>

          <div className="mb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-40 italic">What happens next</h3>
            <div className="relative flex flex-col gap-8 text-left">
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

          <p className="text-[10px] font-black uppercase tracking-widest mb-4 italic text-[#1D1D1D]/40">While you wait, follow us</p>
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

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 text-[#1D1D1D]">
      <AppHeader showBack title="Creator Registration" />
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
            All creator accounts are manually reviewed and approved by our team. Incomplete applications will not be reviewed.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-8 py-6 bg-[#F8F8F8] border-b border-[#1D1D1D]/10 sticky top-[84px] z-30 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4 scrollbar-hide">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all rounded-none border-2 ${step === s ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]' : 'bg-white text-[#1D1D1D]/30 border-[#1D1D1D]/10'}`}>
              {s}
            </div>
            {step === s && (
              <span className="text-[10px] font-black uppercase tracking-widest italic">
                {s === 1 ? "Personal" : s === 2 ? "Presence" : s === 3 ? "Activity" : s === 4 ? "Proof" : "Final"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="px-8 mt-12 max-w-[600px] mx-auto w-full flex-1">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">About You</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">This information is kept private and is only used for verification purposes.</p>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Full Legal Name</label>
                  <input 
                    {...register("fullName", { required: true })}
                    placeholder="As it appears on your ID"
                    className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none italic"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Date of Birth</label>
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
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Email Address</label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Create Password</label>
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
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Confirm Password</label>
                    <input 
                      type="password"
                      {...register("confirmPassword", { required: true })}
                      className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Phone Number</label>
                  <div className="relative flex">
                    <select className="bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none border-r-0 rounded-none">
                      <option>+44</option>
                      <option>+1</option>
                      <option>+33</option>
                      <option>+49</option>
                    </select>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-[#389C9A]" />
                      <input 
                        type="tel"
                        {...register("phoneNumber", { required: true })}
                        className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 pl-12 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] transition-all rounded-none"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] font-medium opacity-40 mt-1 italic">Used for account security and important notifications only.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Country</label>
                    <select 
                      {...register("country", { required: true })}
                      className="w-full bg-white border border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none"
                    >
                      <option value="">Select Country</option>
                      <option>United Kingdom</option>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>France</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">City</label>
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
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Platform</label>
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
                          <option>Other</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Username / Channel Name</label>
                        <input 
                          {...register(`platforms.${index}.username` as const, { required: true })}
                          placeholder="e.g. @creatorname"
                          className="w-full bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase tracking-tight outline-none focus:border-[#1D1D1D] rounded-none italic"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Profile URL</label>
                        <input 
                          {...register(`platforms.${index}.url` as const, { required: true })}
                          placeholder="Paste a direct link to your profile or channel"
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
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-12 italic">Be as accurate as possible. This information determines which campaigns you are matched with and what you earn.</p>

              <div className="flex flex-col gap-12">
                {/* Frequency */}
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">How often do you go live?</label>
                  <div className="flex flex-col gap-3">
                    {[
                      { val: "Daily", sub: "I go live every day" },
                      { val: "Several times a week", sub: "I go live 3 to 5 times per week" },
                      { val: "Weekly", sub: "I go live once a week" },
                      { val: "A few times a month", sub: "I go live 2 to 3 times per month" },
                      { val: "Monthly or less", sub: "I go live once a month or occasionally" }
                    ].map(opt => (
                      <label key={opt.val} className="relative group cursor-pointer">
                        <input type="radio" {...register("frequency")} value={opt.val} className="peer hidden" />
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
                  <label className="text-[10px] font-black uppercase tracking-widest italic">How long are your live streams on average?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Under 30 minutes",
                      "30 to 45 minutes",
                      "45 minutes to 1 hour",
                      "1 to 2 hours",
                      "Over 2 hours"
                    ].map(opt => (
                      <label key={opt} className="relative cursor-pointer">
                        <input type="radio" {...register("duration")} value={opt} className="peer hidden" />
                        <div className="p-6 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#1D1D1D] peer-checked:text-white peer-checked:border-[#1D1D1D] transition-all text-center rounded-none italic">
                          <p className="text-[10px] font-black uppercase tracking-widest">{opt}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="bg-[#FEDB71]/10 border border-[#FEDB71] p-4 text-[9px] font-black uppercase tracking-widest text-[#1D1D1D] text-center italic">
                    Note: only streams of 45 minutes or longer qualify for banner campaign billing.
                  </div>
                </div>

                {/* Days and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic">Days you go live</label>
                    <div className="flex flex-wrap gap-2">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                        <label key={day} className="cursor-pointer">
                          <input type="checkbox" {...register("days")} value={day} className="peer hidden" />
                          <div className="w-12 h-12 flex items-center justify-center border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[10px] font-black transition-all rounded-none italic">
                            {day[0]}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-6">
                    <label className="text-[10px] font-black uppercase tracking-widest italic text-[#1D1D1D]/40">Typical Time</label>
                    <select 
                      {...register("timeOfDay")}
                      className="w-full bg-white border-2 border-[#1D1D1D]/10 p-5 text-xs font-black uppercase tracking-tight outline-none rounded-none italic"
                    >
                      <option>Morning (6am–12pm)</option>
                      <option>Afternoon (12pm–5pm)</option>
                      <option>Evening (5pm–9pm)</option>
                      <option>Late Night (9pm–12am)</option>
                      <option>Varies</option>
                    </select>
                  </div>
                </div>

                {/* Viewership */}
                <div className="flex flex-col gap-8">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">Average Viewership</label>
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">1</span>
                        <input 
                          type="number"
                          {...register("avgConcurrent")}
                          placeholder="e.g. 250"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                        />
                      </div>
                      <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">Average concurrent viewers per stream</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">2</span>
                        <input 
                          type="number"
                          {...register("avgPeak")}
                          placeholder="e.g. 500"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                        />
                      </div>
                      <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">Average peak viewers per stream</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#1D1D1D] text-white text-[10px] font-black italic">3</span>
                        <input 
                          type="number"
                          {...register("avgWeekly")}
                          placeholder="e.g. 1,200"
                          className="flex-1 bg-[#F8F8F8] border border-[#1D1D1D]/10 p-5 text-sm font-bold uppercase outline-none rounded-none italic focus:border-[#1D1D1D] transition-all"
                        />
                      </div>
                      <p className="text-[9px] font-medium opacity-40 ml-12 italic uppercase tracking-widest">Average weekly total viewers</p>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-col gap-6">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">What content do you create?</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Gaming", "Beauty & Makeup", "Fashion", "Fitness & Health", "Food & Cooking", "Music", "Comedy", "Education", "Business & Finance", "Lifestyle", "Sports", "Tech", "Travel", "Other"
                    ].map(cat => (
                      <label key={cat} className="cursor-pointer">
                        <input type="checkbox" {...register("categories")} value={cat} className="peer hidden" />
                        <div className="px-4 py-2 border-2 border-[#1D1D1D]/10 bg-white peer-checked:bg-[#389C9A] peer-checked:text-white peer-checked:border-[#389C9A] text-[9px] font-black uppercase tracking-widest transition-all rounded-none italic">
                          {cat}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest italic">Describe your audience</label>
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

        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Upload Verification</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-8 italic">Proof of your streaming analytics from the last 30 days.</p>
              
              <div className="border-2 border-dashed border-[#1D1D1D]/20 p-12 flex flex-col items-center gap-6 bg-[#F8F8F8] rounded-none group hover:border-[#1D1D1D] transition-all cursor-pointer">
                <div className="p-6 border-2 border-[#1D1D1D] bg-white group-hover:bg-[#1D1D1D] group-hover:text-white transition-all rounded-none">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 italic">Upload Screenshot</p>
                  <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">JPG, PNG OR PDF · MAX 10MB</p>
                </div>
              </div>

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
                <div className="flex justify-between items-center italic">
                  <span className="text-[10px] font-bold uppercase text-[#1D1D1D]/40">Main Platform</span>
                  <span className="text-[10px] font-black uppercase">{watch("platforms.0.type") || "Not entered"}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" required className="peer hidden" />
                  <div className="mt-1 w-5 h-5 border-2 border-[#1D1D1D] flex items-center justify-center bg-white peer-checked:bg-[#389C9A] peer-checked:border-[#389C9A] transition-all rounded-none">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight opacity-60 italic uppercase tracking-tight">
                    I agree to LiveLink's Terms of Service and Privacy Policy. I confirm that all information provided is accurate and my own.
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
              className="px-6 py-5 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all rounded-none italic"
            >
              Back
            </button>
          )}
          <button 
            onClick={step === 5 ? handleSubmit(onSubmit) : nextStep}
            className="flex-1 flex items-center justify-between bg-[#1D1D1D] text-white p-6 font-black uppercase tracking-tight active:scale-[0.98] transition-all rounded-none italic"
          >
            <span>{step === 5 ? "Submit Application" : "Continue"}</span>
            <ArrowRight className="w-5 h-5 text-[#FEDB71]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminApplicationQueue() {
  const [apps, setApps] = useState([
    { id: 1, name: "Jordan Plays", platform: "Twitch", viewers: "450", status: "Pending" },
    { id: 2, name: "Sarah Stream", platform: "TikTok", viewers: "1.2k", status: "Pending" }
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <AppHeader title="Admin Review" />
      <main className="p-8 max-w-[600px] mx-auto w-full">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-8">Pending Applications</h1>
        <div className="flex flex-col gap-4">
          {apps.map(app => (
            <div key={app.id} className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex flex-col gap-4 rounded-none">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black uppercase tracking-tight text-lg italic">{app.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#389C9A]">{app.platform} · {app.viewers} Avg Viewers</p>
                </div>
                <span className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase border border-[#1D1D1D]/10">Pending Review</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-[#1D1D1D] text-white p-3 text-[10px] font-black uppercase tracking-widest italic border-2 border-[#1D1D1D]">Approve</button>
                <button className="flex-1 border-2 border-[#1D1D1D] text-[#1D1D1D] p-3 text-[10px] font-black uppercase tracking-widest italic">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
