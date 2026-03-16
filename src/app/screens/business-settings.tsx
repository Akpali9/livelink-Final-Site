import React, { useState } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Mail, 
  HelpCircle, 
  FileText, 
  Shield, 
  Info,
  Globe,
  Upload,
  CreditCard,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function BusinessSettings() {
  const navigate = useNavigate();
  
  // Account section state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [email, setEmail] = useState("business@email.com");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber] = useState("+234 801 234 5678");
  const [ownerName, setOwnerName] = useState("John Adebayo");
  const [ownerJobTitle, setOwnerJobTitle] = useState("Marketing Director");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerJobTitle, setNewOwnerJobTitle] = useState("");
  const [currentPasswordOwner, setCurrentPasswordOwner] = useState("");

  // Business Profile section state
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingSocial, setEditingSocial] = useState(false);
  
  const [businessName, setBusinessName] = useState("Acme Marketing Agency");
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [businessLogo] = useState("https://via.placeholder.com/80");
  const [businessDescription, setBusinessDescription] = useState("We are a full-service digital marketing agency specializing in social media campaigns, influencer partnerships, and brand awareness strategies for SMEs across Nigeria.");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [industry, setIndustry] = useState("Marketing & Advertising");
  const [website, setWebsite] = useState("www.acmemarketing.ng");
  const [websiteInput, setWebsiteInput] = useState("");
  const [city, setCity] = useState("Lagos");
  const [country, setCountry] = useState("Nigeria");
  const [cityInput, setCityInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState([
    { id: 1, name: "LinkedIn", handle: "@acmemarketing" },
    { id: 2, name: "Twitter", handle: "@acme_mktg" },
  ]);

  // Payment section state
  const [editingPayment, setEditingPayment] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Campaign Preferences state
  const [editingAgeRange, setEditingAgeRange] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [editingNiches, setEditingNiches] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [targetGenders, setTargetGenders] = useState(["All Genders"]);
  const [preferredNiches, setPreferredNiches] = useState(["Gaming", "Tech Reviews", "Lifestyle"]);
  const [defaultCampaignType, setDefaultCampaignType] = useState("BANNER");

  // Notifications state
  const [notifAccepts, setNotifAccepts] = useState(true);
  const [notifDeclines, setNotifDeclines] = useState(true);
  const [notifPayouts, setNotifPayouts] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const industryOptions = [
    "Marketing & Advertising",
    "E-commerce & Retail",
    "Technology & Software",
    "Food & Beverage",
    "Fashion & Beauty",
    "Health & Wellness",
    "Education & Training",
    "Finance & Banking",
    "Entertainment & Media",
    "Travel & Hospitality",
    "Real Estate",
    "Automotive",
    "Sports & Fitness",
    "Other"
  ];

  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

  const genderOptions = ["Male", "Female", "Non-binary", "All Genders"];

  const verificationStatus = "VERIFIED"; // "VERIFIED" | "PENDING" | "ACTION REQUIRED"

  const truncateDescription = (text: string, lines: number = 2) => {
    const words = text.split(" ");
    if (words.length <= 15) return text;
    return descriptionExpanded ? text : words.slice(0, 15).join(" ") + "...";
  };

  const handleUpdateEmail = () => {
    setEmail(newEmail);
    setEditingEmail(false);
    setNewEmail("");
    setConfirmEmail("");
    setCurrentPasswordEmail("");
  };

  const handleUpdatePassword = () => {
    setEditingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleUpdateOwner = () => {
    setOwnerName(newOwnerName);
    setOwnerJobTitle(newOwnerJobTitle);
    setEditingOwner(false);
    setNewOwnerName("");
    setNewOwnerJobTitle("");
    setCurrentPasswordOwner("");
  };

  const handleSaveBusinessName = () => {
    setBusinessName(businessNameInput);
    setEditingBusinessName(false);
  };

  const handleSaveDescription = () => {
    setBusinessDescription(descriptionInput);
    setEditingDescription(false);
  };

  const handleSaveWebsite = () => {
    setWebsite(websiteInput);
    setEditingWebsite(false);
  };

  const handleSaveLocation = () => {
    setCity(cityInput);
    setCountry(countryInput);
    setEditingLocation(false);
  };

  const handleRemovePlatform = (id: number) => {
    setSocialPlatforms(socialPlatforms.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto">
      {/* TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center justify-center relative">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute left-0 p-1"
          >
            <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
          </button>
          <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            SETTINGS
          </h1>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="mt-14 px-4 py-6 space-y-8">
        
        {/* SECTION 1: ACCOUNT */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT
          </h2>

          <div className="space-y-6">
            {/* Email Address */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    EMAIL ADDRESS
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {email}
                  </p>
                </div>
                {!editingEmail && (
                  <button 
                    onClick={() => setEditingEmail(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    CHANGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingEmail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        NEW EMAIL ADDRESS
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CONFIRM NEW EMAIL
                      </label>
                      <input
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CURRENT PASSWORD
                      </label>
                      <input
                        type="password"
                        value={currentPasswordEmail}
                        onChange={(e) => setCurrentPasswordEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateEmail}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      UPDATE EMAIL
                    </button>
                    <button
                      onClick={() => setEditingEmail(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    PASSWORD
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    ••••••••
                  </p>
                </div>
                {!editingPassword && (
                  <button 
                    onClick={() => setEditingPassword(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    CHANGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingPassword && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CURRENT PASSWORD
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        NEW PASSWORD
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      {newPassword && (
                        <div className="mt-1 flex gap-1">
                          <div className={`h-1 flex-1 ${newPassword.length >= 8 ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${newPassword.length >= 10 && /[A-Z]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                          <div className={`h-1 flex-1 ${newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-[#389C9A]' : 'bg-[#1D1D1D]/10'}`} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CONFIRM NEW PASSWORD
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdatePassword}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      UPDATE PASSWORD
                    </button>
                    <button
                      onClick={() => setEditingPassword(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phone Number */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                PHONE NUMBER
              </label>
              <p className="text-sm text-[#1D1D1D]/60 mb-2">
                {phoneNumber}
              </p>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-[#389C9A] mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-[#1D1D1D]/50 leading-relaxed">
                  To change your phone number contact our team at{" "}
                  <a href="mailto:support@livelink.com" className="text-[#389C9A] underline">
                    support@livelink.com
                  </a>
                  {" "}— this requires identity verification.
                </p>
              </div>
            </div>

            {/* Account Owner Name */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    ACCOUNT OWNER
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {ownerName}
                  </p>
                  <p className="text-xs text-[#1D1D1D]/40 mt-0.5">
                    {ownerJobTitle}
                  </p>
                </div>
                {!editingOwner && (
                  <button 
                    onClick={() => {
                      setNewOwnerName(ownerName);
                      setNewOwnerJobTitle(ownerJobTitle);
                      setEditingOwner(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    CHANGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingOwner && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        FULL NAME
                      </label>
                      <input
                        type="text"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        JOB TITLE / ROLE
                      </label>
                      <input
                        type="text"
                        value={newOwnerJobTitle}
                        onChange={(e) => setNewOwnerJobTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CURRENT PASSWORD
                      </label>
                      <input
                        type="password"
                        value={currentPasswordOwner}
                        onChange={(e) => setCurrentPasswordOwner(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateOwner}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      UPDATE DETAILS
                    </button>
                    <button
                      onClick={() => setEditingOwner(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SECTION 2: BUSINESS PROFILE */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            BUSINESS PROFILE
          </h2>

          <div className="space-y-6">
            {/* Business Name */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BUSINESS NAME
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {businessName}
                  </p>
                </div>
                {!editingBusinessName && (
                  <button 
                    onClick={() => {
                      setBusinessNameInput(businessName);
                      setEditingBusinessName(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingBusinessName && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-2 italic">
                        Changing your business name will be reviewed by our team before going live.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveBusinessName}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingBusinessName(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Logo */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                  BUSINESS LOGO
                </label>
                <div className="flex items-center gap-3">
                  <img src={businessLogo} alt="Business logo" className="w-10 h-10 border border-[#1D1D1D]/10" />
                  {!editingLogo && (
                    <button 
                      onClick={() => setEditingLogo(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                    >
                      CHANGE
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {editingLogo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="border-2 border-dashed border-[#1D1D1D]/20 p-8 text-center">
                      <Upload className="w-8 h-8 text-[#1D1D1D]/40 mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#1D1D1D] mb-1">Tap to upload new logo</p>
                      <p className="text-[9px] text-[#1D1D1D]/50">PNG recommended · Max 2MB</p>
                    </div>
                    <button
                      onClick={() => setEditingLogo(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE LOGO
                    </button>
                    <button
                      onClick={() => setEditingLogo(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Description */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BUSINESS DESCRIPTION
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60 leading-relaxed">
                    {truncateDescription(businessDescription)}
                    {businessDescription.split(" ").length > 15 && !editingDescription && (
                      <button 
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="ml-1 text-[#389C9A] text-xs font-bold"
                      >
                        {descriptionExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>
                </div>
                {!editingDescription && (
                  <button 
                    onClick={() => {
                      setDescriptionInput(businessDescription);
                      setEditingDescription(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingDescription && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <textarea
                        value={descriptionInput}
                        onChange={(e) => setDescriptionInput(e.target.value.slice(0, 200))}
                        rows={4}
                        maxLength={200}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                      />
                      <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                        {descriptionInput.length}/200
                      </div>
                    </div>
                    <button
                      onClick={handleSaveDescription}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE DESCRIPTION
                    </button>
                    <button
                      onClick={() => setEditingDescription(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Industry Category */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    INDUSTRY
                  </label>
                  <span className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic inline-block">
                    {industry}
                  </span>
                </div>
                {!editingIndustry && (
                  <button 
                    onClick={() => setEditingIndustry(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    CHANGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingIndustry && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                    >
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditingIndustry(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingIndustry(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Website URL */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    WEBSITE
                  </label>
                  <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#389C9A] underline">
                    {website}
                  </a>
                </div>
                {!editingWebsite && (
                  <button 
                    onClick={() => {
                      setWebsiteInput(website);
                      setEditingWebsite(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingWebsite && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
                      <input
                        type="text"
                        value={websiteInput}
                        onChange={(e) => setWebsiteInput(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveWebsite}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingWebsite(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Business Location */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    LOCATION
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {city}, {country}
                  </p>
                </div>
                {!editingLocation && (
                  <button 
                    onClick={() => {
                      setCityInput(city);
                      setCountryInput(country);
                      setEditingLocation(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingLocation && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        CITY
                      </label>
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        COUNTRY
                      </label>
                      <select
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      >
                        <option value="Nigeria">Nigeria</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Kenya">Kenya</option>
                        <option value="South Africa">South Africa</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSaveLocation}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE LOCATION
                    </button>
                    <button
                      onClick={() => setEditingLocation(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Social Media */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    SOCIAL MEDIA
                  </label>
                  <div className="space-y-2">
                    {socialPlatforms.map((platform) => (
                      <div key={platform.id} className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic">
                          {platform.name}
                        </div>
                        <span className="text-xs text-[#1D1D1D]/60">{platform.handle}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {!editingSocial && (
                  <button 
                    onClick={() => setEditingSocial(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    MANAGE
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingSocial && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {socialPlatforms.map((platform) => (
                      <div key={platform.id} className="flex items-center justify-between p-3 border border-[#1D1D1D]/10">
                        <div>
                          <p className="text-xs font-bold text-[#1D1D1D]">{platform.name}</p>
                          <p className="text-[10px] text-[#1D1D1D]/60">{platform.handle}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePlatform(platform.id)}
                          className="text-[9px] font-black uppercase tracking-wider text-red-600 italic"
                        >
                          REMOVE
                        </button>
                      </div>
                    ))}
                    <button className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic">
                      ADD PLATFORM
                    </button>
                    <button
                      onClick={() => setEditingSocial(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      DONE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SECTION 3: PAYMENT & BILLING */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            PAYMENT & BILLING
          </h2>

          <div className="space-y-6">
            {/* Saved Payment Method */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-3 italic">
                PAYMENT METHOD
              </label>
              
              <div className="flex items-center justify-between p-3 border border-[#1D1D1D]/10 mb-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#1D1D1D]" />
                  <div>
                    <p className="text-xs font-bold text-[#1D1D1D]">VISA ···· 4242</p>
                    <p className="text-[10px] text-[#1D1D1D]/60">EXP 04/28</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingPayment(true)}
                    className="text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    CHANGE
                  </button>
                  <button className="text-[9px] font-black uppercase tracking-wider text-red-600 italic">
                    REMOVE
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {editingPayment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 space-y-3 overflow-hidden"
                  >
                    <div className="border border-[#1D1D1D]/20 p-4">
                      <p className="text-xs font-bold text-[#1D1D1D] mb-3">Enter new card details</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Card number"
                          className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-1/2 px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                          <input
                            type="text"
                            placeholder="CVV"
                            className="w-1/2 px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingPayment(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE CARD
                    </button>
                    <button
                      onClick={() => setEditingPayment(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => setShowAddCard(!showAddCard)}
                className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
              >
                + ADD A NEW CARD
              </button>
            </div>

            {/* Billing History */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button className="w-full flex items-center justify-between">
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BILLING HISTORY
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    View all past campaign payments and receipts.
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 flex-shrink-0" />
              </button>
            </div>

            {/* Pending Refunds */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button className="w-full flex items-center justify-between">
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    PENDING REFUNDS
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    No pending refunds
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: CAMPAIGN PREFERENCES */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-2 italic">
            CAMPAIGN PREFERENCES
          </h2>
          <p className="text-[9px] text-[#1D1D1D]/60 mb-4 leading-relaxed">
            These preferences help us match your campaigns with the right creators.
          </p>

          <div className="space-y-6">
            {/* Target Audience Age Range */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    TARGET AUDIENCE AGE
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {ageMin} – {ageMax}
                  </p>
                </div>
                {!editingAgeRange && (
                  <button 
                    onClick={() => setEditingAgeRange(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingAgeRange && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                            MIN AGE
                          </label>
                          <input
                            type="number"
                            value={ageMin}
                            onChange={(e) => setAgeMin(Number(e.target.value))}
                            min={13}
                            max={65}
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                            MAX AGE
                          </label>
                          <input
                            type="number"
                            value={ageMax}
                            onChange={(e) => setAgeMax(Number(e.target.value))}
                            min={13}
                            max={65}
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingAgeRange(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingAgeRange(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Target Audience Gender */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    TARGET GENDER
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {targetGenders.map((gender, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic"
                      >
                        {gender}
                      </span>
                    ))}
                  </div>
                </div>
                {!editingGender && (
                  <button 
                    onClick={() => setEditingGender(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingGender && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2">
                      {genderOptions.map((gender) => (
                        <button
                          key={gender}
                          onClick={() => {
                            if (gender === "All Genders") {
                              setTargetGenders(["All Genders"]);
                            } else {
                              const filtered = targetGenders.filter(g => g !== "All Genders");
                              if (targetGenders.includes(gender)) {
                                const newGenders = filtered.filter(g => g !== gender);
                                setTargetGenders(newGenders.length === 0 ? ["All Genders"] : newGenders);
                              } else {
                                setTargetGenders([...filtered, gender]);
                              }
                            }
                          }}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                            targetGenders.includes(gender)
                              ? "bg-[#389C9A] border-[#389C9A] text-white"
                              : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingGender(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingGender(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Preferred Creator Niches */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    PREFERRED CREATOR NICHES
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {preferredNiches.map((niche, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
                {!editingNiches && (
                  <button 
                    onClick={() => setEditingNiches(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    EDIT
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingNiches && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2">
                      {nicheOptions.map((niche) => (
                        <button
                          key={niche}
                          onClick={() => {
                            if (preferredNiches.includes(niche)) {
                              setPreferredNiches(preferredNiches.filter(n => n !== niche));
                            } else {
                              setPreferredNiches([...preferredNiches, niche]);
                            }
                          }}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                            preferredNiches.includes(niche)
                              ? "bg-[#389C9A] border-[#389C9A] text-white"
                              : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                          }`}
                        >
                          {niche}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingNiches(false)}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic"
                    >
                      SAVE NICHES
                    </button>
                    <button
                      onClick={() => setEditingNiches(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Default Campaign Type */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                DEFAULT CAMPAIGN TYPE
              </label>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Pre-select your preferred campaign type when creating a new campaign.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDefaultCampaignType("BANNER")}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                    defaultCampaignType === "BANNER"
                      ? "bg-[#389C9A] border-[#389C9A] text-white"
                      : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                  }`}
                >
                  BANNER
                </button>
                <button
                  onClick={() => setDefaultCampaignType("PROMO CODE")}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                    defaultCampaignType === "PROMO CODE"
                      ? "bg-[#389C9A] border-[#389C9A] text-white"
                      : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                  }`}
                >
                  PROMO CODE
                </button>
              </div>
              <button
                onClick={() => setDefaultCampaignType("BANNER + CODE")}
                className={`w-full mt-2 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                  defaultCampaignType === "BANNER + CODE"
                    ? "bg-[#389C9A] border-[#389C9A] text-white"
                    : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                }`}
              >
                BANNER + CODE
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 5: NOTIFICATIONS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            NOTIFICATIONS
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">Creator accepts my campaign</span>
              <button
                onClick={() => setNotifAccepts(!notifAccepts)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifAccepts ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">Creator declines my campaign</span>
              <button
                onClick={() => setNotifDeclines(!notifDeclines)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifDeclines ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">Stream verified and payout released</span>
              <button
                onClick={() => setNotifPayouts(!notifPayouts)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifPayouts ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">New message from a creator</span>
              <button
                onClick={() => setNotifMessages(!notifMessages)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifMessages ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-[#1D1D1D]">Platform announcements</span>
              <button
                onClick={() => setNotifAnnouncements(!notifAnnouncements)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifAnnouncements ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 6: COMPLIANCE & LEGAL */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            COMPLIANCE & LEGAL
          </h2>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="text-left">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                  ADVERTISER POLICY
                </label>
                <p className="text-[9px] text-[#1D1D1D]/60">
                  Last agreed on Jan 15, 2026
                </p>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 flex-shrink-0" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="text-left">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                  TERMS OF SERVICE
                </label>
                <p className="text-[9px] text-[#1D1D1D]/60">
                  Last agreed on Jan 15, 2026
                </p>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 flex-shrink-0" />
            </button>

            <div className="p-4 border border-[#1D1D1D]/10">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] italic">
                  VERIFICATION STATUS
                </label>
                {verificationStatus === "VERIFIED" && (
                  <span className="px-3 py-1 bg-green-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                {verificationStatus === "PENDING" && (
                  <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
                    <Clock className="w-3 h-3" /> PENDING
                  </span>
                )}
                {verificationStatus === "ACTION REQUIRED" && (
                  <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> ACTION REQUIRED
                  </span>
                )}
              </div>
              <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
                Your business identity has been verified by the LiveLink team.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 7: ACCOUNT STATUS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT STATUS
          </h2>

          <div className="space-y-6">
            {/* Pause Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">PAUSE YOUR ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Pausing hides your business profile and all active campaign listings. Ongoing campaigns with accepted creators are not affected.
              </p>
              <button
                onClick={() => setShowPauseModal(true)}
                className="w-full py-2.5 border-2 border-[#D2691E] text-[#D2691E] text-[10px] font-black uppercase tracking-wider italic hover:bg-[#D2691E] hover:text-white transition-colors"
              >
                PAUSE MY ACCOUNT
              </button>
            </div>

            {/* Delete Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">DELETE ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Permanently deletes your business account and all data. Any active campaigns will be terminated and held funds refunded. This cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 border-2 border-red-600 text-red-600 text-[10px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors"
              >
                REQUEST ACCOUNT DELETION
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 8: SUPPORT */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            SUPPORT
          </h2>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Help Centre</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Contact Support</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Terms of Service</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Privacy Policy</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>
          </div>
        </div>

        {/* BOTTOM INFO */}
        <div className="text-center space-y-2 pt-6">
          <p className="text-[9px] text-[#1D1D1D]/40">
            LiveLink v1.0.0
          </p>
          <p className="text-[9px] text-[#1D1D1D]/60">
            Logged in as Acme Marketing Agency · Not you?{" "}
            <button className="text-[#389C9A] font-bold">
              Log out
            </button>
          </p>
        </div>
      </div>

      {/* PAUSE ACCOUNT MODAL */}
      <AnimatePresence>
        {showPauseModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowPauseModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-3">
                Pause Your Account?
              </h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                Your profile and campaign listings will be hidden. You can reactivate at any time from Settings. Active campaigns already matched with creators will continue.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 bg-[#D2691E] text-white text-[10px] font-black uppercase tracking-wider italic"
                >
                  YES, PAUSE ACCOUNT
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DELETE ACCOUNT MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-3">
                Delete Your Account?
              </h3>
              <p className="text-sm text-[#1D1D1D]/70 mb-6 leading-relaxed">
                This is permanent. All campaigns, data and payment history will be removed. Any held funds will be refunded to your payment method within 5 business days. Active campaigns will be terminated and creators will be notified.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider italic"
                >
                  YES, DELETE MY ACCOUNT
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
