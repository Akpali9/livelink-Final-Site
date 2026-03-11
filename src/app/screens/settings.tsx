import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Mail, 
  HelpCircle, 
  FileText, 
  Shield, 
  Info,
  User,
  Globe,
  Twitch,
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Bell,
  DollarSign,
  Tag,
  Users,
  Star,
  Clock,
  Calendar,
  Settings as SettingsIcon,
  ArrowLeft,
  Phone,
  Building,
  MapPin,
  Link as LinkIcon,
  Trash2,
  Save,
  Upload,
  CreditCard,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { AppHeader } from "../components/app-header";

interface CreatorProfile {
  bio: string;
  niches: string[];
  platforms: {
    id?: string;
    name: string;
    handle: string;
    url?: string;
    followers?: number;
  }[];
  gigs: {
    id?: string;
    name: string;
    streams: number;
    price: number;
    description: string;
    enabled: boolean;
    is_default?: boolean;
  }[];
  notification_preferences: {
    campaigns: boolean;
    messages: boolean;
    payments: boolean;
    announcements: boolean;
  };
  phone_number: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  verification_status?: 'verified' | 'pending' | 'unverified' | 'rejected';
  payment_methods?: PaymentMethod[];
  bank_details?: BankDetails;
  stats?: {
    total_earnings: number;
    total_campaigns: number;
    avg_rating: number;
    completed_streams: number;
  };
}

interface PaymentMethod {
  id: string;
  card_type: string;
  last4: string;
  expiry: string;
  is_default: boolean;
  cardholder_name?: string;
}

interface BankDetails {
  id?: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string;
  currency: string;
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
}

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_date: string;
  processed_date?: string;
  bank_details: string;
}

