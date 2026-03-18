import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  Cookie,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

export function Privacy() {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isExpanded = (sectionId: string) => expandedSections.includes(sectionId);

  const sections = [
    {
      id: "intro",
      title: "Introduction",
      icon: <Info className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            LiveLink ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
            explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
          <p>
            Please read this Privacy Policy carefully. By accessing or using the Platform, you acknowledge 
            that you have read, understood, and agree to be bound by all terms of this Privacy Policy.
          </p>
        </>
      ),
    },
    {
      id: "collection",
      title: "Information We Collect",
      icon: <Database className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4 font-black">1. Personal Information:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Name, email address, phone number</li>
            <li>Payment information (processed securely through our payment provider)</li>
            <li>Government-issued ID for verification purposes</li>
            <li>Business registration documents (for Business accounts)</li>
            <li>Profile information (bio, avatar, social media links)</li>
          </ul>

          <p className="mb-4 font-black">2. Streaming Data:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Viewer statistics and analytics</li>
            <li>Stream duration and frequency</li>
            <li>Content categories and niches</li>
          </ul>

          <p className="mb-4 font-black">3. Usage Information:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Log data (IP address, browser type, pages visited)</li>
            <li>Device information</li>
            <li>Cookies and similar technologies</li>
          </ul>
        </>
      ),
    },
    {
      id: "use",
      title: "How We Use Your Information",
      icon: <Eye className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and maintain the Platform</li>
            <li>Process and facilitate campaigns and payments</li>
            <li>Verify user identities and prevent fraud</li>
            <li>Match creators with relevant business opportunities</li>
            <li>Communicate with you about your account and campaigns</li>
            <li>Improve and optimize the Platform</li>
            <li>Comply with legal obligations</li>
            <li>Enforce our Terms of Service</li>
          </ul>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Sharing Your Information",
      icon: <Eye className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">We may share your information with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-black">Other Users:</span> Creators and Businesses can see profile information relevant to campaigns</li>
            <li><span className="font-black">Service Providers:</span> Third parties that help us operate the Platform (payment processing, hosting, analytics)</li>
            <li><span className="font-black">Legal Requirements:</span> When required by law or to protect rights and safety</li>
            <li><span className="font-black">Business Transfers:</span> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          <p className="mt-4">
            We do not sell your personal information to third parties.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "Data Security",
      icon: <Lock className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            We implement appropriate technical and organizational measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encryption of sensitive data in transit and at rest</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Secure data storage and processing</li>
          </ul>
          <p className="mt-4">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "Data Retention",
      icon: <Database className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            We retain your personal information for as long as your account is active or as needed to provide services. 
            We may retain certain information after account closure for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Legal and regulatory compliance</li>
            <li>Fraud prevention</li>
            <li>Resolution of disputes</li>
            <li>Enforcement of our terms</li>
          </ul>
        </>
      ),
    },
    {
      id: "rights",
      title: "Your Rights",
      icon: <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">Depending on your location, you may have rights regarding your personal information, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access to your personal information</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion of your data ("right to be forgotten")</li>
            <li>Restriction or objection to processing</li>
            <li>Data portability</li>
            <li>Withdrawal of consent</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at privacy@livelink.com.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies and Tracking",
      icon: <Cookie className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Understand how you use the Platform</li>
            <li>Improve user experience</li>
            <li>Analyze traffic patterns</li>
          </ul>
          <p className="mt-4">
            You can control cookies through your browser settings. Disabling cookies may affect Platform functionality.
          </p>
        </>
      ),
    },
    {
      id: "deletion",
      title: "Account Deletion",
      icon: <Trash2 className="w-5 h-5 text-red-500" />,
      content: (
        <>
          <p className="mb-4">
            You may request deletion of your account by:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contacting support at support@livelink.com</li>
            <li>Using the account deletion option in Settings</li>
          </ul>
          <p className="mt-4">
            Upon deletion, we will remove your personal information, subject to legal retention requirements. 
            Campaign history may be anonymized and retained for analytical purposes.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to Privacy Policy",
      icon: <Info className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify you of material changes by:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email notification</li>
            <li>Platform notification</li>
            <li>Notice on our website</li>
          </ul>
          <p className="mt-4">
            Continued use of the Platform after changes constitutes acceptance of the updated policy.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact Us",
      icon: <Mail className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-2">For privacy-related inquiries, please contact:</p>
          <p className="font-black">LiveLink Privacy Officer</p>
          <p>Email: privacy@livelink.com</p>
          <p>Address: [Your Business Address]</p>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Privacy Policy" backPath="/" />

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#389C9A]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-500">
            Last Updated: March 15, 2024
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-8">
          {sections.map((section) => (
            <div
              key={section.id}
              className="border-2 border-[#1D1D1D] overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-5 bg-white hover:bg-[#F8F8F8] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className="font-black text-sm uppercase tracking-tight">
                    {section.title}
                  </span>
                </div>
                {isExpanded(section.id) ? (
                  <ChevronUp className="w-4 h-4 text-[#389C9A]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#389C9A]" />
                )}
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: isExpanded(section.id) ? "auto" : 0,
                  opacity: isExpanded(section.id) ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-5 border-t-2 border-[#1D1D1D] bg-[#F8F8F8] text-sm leading-relaxed">
                  {section.content}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 bg-[#1D1D1D] text-white text-sm font-black uppercase tracking-widest hover:bg-[#389C9A] transition-all"
          >
            I Understand
          </button>
          <button
            onClick={() => navigate("/terms")}
            className="w-full py-4 border-2 border-[#1D1D1D] text-sm font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all"
          >
            View Terms of Service
          </button>
        </div>

        {/* Footer */}
        <p className="text-[8px] text-center text-gray-400 mt-8">
          © {new Date().getFullYear()} LiveLink. All rights reserved.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
