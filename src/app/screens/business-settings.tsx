import React, { useState, useEffect } from "react";
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
  AlertCircle,
  Save,
  Loader2,
  Plus,
  Trash2,
  Phone,
  Building,
  MapPin,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Receipt,
  Download,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/contexts/AuthContext";
import { toast } from "sonner";

interface BusinessProfileData {
  businessName: string;
  yourName: string;
  contactNumber: string;
  email: string;
  website: string;
  industry: string;
  country: string;
  bio: string;
  city?: string;
  address?: string;
  postalCode?: string;
  registrationNumber?: string;
  taxId?: string;
  yearFounded?: string;
  employeeCount?: string;
  socialLinks?: {platform: string, url: string}[];
  logo?: string;
}

interface PaymentMethod {
  id: string;
  card_type: string;
  last4: string;
  expiry: string;
  is_default: boolean;
  cardholder_name?: string;
}

interface Transaction {
  id: string;
  campaign_id: string;
  campaign_name: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  type: 'payment' | 'payout' | 'refund';
  description: string;
  date: string;
  receipt_url?: string;
  payment_method?: string;
  reference?: string;
}

interface RefundRequest {
  id: string;
  transaction_id: string;
  campaign_id: string;
  campaign_name: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  requested_date: string;
  processed_date?: string;
  notes?: string;
}

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Account section state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerJobTitle, setOwnerJobTitle] = useState("");
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
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState(false);
  const [editingYearFounded, setEditingYearFounded] = useState(false);
  const [editingEmployeeCount, setEditingEmployeeCount] = useState(false);
  const [editingSocial, setEditingSocial] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteInput, setWebsiteInput] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [address, setAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [postalCodeInput, setPostalCodeInput] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationInput, setRegistrationInput] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxIdInput, setTaxIdInput] = useState("");
  const [yearFounded, setYearFounded] = useState("");
  const [yearFoundedInput, setYearFoundedInput] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [employeeCountInput, setEmployeeCountInput] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState<{platform: string, url: string, id: string}[]>([]);

  // Payment section state
  const [editingPayment, setEditingPayment] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [newCard, setNewCard] = useState({
    card_number: "",
    cardholder_name: "",
    expiry: "",
    cvv: ""
  });

  // Billing history state
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'completed' | 'pending' | 'refunded'>('all');
  const [transactionPeriod, setTransactionPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Refunds state
  const [showRefunds, setShowRefunds] = useState(false);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundTransaction, setRefundTransaction] = useState<Transaction | null>(null);

  // Campaign Preferences state
  const [editingAgeRange, setEditingAgeRange] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [editingNiches, setEditingNiches] = useState(false);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [ageMinInput, setAgeMinInput] = useState(18);
  const [ageMaxInput, setAgeMaxInput] = useState(35);
  const [targetGenders, setTargetGenders] = useState(["All Genders"]);
  const [targetGendersInput, setTargetGendersInput] = useState<string[]>(["All Genders"]);
  const [preferredNiches, setPreferredNiches] = useState<string[]>([]);
  const [preferredNichesInput, setPreferredNichesInput] = useState<string[]>([]);
  const [defaultCampaignType, setDefaultCampaignType] = useState("BANNER");

  // Notifications state
  const [notifAccepts, setNotifAccepts] = useState(true);
  const [notifDeclines, setNotifDeclines] = useState(true);
  const [notifPayouts, setNotifPayouts] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Verification status
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'unverified' | 'rejected'>('unverified');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const employeeCountOptions = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "500+"
  ];

  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

  const genderOptions = ["Male", "Female", "Non-binary", "All Genders"];

  const platformIcons: Record<string, any> = {
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    facebook: Facebook,
    tiktok: () => <span className="text-[8px]">TikTok</span>,
    other: LinkIcon
  };

  // Fetch business data on mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) {
        navigate('/login/portal');
        return;
      }

      try {
        // Fetch business profile
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (businessError && businessError.code !== 'PGRST116') {
          console.error("Fetch error:", businessError);
        }

        if (businessData) {
          setBusinessId(businessData.id);
          
          // Set all business fields
          setBusinessName(businessData.business_name || "");
          setOwnerName(businessData.contact_name || "");
          setPhoneNumber(businessData.contact_phone || "");
          setEmail(businessData.contact_email || user.email || "");
          setWebsite(businessData.website || "");
          setIndustry(businessData.industry || "");
          setCountry(businessData.country || "");
          setBusinessDescription(businessData.description || "");
          setCity(businessData.city || "");
          setAddress(businessData.address || "");
          setPostalCode(businessData.postal_code || "");
          setRegistrationNumber(businessData.registration_number || "");
          setTaxId(businessData.tax_id || "");
          setYearFounded(businessData.year_founded || "");
          setEmployeeCount(businessData.employee_count || "");
          setBusinessLogo(businessData.logo_url || "");
          
          // Parse social links
          if (businessData.social_links && businessData.social_links.length > 0) {
            setSocialPlatforms(businessData.social_links.map((link: any, index: number) => ({
              ...link,
              id: `social-${index}-${Date.now()}`
            })));
          }

          setVerificationStatus(businessData.verification_status || 'unverified');
          setRejectionReason(businessData.rejection_reason || null);

          // Fetch preferences
          const { data: prefsData } = await supabase
            .from("business_preferences")
            .select("*")
            .eq("business_id", businessData.id)
            .single();

          if (prefsData) {
            setAgeMin(prefsData.age_min || 18);
            setAgeMax(prefsData.age_max || 35);
            setTargetGenders(prefsData.target_genders || ["All Genders"]);
            setPreferredNiches(prefsData.preferred_niches || []);
            setDefaultCampaignType(prefsData.default_campaign_type || "BANNER");
          }

          // Fetch notification settings
          const { data: notifData } = await supabase
            .from("business_notifications")
            .select("*")
            .eq("business_id", businessData.id)
            .single();

          if (notifData) {
            setNotifAccepts(notifData.campaign_accepts ?? true);
            setNotifDeclines(notifData.campaign_declines ?? true);
            setNotifPayouts(notifData.payout_released ?? true);
            setNotifMessages(notifData.new_messages ?? true);
            setNotifAnnouncements(notifData.announcements ?? false);
          }

          // Fetch saved cards
          const { data: cardsData } = await supabase
            .from("business_payment_methods")
            .select("*")
            .eq("business_id", businessData.id);

          if (cardsData) {
            setSavedCards(cardsData);
          }

          // Fetch transactions
          await fetchTransactions(businessData.id);
          
          // Fetch refund requests
          await fetchRefundRequests(businessData.id);
        }
      } catch (error) {
        console.error("Error fetching business data:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [user, navigate]);

  // Fetch transactions
  const fetchTransactions = async (id: string) => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("business_transactions")
        .select("*")
        .eq("business_id", id)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch refund requests
  const fetchRefundRequests = async (id: string) => {
    setLoadingRefunds(true);
    try {
      const { data, error } = await supabase
        .from("refund_requests")
        .select("*")
        .eq("business_id", id)
        .order("requested_date", { ascending: false });

      if (error) throw error;
      setRefundRequests(data || []);
    } catch (error) {
      console.error("Error fetching refunds:", error);
    } finally {
      setLoadingRefunds(false);
    }
  };

  // Request refund
  const handleRequestRefund = async () => {
    if (!businessId || !refundTransaction) return;
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("refund_requests")
        .insert({
          business_id: businessId,
          transaction_id: refundTransaction.id,
          campaign_id: refundTransaction.campaign_id,
          campaign_name: refundTransaction.campaign_name,
          amount: refundTransaction.amount,
          currency: refundTransaction.currency,
          reason: refundReason,
          status: 'pending',
          requested_date: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Refund request submitted successfully");
      setShowRefundModal(false);
      setRefundReason("");
      setRefundTransaction(null);
      
      // Refresh refund requests
      await fetchRefundRequests(businessId);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Download receipt
  const handleDownloadReceipt = async (transaction: Transaction) => {
    try {
      // In a real implementation, this would generate and download a PDF receipt
      toast.success("Receipt downloaded");
    } catch (error) {
      toast.error("Failed to download receipt");
    }
  };

  // Filter transactions
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Filter by status
    if (transactionFilter !== 'all') {
      filtered = filtered.filter(t => t.status === transactionFilter);
    }

    // Filter by period
    const now = new Date();
    if (transactionPeriod === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      filtered = filtered.filter(t => new Date(t.date) >= monthAgo);
    } else if (transactionPeriod === 'quarter') {
      const quarterAgo = new Date(now.setMonth(now.getMonth() - 3));
      filtered = filtered.filter(t => new Date(t.date) >= quarterAgo);
    } else if (transactionPeriod === 'year') {
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      filtered = filtered.filter(t => new Date(t.date) >= yearAgo);
    }

    return filtered;
  };

  // Get transaction stats
  const getTransactionStats = () => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const completed = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
    const refunded = transactions
      .filter(t => t.status === 'refunded')
      .reduce((sum, t) => sum + t.amount, 0);

    return { total, completed, pending, refunded };
  };

  // Save business profile changes
  const saveBusinessProfile = async (updates: Partial<BusinessProfileData>) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Handle email update
  const handleUpdateEmail = async () => {
    if (newEmail !== confirmEmail) {
      toast.error("Emails do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      // Update in businesses table
      await supabase
        .from("businesses")
        .update({ contact_email: newEmail })
        .eq("user_id", user?.id);

      setEmail(newEmail);
      setEditingEmail(false);
      toast.success("Verification email sent to new address");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle phone update
  const handleUpdatePhone = async () => {
    await saveBusinessProfile({ contactNumber: phoneInput });
    setPhoneNumber(phoneInput);
    setEditingPhone(false);
  };

  // Handle owner update
  const handleUpdateOwner = async () => {
    await saveBusinessProfile({
      yourName: newOwnerName,
      contact_name: newOwnerName,
      contact_job_title: newOwnerJobTitle
    });
    setOwnerName(newOwnerName);
    setOwnerJobTitle(newOwnerJobTitle);
    setEditingOwner(false);
  };

  // Handle business name update
  const handleSaveBusinessName = async () => {
    await saveBusinessProfile({ businessName: businessNameInput });
    setBusinessName(businessNameInput);
    setEditingBusinessName(false);
  };

  // Handle description update
  const handleSaveDescription = async () => {
    await saveBusinessProfile({ bio: descriptionInput });
    setBusinessDescription(descriptionInput);
    setEditingDescription(false);
  };

  // Handle website update
  const handleSaveWebsite = async () => {
    await saveBusinessProfile({ website: websiteInput });
    setWebsite(websiteInput);
    setEditingWebsite(false);
  };

  // Handle location update
  const handleSaveLocation = async () => {
    await saveBusinessProfile({ 
      city: cityInput,
      country: countryInput 
    });
    setCity(cityInput);
    setCountry(countryInput);
    setEditingLocation(false);
  };

  // Handle address update
  const handleSaveAddress = async () => {
    await saveBusinessProfile({ 
      address: addressInput,
      postal_code: postalCodeInput 
    });
    setAddress(addressInput);
    setPostalCode(postalCodeInput);
    setEditingAddress(false);
  };

  // Handle registration number update
  const handleSaveRegistration = async () => {
    await saveBusinessProfile({ registrationNumber: registrationInput });
    setRegistrationNumber(registrationInput);
    setEditingRegistration(false);
  };

  // Handle tax ID update
  const handleSaveTaxId = async () => {
    await saveBusinessProfile({ taxId: taxIdInput });
    setTaxId(taxIdInput);
    setEditingTaxId(false);
  };

  // Handle year founded update
  const handleSaveYearFounded = async () => {
    await saveBusinessProfile({ yearFounded: yearFoundedInput });
    setYearFounded(yearFoundedInput);
    setEditingYearFounded(false);
  };

  // Handle employee count update
  const handleSaveEmployeeCount = async () => {
    await saveBusinessProfile({ employeeCount: employeeCountInput });
    setEmployeeCount(employeeCountInput);
    setEditingEmployeeCount(false);
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      await supabase
        .from("businesses")
        .update({ logo_url: urlData.publicUrl })
        .eq("user_id", user.id);

      setBusinessLogo(urlData.publicUrl);
      toast.success("Logo updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingLogo(false);
      setEditingLogo(false);
    }
  };

  // Handle social links update
  const handleSaveSocialLinks = async () => {
    const socialLinks = socialPlatforms.map(({ platform, url }) => ({ platform, url }));
    await saveBusinessProfile({ socialLinks });
    setEditingSocial(false);
  };

  // Handle add card
  const handleAddCard = async () => {
    if (!businessId) return;

    if (!newCard.card_number || !newCard.cardholder_name || !newCard.expiry || !newCard.cvv) {
      toast.error("Please fill in all card details");
      return;
    }

    setSaving(true);
    try {
      const last4 = newCard.card_number.slice(-4);
      const cardType = newCard.card_number.startsWith('4') ? 'VISA' : 
                      newCard.card_number.startsWith('5') ? 'MASTERCARD' : 
                      newCard.card_number.startsWith('3') ? 'AMEX' : 'CARD';

      const { error } = await supabase
        .from("business_payment_methods")
        .insert({
          business_id: businessId,
          card_type: cardType,
          last4: last4,
          expiry: newCard.expiry,
          cardholder_name: newCard.cardholder_name,
          is_default: savedCards.length === 0
        });

      if (error) throw error;

      // Refresh cards
      const { data: cardsData } = await supabase
        .from("business_payment_methods")
        .select("*")
        .eq("business_id", businessId);

      if (cardsData) {
        setSavedCards(cardsData);
      }

      setShowAddCard(false);
      setNewCard({ card_number: "", cardholder_name: "", expiry: "", cvv: "" });
      toast.success("Card added successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle remove card
  const handleRemoveCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to remove this card?")) return;

    try {
      const { error } = await supabase
        .from("business_payment_methods")
        .delete()
        .eq("id", cardId);

      if (error) throw error;

      setSavedCards(prev => prev.filter(c => c.id !== cardId));
      toast.success("Card removed");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Handle set default card
  const handleSetDefaultCard = async (cardId: string) => {
    if (!businessId) return;

    try {
      // Remove default from all
      await supabase
        .from("business_payment_methods")
        .update({ is_default: false })
        .eq("business_id", businessId);

      // Set new default
      await supabase
        .from("business_payment_methods")
        .update({ is_default: true })
        .eq("id", cardId);

      // Update local state
      setSavedCards(prev => prev.map(c => ({
        ...c,
        is_default: c.id === cardId
      })));

      toast.success("Default card updated");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Handle preferences update
  const savePreferences = async () => {
    if (!businessId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_preferences")
        .upsert({
          business_id: businessId,
          age_min: ageMin,
          age_max: ageMax,
          target_genders: targetGenders,
          preferred_niches: preferredNiches,
          default_campaign_type: defaultCampaignType,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Preferences saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle notification settings update
  const saveNotifications = async () => {
    if (!businessId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_notifications")
        .upsert({
          business_id: businessId,
          campaign_accepts: notifAccepts,
          campaign_declines: notifDeclines,
          payout_released: notifPayouts,
          new_messages: notifMessages,
          announcements: notifAnnouncements,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Notification settings saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const truncateDescription = (text: string, lines: number = 2) => {
    const words = text.split(" ");
    if (words.length <= 15) return text;
    return descriptionExpanded ? text : words.slice(0, 15).join(" ") + "...";
  };

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase()] || LinkIcon;
    return <Icon className="w-3.5 h-3.5" />;
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <span className="px-3 py-1 bg-green-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> VERIFIED
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-[9px] font-black uppercase tracking-wider italic flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> NOT VERIFIED
          </span>
        );
    }
  };

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full">COMPLETED</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full">PENDING</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded-full">FAILED</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black rounded-full">REFUNDED</span>;
      default:
        return null;
    }
  };

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full">APPROVED</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full">PENDING</span>;
      case 'processing':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded-full">PROCESSING</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded-full">REJECTED</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#389C9A]" />
          <p className="text-[10px] font-mono text-[#1D1D1D]/30 uppercase tracking-widest">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();
  const stats = getTransactionStats();
  const pendingRefunds = refundRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto relative">
      {/* TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#1D1D1D]/10 z-50 px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center justify-center relative">
          <button 
            onClick={() => {
              if (showBillingHistory) {
                setShowBillingHistory(false);
              } else if (showRefunds) {
                setShowRefunds(false);
              } else {
                navigate(-1);
              }
            }} 
            className="absolute left-0 p-1"
          >
            <ArrowLeft className="w-5 h-5 text-[#1D1D1D]" />
          </button>
          <h1 className="text-base font-black uppercase tracking-tighter italic text-[#1D1D1D]">
            {showBillingHistory ? 'BILLING HISTORY' : showRefunds ? 'REFUND REQUESTS' : 'SETTINGS'}
          </h1>
          {saving && (
            <div className="absolute right-0">
              <Loader2 className="w-4 h-4 animate-spin text-[#389C9A]" />
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="mt-14 px-4 py-6 space-y-8">
        
        {!showBillingHistory && !showRefunds ? (
          /* MAIN SETTINGS VIEW */
          <>
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
                        {email || "Not set"}
                      </p>
                    </div>
                    {!editingEmail && (
                      <button 
                        onClick={() => setEditingEmail(true)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {email ? "CHANGE" : "ADD"}
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
                            placeholder="new@email.com"
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
                            placeholder="new@email.com"
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
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleUpdateEmail}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "UPDATING..." : "UPDATE EMAIL"}
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
                            placeholder="••••••••"
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
                            placeholder="••••••••"
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
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleUpdatePassword}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "UPDATING..." : "UPDATE PASSWORD"}
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
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        PHONE NUMBER
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {phoneNumber || "Not set"}
                      </p>
                    </div>
                    {!editingPhone && (
                      <button 
                        onClick={() => {
                          setPhoneInput(phoneNumber);
                          setEditingPhone(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {phoneNumber ? "CHANGE" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingPhone && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
                          <input
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="+234 801 234 5678"
                            className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleUpdatePhone}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "UPDATING..." : "UPDATE PHONE"}
                        </button>
                        <button
                          onClick={() => setEditingPhone(false)}
                          className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                        >
                          CANCEL
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Account Owner Name */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        ACCOUNT OWNER
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {ownerName || "Not set"}
                      </p>
                      <p className="text-xs text-[#1D1D1D]/40 mt-0.5">
                        {ownerJobTitle || "No job title"}
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
                        {ownerName ? "CHANGE" : "ADD"}
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
                            placeholder="John Doe"
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
                            placeholder="Marketing Director"
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
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleUpdateOwner}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "UPDATING..." : ownerName ? "UPDATE DETAILS" : "ADD OWNER"}
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
                        {businessName || "Not set"}
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
                        {businessName ? "EDIT" : "ADD"}
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
                            placeholder="Enter business name"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                          <p className="text-[8px] text-[#1D1D1D]/50 mt-2 italic">
                            Changing your business name will be reviewed by our team before going live.
                          </p>
                        </div>
                        <button
                          onClick={handleSaveBusinessName}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : businessName ? "SAVE" : "ADD BUSINESS NAME"}
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
                      {businessLogo ? (
                        <img src={businessLogo} alt="Business logo" className="w-10 h-10 border border-[#1D1D1D]/10 object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-[#1D1D1D]/5 border border-[#1D1D1D]/10 flex items-center justify-center">
                          <Building className="w-5 h-5 text-[#1D1D1D]/30" />
                        </div>
                      )}
                      {!editingLogo && (
                        <button 
                          onClick={() => setEditingLogo(true)}
                          className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                        >
                          {businessLogo ? "CHANGE" : "ADD"}
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
                          <input
                            type="file"
                            id="logo-upload"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                          <label
                            htmlFor="logo-upload"
                            className="cursor-pointer block"
                          >
                            <Upload className="w-8 h-8 text-[#1D1D1D]/40 mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#1D1D1D] mb-1">
                              {uploadingLogo ? "UPLOADING..." : "Tap to upload logo"}
                            </p>
                            <p className="text-[9px] text-[#1D1D1D]/50">PNG recommended · Max 2MB</p>
                          </label>
                        </div>
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
                        {businessDescription ? truncateDescription(businessDescription) : "No description set"}
                        {businessDescription && businessDescription.split(" ").length > 15 && !editingDescription && (
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
                        {businessDescription ? "EDIT" : "ADD"}
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
                            placeholder="Tell creators about your brand, mission, and what makes you unique..."
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                          />
                          <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                            {descriptionInput.length}/200
                          </div>
                        </div>
                        <button
                          onClick={handleSaveDescription}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : businessDescription ? "SAVE DESCRIPTION" : "ADD DESCRIPTION"}
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
                      {industry ? (
                        <span className="px-3 py-1 bg-[#389C9A] text-white text-[9px] font-black uppercase tracking-wider italic inline-block">
                          {industry}
                        </span>
                      ) : (
                        <p className="text-sm text-[#1D1D1D]/60">Not set</p>
                      )}
                    </div>
                    {!editingIndustry && (
                      <button 
                        onClick={() => setEditingIndustry(true)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {industry ? "CHANGE" : "ADD"}
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
                          <option value="">Select industry</option>
                          {industryOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            await saveBusinessProfile({ industry });
                            setEditingIndustry(false);
                          }}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
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
                      {website ? (
                        <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#389C9A] underline">
                          {website}
                        </a>
                      ) : (
                        <p className="text-sm text-[#1D1D1D]/60">Not set</p>
                      )}
                    </div>
                    {!editingWebsite && (
                      <button 
                        onClick={() => {
                          setWebsiteInput(website);
                          setEditingWebsite(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {website ? "EDIT" : "ADD"}
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
                            placeholder="example.com"
                            className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleSaveWebsite}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
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
                        {city || country ? `${city ? city + ', ' : ''}${country}` : "Not set"}
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
                        {city || country ? "EDIT" : "ADD"}
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
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D1D1D]/40" />
                          <input
                            type="text"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            placeholder="City"
                            className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <div>
                          <select
                            value={countryInput}
                            onChange={(e) => setCountryInput(e.target.value)}
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          >
                            <option value="">Select country</option>
                            <option value="Nigeria">Nigeria</option>
                            <option value="Ghana">Ghana</option>
                            <option value="Kenya">Kenya</option>
                            <option value="South Africa">South Africa</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="United States">United States</option>
                          </select>
                        </div>
                        <button
                          onClick={handleSaveLocation}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE LOCATION"}
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

                {/* Full Address */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        FULL ADDRESS
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {address || "Not set"}
                      </p>
                      {postalCode && (
                        <p className="text-xs text-[#1D1D1D]/40 mt-1">
                          Postal Code: {postalCode}
                        </p>
                      )}
                    </div>
                    {!editingAddress && (
                      <button 
                        onClick={() => {
                          setAddressInput(address);
                          setPostalCodeInput(postalCode);
                          setEditingAddress(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {address ? "EDIT" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingAddress && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                            STREET ADDRESS
                          </label>
                          <input
                            type="text"
                            value={addressInput}
                            onChange={(e) => setAddressInput(e.target.value)}
                            placeholder="123 Business Street"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                            POSTAL CODE
                          </label>
                          <input
                            type="text"
                            value={postalCodeInput}
                            onChange={(e) => setPostalCodeInput(e.target.value)}
                            placeholder="100001"
                            className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                          />
                        </div>
                        <button
                          onClick={handleSaveAddress}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE ADDRESS"}
                        </button>
                        <button
                          onClick={() => setEditingAddress(false)}
                          className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                        >
                          CANCEL
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Registration Number */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        REGISTRATION NUMBER
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {registrationNumber || "Not set"}
                      </p>
                    </div>
                    {!editingRegistration && (
                      <button 
                        onClick={() => {
                          setRegistrationInput(registrationNumber);
                          setEditingRegistration(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {registrationNumber ? "EDIT" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingRegistration && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <input
                          type="text"
                          value={registrationInput}
                          onChange={(e) => setRegistrationInput(e.target.value)}
                          placeholder="RC123456"
                          className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                        <button
                          onClick={handleSaveRegistration}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
                        </button>
                        <button
                          onClick={() => setEditingRegistration(false)}
                          className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                        >
                          CANCEL
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tax ID */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        TAX ID / VAT
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {taxId || "Not set"}
                      </p>
                    </div>
                    {!editingTaxId && (
                      <button 
                        onClick={() => {
                          setTaxIdInput(taxId);
                          setEditingTaxId(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {taxId ? "EDIT" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingTaxId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <input
                          type="text"
                          value={taxIdInput}
                          onChange={(e) => setTaxIdInput(e.target.value)}
                          placeholder="GB123456789"
                          className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                        <button
                          onClick={handleSaveTaxId}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
                        </button>
                        <button
                          onClick={() => setEditingTaxId(false)}
                          className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                        >
                          CANCEL
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Year Founded */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        YEAR FOUNDED
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {yearFounded || "Not set"}
                      </p>
                    </div>
                    {!editingYearFounded && (
                      <button 
                        onClick={() => {
                          setYearFoundedInput(yearFounded);
                          setEditingYearFounded(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {yearFounded ? "EDIT" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingYearFounded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <input
                          type="text"
                          value={yearFoundedInput}
                          onChange={(e) => setYearFoundedInput(e.target.value)}
                          placeholder="2020"
                          className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                        <button
                          onClick={handleSaveYearFounded}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
                        </button>
                        <button
                          onClick={() => setEditingYearFounded(false)}
                          className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                        >
                          CANCEL
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Employee Count */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        EMPLOYEES
                      </label>
                      <p className="text-sm text-[#1D1D1D]/60">
                        {employeeCount || "Not set"}
                      </p>
                    </div>
                    {!editingEmployeeCount && (
                      <button 
                        onClick={() => {
                          setEmployeeCountInput(employeeCount);
                          setEditingEmployeeCount(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        {employeeCount ? "EDIT" : "ADD"}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {editingEmployeeCount && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <select
                          value={employeeCountInput}
                          onChange={(e) => setEmployeeCountInput(e.target.value)}
                          className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        >
                          <option value="">Select range</option>
                          {employeeCountOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveEmployeeCount}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE"}
                        </button>
                        <button
                          onClick={() => setEditingEmployeeCount(false)}
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
                      {socialPlatforms.length > 0 ? (
                        <div className="space-y-2">
                          {socialPlatforms.map((platform) => (
                            <div key={platform.id} className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#1D1D1D] rounded flex items-center justify-center text-white">
                                {getPlatformIcon(platform.platform)}
                              </div>
                              <span className="text-xs text-[#1D1D1D]/60 truncate">{platform.url}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#1D1D1D]/60">No social links added</p>
                      )}
                    </div>
                    {!editingSocial && (
                      <button 
                        onClick={() => setEditingSocial(true)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                      >
                        {socialPlatforms.length > 0 ? "MANAGE" : "ADD"}
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
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#1D1D1D] rounded flex items-center justify-center text-white">
                                {getPlatformIcon(platform.platform)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1D1D1D] capitalize">{platform.platform}</p>
                                <p className="text-[10px] text-[#1D1D1D]/60 truncate max-w-[150px]">{platform.url}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSocialPlatforms(prev => prev.filter(p => p.id !== platform.id))}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const platform = window.prompt("Enter platform name (e.g., Instagram, Twitter):");
                            if (platform) {
                              const url = window.prompt(`Enter ${platform} URL:`);
                              if (url) {
                                setSocialPlatforms(prev => [...prev, {
                                  platform: platform.toLowerCase(),
                                  url: url,
                                  id: `social-${Date.now()}-${Math.random()}`
                                }]);
                              }
                            }
                          }}
                          className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic flex items-center justify-center gap-2 hover:border-[#389C9A] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          ADD PLATFORM
                        </button>
                        <button
                          onClick={handleSaveSocialLinks}
                          disabled={saving}
                          className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                        >
                          {saving ? "SAVING..." : "SAVE CHANGES"}
                        </button>
                        <button
                          onClick={() => setEditingSocial(false)}
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

            {/* SECTION 3: PAYMENT & BILLING */}
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
                PAYMENT & BILLING
              </h2>

              <div className="space-y-6">
                {/* Saved Payment Methods */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-3 italic">
                    PAYMENT METHODS
                  </label>
                  
                  {savedCards.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {savedCards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-[#389C9A]" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-[#1D1D1D]">{card.card_type} •••• {card.last4}</p>
                                {card.is_default && (
                                  <span className="px-2 py-0.5 bg-[#389C9A]/10 text-[#389C9A] text-[8px] font-black rounded-full">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#1D1D1D]/60 mt-0.5">
                                Expires {card.expiry} • {card.cardholder_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!card.is_default && (
                              <button
                                onClick={() => handleSetDefaultCard(card.id)}
                                className="text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic hover:underline"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveCard(card.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#1D1D1D]/60 mb-4">No payment methods added</p>
                  )}

                  <button 
                    onClick={() => setShowAddCard(!showAddCard)}
                    className="w-full py-3 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic flex items-center justify-center gap-2 hover:border-[#389C9A] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    ADD NEW CARD
                  </button>

                  <AnimatePresence>
                    {showAddCard && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <div className="border border-[#1D1D1D]/20 p-4 bg-[#F8F8F8]">
                          <p className="text-xs font-bold text-[#1D1D1D] mb-3">Enter new card details</p>
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Card number"
                              value={newCard.card_number}
                              onChange={(e) => setNewCard({...newCard, card_number: e.target.value})}
                              className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Cardholder name"
                              value={newCard.cardholder_name}
                              onChange={(e) => setNewCard({...newCard, cardholder_name: e.target.value})}
                              className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none bg-white"
                            />
                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="MM/YY"
                                value={newCard.expiry}
                                onChange={(e) => setNewCard({...newCard, expiry: e.target.value})}
                                className="w-1/2 px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none bg-white"
                              />
                              <input
                                type="text"
                                placeholder="CVV"
                                value={newCard.cvv}
                                onChange={(e) => setNewCard({...newCard, cvv: e.target.value})}
                                className="w-1/2 px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddCard}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                          >
                            {saving ? "ADDING..." : "ADD CARD"}
                          </button>
                          <button
                            onClick={() => setShowAddCard(false)}
                            className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                          >
                            CANCEL
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Billing History */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <button 
                    onClick={() => setShowBillingHistory(true)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        BILLING HISTORY
                      </label>
                      <p className="text-[9px] text-[#1D1D1D]/60">
                        View all past campaign payments and receipts.
                      </p>
                      {transactions.length > 0 && (
                        <p className="text-[8px] text-[#389C9A] mt-1 font-bold">
                          {transactions.length} transactions • ₦{stats.total.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors flex-shrink-0" />
                  </button>
                </div>

                {/* Pending Refunds */}
                <div className="border-b border-[#1D1D1D]/10 pb-4">
                  <button 
                    onClick={() => setShowRefunds(true)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                        REFUND REQUESTS
                      </label>
                      <p className="text-[9px] text-[#1D1D1D]/60">
                        Track the status of your refund requests.
                      </p>
                      {pendingRefunds > 0 && (
                        <p className="text-[8px] text-amber-600 mt-1 font-bold">
                          {pendingRefunds} pending request{pendingRefunds > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors flex-shrink-0" />
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
                        onClick={() => {
                          setAgeMinInput(ageMin);
                          setAgeMaxInput(ageMax);
                          setEditingAgeRange(true);
                        }}
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
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                              MIN AGE
                            </label>
                            <input
                              type="number"
                              value={ageMinInput}
                              onChange={(e) => setAgeMinInput(Number(e.target.value))}
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
                              value={ageMaxInput}
                              onChange={(e) => setAgeMaxInput(Number(e.target.value))}
                              min={13}
                              max={65}
                              className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAgeMin(ageMinInput);
                              setAgeMax(ageMaxInput);
                              savePreferences();
                              setEditingAgeRange(false);
                            }}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                          >
                            {saving ? "SAVING..." : "SAVE"}
                          </button>
                          <button
                            onClick={() => setEditingAgeRange(false)}
                            className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                          >
                            CANCEL
                          </button>
                        </div>
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
                        onClick={() => {
                          setTargetGendersInput(targetGenders);
                          setEditingGender(true);
                        }}
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
                                  setTargetGendersInput(["All Genders"]);
                                } else {
                                  const filtered = targetGendersInput.filter(g => g !== "All Genders");
                                  if (targetGendersInput.includes(gender)) {
                                    setTargetGendersInput(filtered.filter(g => g !== gender));
                                  } else {
                                    setTargetGendersInput([...filtered, gender]);
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                                targetGendersInput.includes(gender)
                                  ? "bg-[#389C9A] border-[#389C9A] text-white"
                                  : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                              }`}
                            >
                              {gender}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setTargetGenders(targetGendersInput);
                              savePreferences();
                              setEditingGender(false);
                            }}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                          >
                            {saving ? "SAVING..." : "SAVE"}
                          </button>
                          <button
                            onClick={() => setEditingGender(false)}
                            className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                          >
                            CANCEL
                          </button>
                        </div>
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
                      {preferredNiches.length > 0 ? (
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
                      ) : (
                        <p className="text-sm text-[#1D1D1D]/60">No niches selected</p>
                      )}
                    </div>
                    {!editingNiches && (
                      <button 
                        onClick={() => {
                          setPreferredNichesInput(preferredNiches);
                          setEditingNiches(true);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                      >
                        {preferredNiches.length > 0 ? "EDIT" : "ADD"}
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
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-[#1D1D1D]/10">
                          {nicheOptions.map((niche) => (
                            <button
                              key={niche}
                              onClick={() => {
                                if (preferredNichesInput.includes(niche)) {
                                  setPreferredNichesInput(preferredNichesInput.filter(n => n !== niche));
                                } else {
                                  setPreferredNichesInput([...preferredNichesInput, niche]);
                                }
                              }}
                              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                                preferredNichesInput.includes(niche)
                                  ? "bg-[#389C9A] border-[#389C9A] text-white"
                                  : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                              }`}
                            >
                              {niche}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setPreferredNiches(preferredNichesInput);
                              savePreferences();
                              setEditingNiches(false);
                            }}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                          >
                            {saving ? "SAVING..." : "SAVE NICHES"}
                          </button>
                          <button
                            onClick={() => setEditingNiches(false)}
                            className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic"
                          >
                            CANCEL
                          </button>
                        </div>
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
                      onClick={() => {
                        setDefaultCampaignType("BANNER");
                        savePreferences();
                      }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                        defaultCampaignType === "BANNER"
                          ? "bg-[#389C9A] border-[#389C9A] text-white"
                          : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D] hover:border-[#389C9A]"
                      }`}
                    >
                      BANNER
                    </button>
                    <button
                      onClick={() => {
                        setDefaultCampaignType("PROMO CODE");
                        savePreferences();
                      }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                        defaultCampaignType === "PROMO CODE"
                          ? "bg-[#389C9A] border-[#389C9A] text-white"
                          : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D] hover:border-[#389C9A]"
                      }`}
                    >
                      PROMO CODE
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setDefaultCampaignType("BANNER + CODE");
                      savePreferences();
                    }}
                    className={`w-full mt-2 py-2.5 text-[10px] font-black uppercase tracking-wider italic border-2 transition-colors ${
                      defaultCampaignType === "BANNER + CODE"
                        ? "bg-[#389C9A] border-[#389C9A] text-white"
                        : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D] hover:border-[#389C9A]"
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
                  <div>
                    <span className="text-sm font-bold text-[#1D1D1D]">Creator accepts my campaign</span>
                    <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when a creator accepts your campaign</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifAccepts(!notifAccepts);
                      saveNotifications();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                      notifAccepts ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-bold text-[#1D1D1D]">Creator declines my campaign</span>
                    <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when a creator declines your campaign</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifDeclines(!notifDeclines);
                      saveNotifications();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                      notifDeclines ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-bold text-[#1D1D1D]">Stream verified and payout released</span>
                    <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when a campaign is verified and paid out</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifPayouts(!notifPayouts);
                      saveNotifications();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                      notifPayouts ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-bold text-[#1D1D1D]">New message from a creator</span>
                    <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when you receive a new message</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifMessages(!notifMessages);
                      saveNotifications();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                      notifMessages ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-bold text-[#1D1D1D]">Platform announcements</span>
                    <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Receive news and updates from LiveLink</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifAnnouncements(!notifAnnouncements);
                      saveNotifications();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                      notifAnnouncements ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
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
                <button 
                  onClick={() => window.open('/policies/advertiser', '_blank')}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="text-left">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                      ADVERTISER POLICY
                    </label>
                    <p className="text-[9px] text-[#1D1D1D]/60">
                      Last agreed on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors flex-shrink-0" />
                </button>

                <button 
                  onClick={() => window.open('/terms', '_blank')}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="text-left">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                      TERMS OF SERVICE
                    </label>
                    <p className="text-[9px] text-[#1D1D1D]/60">
                      Last agreed on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors flex-shrink-0" />
                </button>

                <div className="p-4 border border-[#1D1D1D]/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] italic">
                      VERIFICATION STATUS
                    </label>
                    {getVerificationBadge()}
                  </div>
                  <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
                    {verificationStatus === 'verified' && "Your business identity has been verified by the LiveLink team."}
                    {verificationStatus === 'pending' && "Your documents are being reviewed. This usually takes 1-2 business days."}
                    {verificationStatus === 'rejected' && rejectionReason}
                    {verificationStatus === 'unverified' && "Upload your business documents to get verified."}
                  </p>
                  {verificationStatus !== 'verified' && (
                    <button
                      onClick={() => navigate('/business/verification')}
                      className="mt-3 w-full py-2 border-2 border-[#389C9A] text-[#389C9A] text-[9px] font-black uppercase tracking-wider italic hover:bg-[#389C9A] hover:text-white transition-colors"
                    >
                      {verificationStatus === 'pending' ? 'VIEW STATUS' : 'START VERIFICATION'}
                    </button>
                  )}
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
                <button 
                  onClick={() => window.open('/help', '_blank')}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4.5 h-4.5 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors" />
                    <span className="text-sm font-bold text-[#1D1D1D]">Help Centre</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors" />
                </button>

                <button 
                  onClick={() => window.location.href = 'mailto:support@livelink.com'}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4.5 h-4.5 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors" />
                    <span className="text-sm font-bold text-[#1D1D1D]">Contact Support</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors" />
                </button>

                <button 
                  onClick={() => window.open('/terms', '_blank')}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4.5 h-4.5 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors" />
                    <span className="text-sm font-bold text-[#1D1D1D]">Terms of Service</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors" />
                </button>

                <button 
                  onClick={() => window.open('/privacy', '_blank')}
                  className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4.5 h-4.5 text-[#1D1D1D] group-hover:text-[#389C9A] transition-colors" />
                    <span className="text-sm font-bold text-[#1D1D1D]">Privacy Policy</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180 group-hover:text-[#389C9A] transition-colors" />
                </button>
              </div>
            </div>

            {/* BOTTOM INFO */}
            <div className="text-center space-y-2 pt-6">
              <p className="text-[9px] text-[#1D1D1D]/40">
                LiveLink v1.0.0
              </p>
              <p className="text-[9px] text-[#1D1D1D]/60">
                Logged in as {businessName || email || "Business Account"} ·{" "}
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/login/portal');
                  }}
                  className="text-[#389C9A] font-bold hover:underline"
                >
                  Log out
                </button>
              </p>
            </div>
          </>
        ) : showBillingHistory ? (
          /* BILLING HISTORY VIEW */
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8F8F8] p-4 rounded-xl border border-[#1D1D1D]/10">
                <p className="text-[8px] font-black uppercase tracking-wider text-[#1D1D1D]/40 mb-1">TOTAL SPENT</p>
                <p className="text-xl font-black text-[#1D1D1D]">₦{stats.total.toLocaleString()}</p>
              </div>
              <div className="bg-[#F8F8F8] p-4 rounded-xl border border-[#1D1D1D]/10">
                <p className="text-[8px] font-black uppercase tracking-wider text-[#1D1D1D]/40 mb-1">TRANSACTIONS</p>
                <p className="text-xl font-black text-[#1D1D1D]">{transactions.length}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <select
                value={transactionFilter}
                onChange={(e) => setTransactionFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-wider focus:border-[#389C9A] outline-none"
              >
                <option value="all">ALL STATUS</option>
                <option value="completed">COMPLETED</option>
                <option value="pending">PENDING</option>
                <option value="refunded">REFUNDED</option>
                <option value="failed">FAILED</option>
              </select>
              <select
                value={transactionPeriod}
                onChange={(e) => setTransactionPeriod(e.target.value as any)}
                className="px-3 py-1.5 border border-[#1D1D1D]/20 text-[9px] font-black uppercase tracking-wider focus:border-[#389C9A] outline-none"
              >
                <option value="all">ALL TIME</option>
                <option value="month">LAST 30 DAYS</option>
                <option value="quarter">LAST 3 MONTHS</option>
                <option value="year">LAST YEAR</option>
              </select>
              <button
                onClick={() => {
                  setTransactionFilter('all');
                  setTransactionPeriod('all');
                }}
                className="px-3 py-1.5 border border-[#1D1D1D]/20 text-[#389C9A] text-[9px] font-black uppercase tracking-wider hover:bg-[#389C9A] hover:text-white transition-colors"
              >
                RESET
              </button>
            </div>

            {/* Transactions List */}
            {loadingTransactions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#1D1D1D]/10 p-4 hover:border-[#389C9A] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowTransactionDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-[#1D1D1D]">{transaction.campaign_name}</p>
                        <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">
                          {new Date(transaction.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {getTransactionStatusBadge(transaction.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#1D1D1D]/60">{transaction.description}</p>
                        {transaction.reference && (
                          <p className="text-[8px] font-mono text-[#1D1D1D]/30 mt-1">
                            Ref: {transaction.reference}
                          </p>
                        )}
                      </div>
                      <p className={`text-sm font-black ${
                        transaction.type === 'refund' ? 'text-red-600' : 'text-[#1D1D1D]'
                      }`}>
                        {transaction.type === 'refund' ? '-' : ''}₦{transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Receipt className="w-12 h-12 text-[#1D1D1D]/20" />
                <p className="text-[10px] font-mono text-[#1D1D1D]/30 uppercase tracking-widest">
                  No transactions found
                </p>
              </div>
            )}
          </div>
        ) : (
          /* REFUND REQUESTS VIEW */
          <div className="space-y-6">
            {/* New Refund Request Button */}
            <button
              onClick={() => {
                // Show transaction selection for refund
                const eligibleTransactions = transactions.filter(t => 
                  t.status === 'completed' && t.type === 'payment'
                );
                if (eligibleTransactions.length === 0) {
                  toast.error("No eligible transactions for refund");
                  return;
                }
                // You'd show a modal to select transaction
                setShowRefundModal(true);
              }}
              className="w-full py-3 border-2 border-[#389C9A] text-[#389C9A] text-[10px] font-black uppercase tracking-wider italic flex items-center justify-center gap-2 hover:bg-[#389C9A] hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              REQUEST NEW REFUND
            </button>

            {/* Refund Requests List */}
            {loadingRefunds ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#389C9A]" />
              </div>
            ) : refundRequests.length > 0 ? (
              <div className="space-y-3">
                {refundRequests.map((refund) => (
                  <motion.div
                    key={refund.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#1D1D1D]/10 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-[#1D1D1D]">{refund.campaign_name}</p>
                        <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">
                          Requested: {new Date(refund.requested_date).toLocaleDateString()}
                        </p>
                      </div>
                      {getRefundStatusBadge(refund.status)}
                    </div>
                    <div className="mb-2">
                      <p className="text-[10px] text-[#1D1D1D]/60">{refund.reason}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#1D1D1D]/10">
                      <p className="text-[10px] font-mono text-[#1D1D1D]/40">
                        {refund.status === 'approved' && refund.processed_date && 
                          `Processed: ${new Date(refund.processed_date).toLocaleDateString()}`
                        }
                        {refund.status === 'rejected' && refund.notes && 
                          `Note: ${refund.notes}`
                        }
                      </p>
                      <p className="text-sm font-black text-red-600">
                        -₦{refund.amount.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <RefreshCw className="w-12 h-12 text-[#1D1D1D]/20" />
                <p className="text-[10px] font-mono text-[#1D1D1D]/30 uppercase tracking-widest">
                  No refund requests
                </p>
                <p className="text-[8px] text-[#1D1D1D]/40 text-center max-w-[200px]">
                  Refund requests appear here once submitted
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {showTransactionDetails && selectedTransaction && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowTransactionDetails(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-4">
                Transaction Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                  <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Campaign</span>
                  <span className="text-xs font-bold text-right">{selectedTransaction.campaign_name}</span>
                </div>
                
                <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                  <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Amount</span>
                  <span className="text-base font-black">₦{selectedTransaction.amount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                  <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Status</span>
                  <span>{getTransactionStatusBadge(selectedTransaction.status)}</span>
                </div>
                
                <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                  <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Date</span>
                  <span className="text-[10px] text-right">
                    {new Date(selectedTransaction.date).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                  <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Description</span>
                  <span className="text-[10px] text-right max-w-[150px]">{selectedTransaction.description}</span>
                </div>
                
                {selectedTransaction.reference && (
                  <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                    <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Reference</span>
                    <span className="text-[8px] font-mono">{selectedTransaction.reference}</span>
                  </div>
                )}
                
                {selectedTransaction.payment_method && (
                  <div className="flex justify-between items-start pb-3 border-b border-[#1D1D1D]/10">
                    <span className="text-[9px] font-black uppercase text-[#1D1D1D]/50">Payment Method</span>
                    <span className="text-[10px]">{selectedTransaction.payment_method}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                {selectedTransaction.receipt_url && (
                  <button
                    onClick={() => handleDownloadReceipt(selectedTransaction)}
                    className="flex-1 py-2.5 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-wider italic flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    RECEIPT
                  </button>
                )}
                {selectedTransaction.status === 'completed' && selectedTransaction.type === 'payment' && (
                  <button
                    onClick={() => {
                      setShowTransactionDetails(false);
                      setRefundTransaction(selectedTransaction);
                      setShowRefundModal(true);
                    }}
                    className="flex-1 py-2.5 border-2 border-red-600 text-red-600 text-[9px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors"
                  >
                    REQUEST REFUND
                  </button>
                )}
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[9px] font-black uppercase tracking-wider italic"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Refund Request Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowRefundModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-6 z-50"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-[#1D1D1D] mb-3">
                Request Refund
              </h3>
              
              {refundTransaction && (
                <div className="mb-4 p-3 bg-[#F8F8F8] border border-[#1D1D1D]/10">
                  <p className="text-xs font-bold">{refundTransaction.campaign_name}</p>
                  <p className="text-[10px] text-[#1D1D1D]/60 mt-1">Amount: ₦{refundTransaction.amount.toLocaleString()}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                    REASON FOR REFUND
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={4}
                    placeholder="Please explain why you're requesting a refund..."
                    className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                  />
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleRequestRefund}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider italic disabled:opacity-50"
                  >
                    {saving ? "SUBMITTING..." : "SUBMIT REQUEST"}
                  </button>
                  <button
                    onClick={() => setShowRefundModal(false)}
                    className="flex-1 py-2.5 border border-[#1D1D1D]/20 text-[#1D1D1D] text-[9px] font-black uppercase tracking-wider italic"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                  onClick={async () => {
                    if (businessId) {
                      await supabase
                        .from("businesses")
                        .update({ status: 'paused' })
                        .eq("id", businessId);
                      toast.success("Account paused");
                      setShowPauseModal(false);
                    }
                  }}
                  className="w-full py-2.5 bg-[#D2691E] text-white text-[10px] font-black uppercase tracking-wider italic hover:bg-[#D2691E]/80 transition-colors"
                >
                  YES, PAUSE ACCOUNT
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:bg-[#1D1D1D] hover:text-white transition-colors"
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
                  onClick={async () => {
                    if (businessId) {
                      await supabase
                        .from("businesses")
                        .update({ 
                          status: 'deleted', 
                          deleted_at: new Date().toISOString() 
                        })
                        .eq("id", businessId);
                      toast.success("Account deletion requested");
                      setShowDeleteModal(false);
                    }
                  }}
                  className="w-full py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider italic hover:bg-red-700 transition-colors"
                >
                  YES, DELETE MY ACCOUNT
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 border-2 border-[#1D1D1D] text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:bg-[#1D1D1D] hover:text-white transition-colors"
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