export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  
  // Account section state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingFullName, setEditingFullName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

  // Profile section state
  const [editingBio, setEditingBio] = useState(false);
  const [editingNiche, setEditingNiche] = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  
  const [bio, setBio] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [nichesInput, setNichesInput] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<{ id?: string; name: string; handle: string; url?: string }[]>([]);
  const [location, setLocation] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteInput, setWebsiteInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Gig pricing state
  const [editingGig, setEditingGig] = useState<number | null>(null);
  const [gigs, setGigs] = useState<{
    id?: string;
    name: string;
    streams: number;
    price: number;
    description: string;
    enabled: boolean;
    is_default?: boolean;
  }[]>([
    {
      name: "Bronze Package",
      streams: 4,
      price: 15000,
      description: "Perfect for testing the partnership",
      enabled: true,
      is_default: true
    },
    {
      name: "Silver Package",
      streams: 8,
      price: 28000,
      description: "Best value for ongoing campaigns",
      enabled: true
    },
    {
      name: "Gold Package",
      streams: 12,
      price: 40000,
      description: "Maximum exposure for premium brands",
      enabled: false
    }
  ]);

  // Payment & Payouts state
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [newCard, setNewCard] = useState({
    card_number: "",
    cardholder_name: "",
    expiry: "",
    cvv: ""
  });
  const [bankInput, setBankInput] = useState<BankDetails>({
    account_name: "",
    account_number: "",
    bank_name: "",
    currency: "NGN"
  });

  // Transactions & Payouts
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);

  // Notifications state
  const [notifCampaigns, setNotifCampaigns] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total_earnings: 0,
    total_campaigns: 0,
    avg_rating: 0,
    completed_streams: 0
  });

  // Verification status
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'unverified' | 'rejected'>('unverified');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const nicheOptions = [
    "Gaming", "Tech Reviews", "Lifestyle", "Fashion", "Beauty",
    "Fitness", "Food & Cooking", "Travel", "Music", "Education",
    "Business", "Sports", "Comedy", "Art & Design", "DIY & Crafts"
  ];

  const platformOptions = [
    { name: "Twitch", icon: Twitch },
    { name: "YouTube", icon: Youtube },
    { name: "Instagram", icon: Instagram },
    { name: "Twitter", icon: Twitter },
    { name: "Facebook", icon: Facebook },
    { name: "TikTok", icon: () => <span className="text-sm">TikTok</span> },
    { name: "Kick", icon: () => <span className="text-sm">Kick</span> },
    { name: "Rumble", icon: () => <span className="text-sm">Rumble</span> }
  ];

  // Fetch creator profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch creator profile
        const { data: profile, error } = await supabase
          .from("creator_profiles")
          .select(`
            *,
            platforms:creator_platforms(*),
            gigs:creator_gigs(*),
            payment_methods:creator_payment_methods(*),
            bank_details:creator_bank_details(*)
          `)
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile:", error);
        }

        if (profile) {
          setCreatorId(profile.id);
          setEmail(profile.email || user.email || "");
          setFullName(profile.full_name || "");
          setUsername(profile.username || "");
          setPhoneNumber(profile.phone_number || "");
          setBio(profile.bio || "");
          setSelectedNiches(profile.niches || []);
          setLocation(profile.location || "");
          setWebsite(profile.website || "");
          setAvatarUrl(profile.avatar_url || "");
          setVerificationStatus(profile.verification_status || 'unverified');
          
          if (profile.platforms && profile.platforms.length > 0) {
            setPlatforms(profile.platforms.map((p: any) => ({
              id: p.id,
              name: p.platform_type,
              handle: p.username,
              url: p.profile_url,
              followers: p.followers
            })));
          }

          if (profile.gigs && profile.gigs.length > 0) {
            setGigs(profile.gigs.map((g: any) => ({
              id: g.id,
              name: g.name,
              streams: g.streams,
              price: g.price,
              description: g.description,
              enabled: g.enabled,
              is_default: g.is_default
            })));
          }

          if (profile.payment_methods) {
            setPaymentMethods(profile.payment_methods);
          }

          if (profile.bank_details && profile.bank_details.length > 0) {
            setBankDetails(profile.bank_details[0]);
            setBankInput(profile.bank_details[0]);
          }

          if (profile.notification_preferences) {
            setNotifCampaigns(profile.notification_preferences.campaigns ?? true);
            setNotifMessages(profile.notification_preferences.messages ?? true);
            setNotifPayments(profile.notification_preferences.payments ?? true);
            setNotifAnnouncements(profile.notification_preferences.announcements ?? false);
          }

          if (profile.stats) {
            setStats(profile.stats);
          }

          // Fetch transactions
          await fetchTransactions(profile.id);
          
          // Fetch payout requests
          await fetchPayoutRequests(profile.id);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch transactions
  const fetchTransactions = async (id: string) => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("creator_transactions")
        .select("*")
        .eq("creator_id", id)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch payout requests
  const fetchPayoutRequests = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("creator_id", id)
        .order("requested_date", { ascending: false });

      if (error) throw error;
      setPayoutRequests(data || []);
    } catch (error) {
      console.error("Error fetching payouts:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
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

      await supabase
        .from("creator_profiles")
        .update({ email: newEmail })
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
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ phone_number: phoneInput })
        .eq("user_id", user?.id);

      setPhoneNumber(phoneInput);
      setEditingPhone(false);
      toast.success("Phone number updated");
    } catch (error) {
      toast.error("Failed to update phone number");
    } finally {
      setSaving(false);
    }
  };

  // Handle full name update
  const handleUpdateFullName = async () => {
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ full_name: fullNameInput })
        .eq("user_id", user?.id);

      setFullName(fullNameInput);
      setEditingFullName(false);
      toast.success("Name updated");
    } catch (error) {
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  // Handle username update
  const handleUpdateUsername = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("creator_profiles")
        .select("username")
        .eq("username", usernameInput)
        .neq("user_id", user?.id)
        .single();

      if (existing) {
        toast.error("Username already taken");
        return;
      }

      await supabase
        .from("creator_profiles")
        .update({ username: usernameInput })
        .eq("user_id", user?.id);

      setUsername(usernameInput);
      setEditingUsername(false);
      toast.success("Username updated");
    } catch (error) {
      toast.error("Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  // Handle bio update
  const handleSaveBio = async () => {
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ bio: bioInput })
        .eq("user_id", user?.id);

      setBio(bioInput);
      setEditingBio(false);
      toast.success("Bio updated");
    } catch (error) {
      toast.error("Failed to update bio");
    } finally {
      setSaving(false);
    }
  };

  // Handle niches update
  const handleSaveNiche = async () => {
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ niches: selectedNiches })
        .eq("user_id", user?.id);

      setEditingNiche(false);
      toast.success("Niches updated");
    } catch (error) {
      toast.error("Failed to update niches");
    } finally {
      setSaving(false);
    }
  };

  // Handle location update
  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ location: locationInput })
        .eq("user_id", user?.id);

      setLocation(locationInput);
      setEditingLocation(false);
      toast.success("Location updated");
    } catch (error) {
      toast.error("Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  // Handle website update
  const handleSaveWebsite = async () => {
    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({ website: websiteInput })
        .eq("user_id", user?.id);

      setWebsite(websiteInput);
      setEditingWebsite(false);
      toast.success("Website updated");
    } catch (error) {
      toast.error("Failed to update website");
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(filePath);

      await supabase
        .from("creator_profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);

      setAvatarUrl(urlData.publicUrl);
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      setEditingAvatar(false);
    }
  };

  // Handle platforms update
  const handleSavePlatforms = async () => {
    if (!creatorId) return;

    setSaving(true);
    try {
      // Delete existing platforms not in the list
      const existingIds = platforms.filter(p => p.id).map(p => p.id);
      const { data: currentPlatforms } = await supabase
        .from("creator_platforms")
        .select("id")
        .eq("creator_id", creatorId);

      if (currentPlatforms) {
        const toDelete = currentPlatforms
          .filter(p => !existingIds.includes(p.id))
          .map(p => p.id);
        
        if (toDelete.length > 0) {
          await supabase
            .from("creator_platforms")
            .delete()
            .in("id", toDelete);
        }
      }

      // Upsert platforms
      for (const platform of platforms) {
        if (platform.id) {
          await supabase
            .from("creator_platforms")
            .update({
              platform_type: platform.name,
              username: platform.handle,
              profile_url: platform.url
            })
            .eq("id", platform.id);
        } else {
          await supabase
            .from("creator_platforms")
            .insert({
              creator_id: creatorId,
              platform_type: platform.name,
              username: platform.handle,
              profile_url: platform.url
            });
        }
      }

      setEditingPlatforms(false);
      toast.success("Platforms updated");
    } catch (error) {
      toast.error("Failed to update platforms");
    } finally {
      setSaving(false);
    }
  };

  // Handle remove platform
  const handleRemovePlatform = async (index: number) => {
    const platform = platforms[index];
    if (platform.id) {
      await supabase
        .from("creator_platforms")
        .delete()
        .eq("id", platform.id);
    }
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  // Handle add platform
  const handleAddPlatform = () => {
    setPlatforms([...platforms, { name: "Twitch", handle: "" }]);
  };

  // Handle update platform
  const handleUpdatePlatform = (index: number, field: 'name' | 'handle' | 'url', value: string) => {
    const newPlatforms = [...platforms];
    newPlatforms[index][field] = value;
    setPlatforms(newPlatforms);
  };

  // Handle gig update
  const handleSaveGig = async (index: number) => {
    if (!creatorId) return;

    const gig = gigs[index];
    setSaving(true);
    try {
      if (gig.id) {
        await supabase
          .from("creator_gigs")
          .update({
            name: gig.name,
            streams: gig.streams,
            price: gig.price,
            description: gig.description,
            enabled: gig.enabled
          })
          .eq("id", gig.id);
      } else {
        await supabase
          .from("creator_gigs")
          .insert({
            creator_id: creatorId,
            name: gig.name,
            streams: gig.streams,
            price: gig.price,
            description: gig.description,
            enabled: gig.enabled,
            is_default: gig.is_default || false
          });
      }
      setEditingGig(null);
      toast.success(`${gig.name} saved`);
    } catch (error) {
      toast.error("Failed to save gig");
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle gig
  const handleToggleGig = async (index: number) => {
    const newGigs = [...gigs];
    newGigs[index].enabled = !newGigs[index].enabled;
    setGigs(newGigs);

    if (newGigs[index].id) {
      await supabase
        .from("creator_gigs")
        .update({ enabled: newGigs[index].enabled })
        .eq("id", newGigs[index].id);
    }
  };

  // Handle update gig
  const handleUpdateGig = (index: number, field: string, value: any) => {
    const newGigs = [...gigs];
    (newGigs[index] as any)[field] = value;
    setGigs(newGigs);
  };

  // Handle add card
  const handleAddCard = async () => {
    if (!creatorId) return;

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
        .from("creator_payment_methods")
        .insert({
          creator_id: creatorId,
          card_type: cardType,
          last4: last4,
          expiry: newCard.expiry,
          cardholder_name: newCard.cardholder_name,
          is_default: paymentMethods.length === 0
        });

      if (error) throw error;

      // Refresh payment methods
      const { data } = await supabase
        .from("creator_payment_methods")
        .select("*")
        .eq("creator_id", creatorId);

      if (data) {
        setPaymentMethods(data);
      }

      setShowAddCard(false);
      setNewCard({ card_number: "", cardholder_name: "", expiry: "", cvv: "" });
      toast.success("Card added");
    } catch (error) {
      toast.error("Failed to add card");
    } finally {
      setSaving(false);
    }
  };

  // Handle remove card
  const handleRemoveCard = async (cardId: string) => {
    if (!confirm("Remove this card?")) return;

    try {
      await supabase
        .from("creator_payment_methods")
        .delete()
        .eq("id", cardId);

      setPaymentMethods(prev => prev.filter(c => c.id !== cardId));
      toast.success("Card removed");
    } catch (error) {
      toast.error("Failed to remove card");
    }
  };

  // Handle set default card
  const handleSetDefaultCard = async (cardId: string) => {
    if (!creatorId) return;

    try {
      await supabase
        .from("creator_payment_methods")
        .update({ is_default: false })
        .eq("creator_id", creatorId);

      await supabase
        .from("creator_payment_methods")
        .update({ is_default: true })
        .eq("id", cardId);

      setPaymentMethods(prev => prev.map(c => ({
        ...c,
        is_default: c.id === cardId
      })));

      toast.success("Default card updated");
    } catch (error) {
      toast.error("Failed to update default card");
    }
  };

  // Handle save bank details
  const handleSaveBankDetails = async () => {
    if (!creatorId) return;

    if (!bankInput.account_name || !bankInput.account_number || !bankInput.bank_name) {
      toast.error("Please fill in all bank details");
      return;
    }

    setSaving(true);
    try {
      if (bankDetails?.id) {
        await supabase
          .from("creator_bank_details")
          .update(bankInput)
          .eq("id", bankDetails.id);
      } else {
        const { error } = await supabase
          .from("creator_bank_details")
          .insert({
            ...bankInput,
            creator_id: creatorId
          });

        if (error) throw error;
      }

      setBankDetails(bankInput);
      setShowBankDetails(false);
      toast.success("Bank details saved");
    } catch (error) {
      toast.error("Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  // Handle request payout
  const handleRequestPayout = async () => {
    if (!creatorId || !bankDetails) {
      toast.error("Please add bank details first");
      return;
    }

    if (payoutAmount < 1000) {
      toast.error("Minimum payout is ₦1,000");
      return;
    }

    if (payoutAmount > stats.total_earnings) {
      toast.error("Insufficient balance");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("payout_requests")
        .insert({
          creator_id: creatorId,
          amount: payoutAmount,
          currency: "NGN",
          status: "pending",
          requested_date: new Date().toISOString(),
          bank_details: `${bankDetails.bank_name} - ${bankDetails.account_number}`
        });

      if (error) throw error;

      setShowRequestPayout(false);
      setPayoutAmount(0);
      await fetchPayoutRequests(creatorId);
      toast.success("Payout requested");
    } catch (error) {
      toast.error("Failed to request payout");
    } finally {
      setSaving(false);
    }
  };

  // Handle save all settings
  const handleSaveAll = async () => {
    if (!creatorId) return;

    setSaving(true);
    try {
      await supabase
        .from("creator_profiles")
        .update({
          notification_preferences: {
            campaigns: notifCampaigns,
            messages: notifMessages,
            payments: notifPayments,
            announcements: notifAnnouncements
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", creatorId);

      toast.success("All settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getPlatformIcon = (platformName: string) => {
    const platform = platformOptions.find(p => p.name === platformName);
    if (!platform) return <Globe className="w-4 h-4" />;
    
    if (typeof platform.icon === 'function') {
      return platform.icon();
    }
    const Icon = platform.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-[8px] font-black rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> VERIFIED
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-[8px] font-black rounded-full">REJECTED</span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[8px] font-black rounded-full">UNVERIFIED</span>
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

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full">COMPLETED</span>;
      case 'processing':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded-full">PROCESSING</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full">PENDING</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded-full">FAILED</span>;
      default:
        return null;
    }
  };

  const truncateBio = (text: string, lines: number = 2) => {
    const words = text.split(" ");
    if (words.length <= 15) return text;
    return bioExpanded ? text : words.slice(0, 15).join(" ") + "...";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showBack title="Settings" userType="creator" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#389C9A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 max-w-md mx-auto relative">
      <AppHeader showBack title="Settings" userType="creator" />

      {/* MAIN CONTENT */}
      <div className="mt-14 px-4 py-6 space-y-8">
        
        {/* SECTION 1: ACCOUNT */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT
          </h2>

          <div className="space-y-6">
            {/* Full Name */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    FULL NAME
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {fullName || "Not set"}
                  </p>
                </div>
                {!editingFullName && (
                  <button 
                    onClick={() => {
                      setFullNameInput(fullName);
                      setEditingFullName(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {fullName ? "CHANGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingFullName && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <input
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateFullName}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "UPDATE NAME"}
                    </button>
                    <button
                      onClick={() => setEditingFullName(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Username */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    USERNAME
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {username ? `@${username}` : "Not set"}
                  </p>
                </div>
                {!editingUsername && (
                  <button 
                    onClick={() => {
                      setUsernameInput(username);
                      setEditingUsername(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {username ? "CHANGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingUsername && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1D1D1D]/40">@</span>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="username"
                        className="w-full pl-8 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleUpdateUsername}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "UPDATE USERNAME"}
                    </button>
                    <button
                      onClick={() => setEditingUsername(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
          </div>
        </div>

        {/* SECTION 2: PROFILE */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            PROFILE
          </h2>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                  PROFILE PICTURE
                </label>
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#389C9A] object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1D1D1D]/5 border-2 border-dashed border-[#1D1D1D]/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#1D1D1D]/30" />
                    </div>
                  )}
                  {!editingAvatar && (
                    <button 
                      onClick={() => setEditingAvatar(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                    >
                      {avatarUrl ? "CHANGE" : "ADD"}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {editingAvatar && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="border-2 border-dashed border-[#1D1D1D]/20 p-8 text-center">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="w-8 h-8 text-[#1D1D1D]/40 mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#1D1D1D] mb-1">
                          {uploadingAvatar ? "UPLOADING..." : "Tap to upload image"}
                        </p>
                        <p className="text-[9px] text-[#1D1D1D]/50">Square image recommended · Max 2MB</p>
                      </label>
                    </div>
                    <button
                      onClick={() => setEditingAvatar(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bio */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    YOUR BIO
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60 leading-relaxed">
                    {bio ? truncateBio(bio) : "No bio set"}
                    {bio && bio.split(" ").length > 15 && !editingBio && (
                      <button 
                        onClick={() => setBioExpanded(!bioExpanded)}
                        className="ml-1 text-[#389C9A] text-xs font-bold"
                      >
                        {bioExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </p>
                </div>
                {!editingBio && (
                  <button 
                    onClick={() => {
                      setBioInput(bio);
                      setEditingBio(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    {bio ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingBio && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <textarea
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value.slice(0, 200))}
                        rows={4}
                        maxLength={200}
                        placeholder="Tell businesses about yourself, your content, and what makes you unique..."
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none resize-none"
                      />
                      <div className="text-right text-[9px] font-bold text-[#1D1D1D]/40 mt-1">
                        {bioInput.length}/200
                      </div>
                    </div>
                    <button
                      onClick={handleSaveBio}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : bio ? "SAVE BIO" : "ADD BIO"}
                    </button>
                    <button
                      onClick={() => setEditingBio(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Location */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    LOCATION
                  </label>
                  <p className="text-sm text-[#1D1D1D]/60">
                    {location || "Not set"}
                  </p>
                </div>
                {!editingLocation && (
                  <button 
                    onClick={() => {
                      setLocationInput(location);
                      setEditingLocation(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic"
                  >
                    {location ? "EDIT" : "ADD"}
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
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="City, Country"
                        className="w-full pl-10 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveLocation}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "UPDATE LOCATION"}
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

            {/* Website */}
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
                      {saving ? "SAVING..." : "UPDATE WEBSITE"}
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

            {/* Content Niche */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    CONTENT NICHE
                  </label>
                  {selectedNiches.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedNiches.map((niche, index) => (
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
                {!editingNiche && (
                  <button 
                    onClick={() => {
                      setNichesInput(selectedNiches);
                      setEditingNiche(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    {selectedNiches.length > 0 ? "EDIT" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingNiche && (
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
                            if (selectedNiches.includes(niche)) {
                              setSelectedNiches(selectedNiches.filter(n => n !== niche));
                            } else if (selectedNiches.length < 3) {
                              setSelectedNiches([...selectedNiches, niche]);
                            }
                          }}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider italic border transition-colors ${
                            selectedNiches.includes(niche)
                              ? "bg-[#389C9A] border-[#389C9A] text-white"
                              : "bg-white border-[#1D1D1D]/20 text-[#1D1D1D]"
                          }`}
                        >
                          {niche}
                        </button>
                      ))}
                    </div>
                    <p className="text-[8px] text-[#1D1D1D]/50 italic">
                      Select up to 3 niches
                    </p>
                    <button
                      onClick={handleSaveNiche}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE NICHES"}
                    </button>
                    <button
                      onClick={() => setEditingNiche(false)}
                      className="w-full text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/50 italic"
                    >
                      CANCEL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Verification Status */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] italic">
                  VERIFICATION STATUS
                </label>
                {getVerificationBadge()}
              </div>
              <p className="text-[9px] text-[#1D1D1D]/60 leading-relaxed">
                {verificationStatus === 'verified' && "Your identity has been verified. You can now receive higher payouts."}
                {verificationStatus === 'pending' && "Your documents are being reviewed. This usually takes 1-2 business days."}
                {verificationStatus === 'rejected' && "Your verification was rejected. Please contact support."}
                {verificationStatus === 'unverified' && "Verify your identity to unlock higher payout limits."}
              </p>
              {verificationStatus !== 'verified' && (
                <button
                  onClick={() => navigate('/creator/verification')}
                  className="mt-3 w-full py-2 border-2 border-[#389C9A] text-[#389C9A] text-[9px] font-black uppercase tracking-wider italic hover:bg-[#389C9A] hover:text-white transition-colors"
                >
                  {verificationStatus === 'pending' ? 'VIEW STATUS' : 'START VERIFICATION'}
                </button>
              )}
            </div>

            {/* Streaming Platforms */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-2 italic">
                    YOUR PLATFORMS
                  </label>
                  {platforms.length > 0 ? (
                    <div className="space-y-2">
                      {platforms.map((platform, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#1D1D1D] rounded flex items-center justify-center text-white">
                            {getPlatformIcon(platform.name)}
                          </div>
                          <span className="text-xs font-bold text-[#1D1D1D]">{platform.name}</span>
                          <span className="text-xs text-[#1D1D1D]/60">{platform.handle}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#1D1D1D]/60">No platforms added</p>
                  )}
                </div>
                {!editingPlatforms && (
                  <button 
                    onClick={() => setEditingPlatforms(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#389C9A] italic ml-3"
                  >
                    {platforms.length > 0 ? "MANAGE" : "ADD"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {editingPlatforms && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {platforms.map((platform, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border border-[#1D1D1D]/10">
                        <select
                          value={platform.name}
                          onChange={(e) => handleUpdatePlatform(index, 'name', e.target.value)}
                          className="px-2 py-1 border border-[#1D1D1D]/10 text-[9px] font-black uppercase tracking-wider outline-none"
                        >
                          {platformOptions.map(opt => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={platform.handle}
                          onChange={(e) => handleUpdatePlatform(index, 'handle', e.target.value)}
                          placeholder="@username"
                          className="flex-1 px-2 py-1 border border-[#1D1D1D]/10 text-sm focus:border-[#389C9A] outline-none"
                        />
                        <button
                          onClick={() => handleRemovePlatform(index)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddPlatform}
                      className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:border-[#389C9A] transition-colors"
                    >
                      + ADD PLATFORM
                    </button>
                    <button
                      onClick={handleSavePlatforms}
                      disabled={saving}
                      className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "SAVE PLATFORMS"}
                    </button>
                    <button
                      onClick={() => setEditingPlatforms(false)}
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

        {/* SECTION 3: GIG PRICING */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-2 italic">
            GIG PRICING
          </h2>
          <p className="text-[9px] text-[#1D1D1D]/60 mb-4 leading-relaxed">
            Set up to 3 pricing tiers for your gigs. Each tier is priced per 4 live streams minimum. Businesses will see these when viewing your profile.
          </p>

          <div className="space-y-4">
            {gigs.map((gig, index) => (
              <div key={index} className={`border-2 p-4 ${gig.enabled ? 'border-[#1D1D1D]/10' : 'border-[#1D1D1D]/5 bg-[#1D1D1D]/2'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1D1D1D] italic">
                    {gig.name || `GIG ${index + 1}`}
                  </h3>
                  <div className="flex items-center gap-2">
                    {gig.is_default && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#389C9A] italic">
                        DEFAULT
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleGig(index)}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                        gig.enabled ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                      }`}>
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </button>
                  </div>
                </div>

                {gig.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        PACKAGE NAME
                      </label>
                      <input
                        type="text"
                        value={gig.name}
                        onChange={(e) => handleUpdateGig(index, 'name', e.target.value)}
                        placeholder="e.g. Bronze Package"
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        NUMBER OF LIVE STREAMS
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateGig(index, 'streams', Math.max(4, gig.streams - 1))}
                          className="w-10 h-10 border-2 border-[#1D1D1D] flex items-center justify-center text-lg font-black hover:bg-[#1D1D1D] hover:text-white transition-colors"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center text-2xl font-black italic text-[#1D1D1D]">
                          {gig.streams}
                        </div>
                        <button
                          onClick={() => handleUpdateGig(index, 'streams', gig.streams + 1)}
                          className="w-10 h-10 border-2 border-[#1D1D1D] flex items-center justify-center text-lg font-black hover:bg-[#1D1D1D] hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-1 italic">
                        Minimum 4 live streams per package
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        YOUR PRICE (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-[#1D1D1D]">
                          ₦
                        </span>
                        <input
                          type="number"
                          value={gig.price}
                          onChange={(e) => handleUpdateGig(index, 'price', parseInt(e.target.value) || 0)}
                          placeholder="Enter your price"
                          className="w-full pl-8 pr-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-[#1D1D1D]/50 mt-1 italic">
                        This is what you charge per package — not per stream.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        PACKAGE DESCRIPTION
                      </label>
                      <input
                        type="text"
                        value={gig.description}
                        onChange={(e) => handleUpdateGig(index, 'description', e.target.value.slice(0, 60))}
                        placeholder="e.g. Great for testing the partnership"
                        maxLength={60}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#1D1D1D]/10">
                      <button
                        onClick={() => handleSaveGig(index)}
                        disabled={saving}
                        className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                      >
                        {saving ? "SAVING..." : "SAVE GIG"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pricing Note */}
            <div className="border border-[#389C9A]/30 bg-[#389C9A]/5 p-4 flex gap-3">
              <Info className="w-4 h-4 text-[#389C9A] flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-[#1D1D1D]/70 leading-relaxed">
                Your pricing is reviewed by our team. Prices that do not reflect your viewer tier may be flagged. Minimum price per 4 streams is ₦5,000.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: PAYMENTS & PAYOUTS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            PAYMENTS & PAYOUTS
          </h2>

          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8F8F8] p-4 rounded-xl border border-[#1D1D1D]/10">
                <p className="text-[8px] font-black uppercase tracking-wider text-[#1D1D1D]/40 mb-1">TOTAL EARNED</p>
                <p className="text-xl font-black text-[#1D1D1D]">₦{stats.total_earnings.toLocaleString()}</p>
              </div>
              <div className="bg-[#F8F8F8] p-4 rounded-xl border border-[#1D1D1D]/10">
                <p className="text-[8px] font-black uppercase tracking-wider text-[#1D1D1D]/40 mb-1">COMPLETED</p>
                <p className="text-xl font-black text-[#1D1D1D]">{stats.completed_streams}</p>
                <p className="text-[8px] text-[#1D1D1D]/40">streams</p>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button 
                onClick={() => setShowPaymentMethods(!showPaymentMethods)}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    PAYMENT METHODS
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    {paymentMethods.length} saved card{paymentMethods.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1D1D1D] transition-transform ${showPaymentMethods ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showPaymentMethods && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {paymentMethods.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 border border-[#1D1D1D]/10">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-[#389C9A]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold">{card.card_type} •••• {card.last4}</p>
                              {card.is_default && (
                                <span className="px-2 py-0.5 bg-[#389C9A]/10 text-[#389C9A] text-[8px] font-black rounded-full">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-[#1D1D1D]/60">Expires {card.expiry}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!card.is_default && (
                            <button
                              onClick={() => handleSetDefaultCard(card.id)}
                              className="text-[8px] font-black uppercase tracking-wider text-[#389C9A] hover:underline"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveCard(card.id)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setShowAddCard(!showAddCard)}
                      className="w-full py-2.5 border-2 border-dashed border-[#1D1D1D]/20 text-[#1D1D1D] text-[10px] font-black uppercase tracking-wider italic hover:border-[#389C9A] transition-colors"
                    >
                      + ADD NEW CARD
                    </button>

                    <AnimatePresence>
                      {showAddCard && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 space-y-3 overflow-hidden"
                        >
                          <div className="border border-[#1D1D1D]/20 p-4 bg-[#F8F8F8]">
                            <p className="text-xs font-bold mb-3">Enter card details</p>
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
                              ADD CARD
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bank Details */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button 
                onClick={() => setShowBankDetails(!showBankDetails)}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    BANK DETAILS
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    {bankDetails ? `${bankDetails.bank_name} - ${bankDetails.account_number}` : 'Not set'}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1D1D1D] transition-transform ${showBankDetails ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showBankDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {bankDetails && (
                      <div className="p-3 bg-[#F8F8F8] border border-[#1D1D1D]/10">
                        <p className="text-xs font-bold mb-2">Current Bank Account</p>
                        <p className="text-sm">{bankDetails.account_name}</p>
                        <p className="text-[10px] text-[#1D1D1D]/60">{bankDetails.bank_name} - {bankDetails.account_number}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={bankInput.account_name}
                        onChange={(e) => setBankInput({...bankInput, account_name: e.target.value})}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={bankInput.account_number}
                        onChange={(e) => setBankInput({...bankInput, account_number: e.target.value})}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={bankInput.bank_name}
                        onChange={(e) => setBankInput({...bankInput, bank_name: e.target.value})}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                      <button
                        onClick={handleSaveBankDetails}
                        disabled={saving}
                        className="w-full py-2.5 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                      >
                        {saving ? "SAVING..." : "SAVE BANK DETAILS"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Request Payout */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button 
                onClick={() => setShowRequestPayout(!showRequestPayout)}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    REQUEST PAYOUT
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    Available balance: ₦{stats.total_earnings.toLocaleString()}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1D1D1D] transition-transform ${showRequestPayout ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showRequestPayout && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div className="bg-amber-50 border border-amber-200 p-3">
                      <p className="text-[9px] text-amber-700">
                        Payouts are processed within 3-5 business days. Minimum payout is ₦1,000.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-[#1D1D1D]/70 mb-1 italic">
                        AMOUNT TO WITHDRAW (₦)
                      </label>
                      <input
                        type="number"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(Number(e.target.value))}
                        placeholder="Enter amount"
                        min={1000}
                        max={stats.total_earnings}
                        className="w-full px-3 py-2 border border-[#1D1D1D]/20 text-sm focus:border-[#389C9A] outline-none"
                      />
                    </div>

                    {bankDetails ? (
                      <div className="p-3 bg-[#F8F8F8] border border-[#1D1D1D]/10">
                        <p className="text-[9px] font-bold mb-1">Transfer to:</p>
                        <p className="text-xs">{bankDetails.account_name}</p>
                        <p className="text-[9px] text-[#1D1D1D]/60">{bankDetails.bank_name} - {bankDetails.account_number}</p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-red-500">Please add bank details first</p>
                    )}

                    <button
                      onClick={handleRequestPayout}
                      disabled={saving || !bankDetails || payoutAmount < 1000 || payoutAmount > stats.total_earnings}
                      className="w-full py-2.5 bg-[#389C9A] text-white text-[10px] font-black uppercase tracking-wider italic disabled:opacity-50"
                    >
                      {saving ? "PROCESSING..." : "REQUEST PAYOUT"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payout History */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button 
                onClick={() => setShowPayoutHistory(!showPayoutHistory)}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    PAYOUT HISTORY
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    {payoutRequests.length} payout request{payoutRequests.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1D1D1D] transition-transform ${showPayoutHistory ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showPayoutHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {payoutRequests.length > 0 ? (
                      payoutRequests.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-3 border border-[#1D1D1D]/10">
                          <div>
                            <p className="text-sm font-bold">₦{payout.amount.toLocaleString()}</p>
                            <p className="text-[8px] text-[#1D1D1D]/40">
                              {new Date(payout.requested_date).toLocaleDateString()}
                            </p>
                          </div>
                          {getPayoutStatusBadge(payout.status)}
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] text-[#1D1D1D]/40 text-center py-4">No payout requests yet</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transaction History */}
            <div className="border-b border-[#1D1D1D]/10 pb-4">
              <button 
                onClick={() => {
                  setShowPaymentMethods(false);
                  setShowBankDetails(false);
                  setShowRequestPayout(false);
                  setShowPayoutHistory(false);
                  setShowTransactionDetails(!showTransactionDetails);
                }}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#1D1D1D] mb-1 italic">
                    TRANSACTION HISTORY
                  </label>
                  <p className="text-[9px] text-[#1D1D1D]/60">
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1D1D1D] transition-transform ${showTransactionDetails ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showTransactionDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {loadingTransactions ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-[#389C9A]" />
                      </div>
                    ) : transactions.length > 0 ? (
                      transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border border-[#1D1D1D]/10">
                          <div>
                            <p className="text-xs font-bold">{transaction.campaign_name}</p>
                            <p className="text-[8px] text-[#1D1D1D]/40">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">₦{transaction.amount.toLocaleString()}</p>
                            {getTransactionStatusBadge(transaction.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] text-[#1D1D1D]/40 text-center py-4">No transactions yet</p>
                    )}
                    
                    {transactions.length > 5 && (
                      <button
                        onClick={() => navigate('/creator/transactions')}
                        className="w-full py-2 text-[9px] font-black uppercase tracking-wider text-[#389C9A] italic"
                      >
                        VIEW ALL
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
                <span className="text-sm font-bold text-[#1D1D1D]">New campaign requests</span>
                <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when businesses send you campaign offers</p>
              </div>
              <button
                onClick={() => setNotifCampaigns(!notifCampaigns)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifCampaigns ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-bold text-[#1D1D1D]">Messages from businesses</span>
                <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified when you receive new messages</p>
              </div>
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
              <div>
                <span className="text-sm font-bold text-[#1D1D1D]">Payment and payout alerts</span>
                <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Get notified about payments and withdrawals</p>
              </div>
              <button
                onClick={() => setNotifPayments(!notifPayments)}
                className="flex items-center gap-2"
              >
                <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  notifPayments ? 'bg-[#389C9A] justify-end' : 'bg-[#1D1D1D]/20 justify-start'
                }`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-bold text-[#1D1D1D]">Platform announcements</span>
                <p className="text-[9px] text-[#1D1D1D]/40 mt-0.5">Receive news and updates from LiveLink</p>
              </div>
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

        {/* SECTION 6: ACCOUNT STATUS */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D1D1D]/50 mb-4 italic">
            ACCOUNT STATUS
          </h2>

          <div className="space-y-6">
            {/* Pause Account */}
            <div>
              <h3 className="text-sm font-black text-[#1D1D1D] mb-2">PAUSE YOUR ACCOUNT</h3>
              <p className="text-[9px] text-[#1D1D1D]/60 mb-3 leading-relaxed">
                Pausing hides your profile from businesses and stops new campaign requests. Active campaigns are not affected.
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
                Permanently deletes your account and all associated data. This cannot be undone. Any pending payouts will be processed before deletion.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 border-2 border-red-600 text-red-600 text-[10px] font-black uppercase tracking-wider italic hover:bg-red-600 hover:text-white transition-colors"
              >
                REQUEST ACCOUNT DELETION
              </button>
            </div>
              <div className=" bg-white border-t border-[#1D1D1D]/10 ">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full bg-[#1D1D1D] text-white py-4 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#389C9A] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              SAVING...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#FEDB71]" />
              SAVE ALL CHANGES
            </>
          )}
        </button>
      </div>
          </div>
        </div>

        {/* SECTION 7: SUPPORT */}
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
                <HelpCircle className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Help Centre</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button 
              onClick={() => window.open('/terms', '_blank')}
              className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4.5 h-4.5 text-[#1D1D1D]" />
                <span className="text-sm font-bold text-[#1D1D1D]">Terms of Service</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#1D1D1D] rotate-180" />
            </button>

            <button 
              onClick={() => window.open('/privacy', '_blank')}
              className="w-full flex items-center justify-between p-4 border border-[#1D1D1D]/10 hover:border-[#389C9A] transition-colors group"
            >
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
            Logged in as {username ? `@${username}` : email} ·{" "}
            <button 
              onClick={handleLogout}
              className="text-[#389C9A] font-bold hover:underline"
            >
              Log out
            </button>
          </p>
         

        </div>
      </div>

      {/* Sticky Save Button */}
     
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
                Your profile will be hidden from businesses. You can reactivate at any time from Settings.
              </p>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    if (creatorId) {
                      await supabase
                        .from("creator_profiles")
                        .update({ status: 'paused' })
                        .eq("id", creatorId);
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
                This is permanent and cannot be undone. All your data, campaigns and earnings history will be removed. Any pending payouts will be processed within 5 business days.
              </p>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    if (creatorId) {
                      await supabase
                        .from("creator_profiles")
                        .update({ 
                          status: 'deleted',
                          deleted_at: new Date().toISOString()
                        })
                        .eq("id", creatorId);
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
