import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Shield,
  Scale,
  Lock,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { BottomNav } from "../components/bottom-nav";

export function Terms() {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);

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
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: <CheckCircle2 className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            By accessing or using the LiveLink platform, you agree to be bound by these Terms of Service. 
            If you do not agree to all the terms and conditions, you may not access or use our services.
          </p>
          <p>
            LiveLink provides a marketplace connecting content creators with businesses for promotional 
            campaigns. These terms govern your use of the platform, whether you are a Creator or a Business.
          </p>
        </>
      ),
    },
    {
      id: "definitions",
      title: "2. Definitions",
      icon: <FileText className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-black">"Platform"</span> means the LiveLink website, mobile applications, and related services.</li>
            <li><span className="font-black">"Creator"</span> means a user who streams content and participates in campaigns.</li>
            <li><span className="font-black">"Business"</span> means a company or individual that creates campaigns for promotion.</li>
            <li><span className="font-black">"Campaign"</span> means a promotional opportunity posted by a Business.</li>
            <li><span className="font-black">"Offer"</span> means a Business's proposal to a Creator for a specific Campaign.</li>
            <li><span className="font-black">"Application"</span> means a Creator's request to join a Campaign.</li>
            <li><span className="font-black">"Content"</span> means any material uploaded to the Platform, including streams, images, and text.</li>
          </ul>
        </>
      ),
    },
    {
      id: "accounts",
      title: "3. Account Registration",
      icon: <Users className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            To use our Platform, you must register for an account. You agree to provide accurate, current, 
            and complete information and to update it as necessary.
          </p>
          <p className="mb-4">
            <span className="font-black">3.1 Eligibility:</span> You must be at least 18 years old to use the Platform. 
            By registering, you represent and warrant that you meet this requirement.
          </p>
          <p className="mb-4">
            <span className="font-black">3.2 Account Security:</span> You are responsible for maintaining the security 
            of your account credentials. LiveLink is not liable for any loss or damage from unauthorized access.
          </p>
          <p>
            <span className="font-black">3.3 Account Types:</span> Users may register as either a Creator or a Business. 
            Each user may only hold one account type and may not switch between types without approval.
          </p>
        </>
      ),
    },
    {
      id: "creators",
      title: "4. Creator Obligations",
      icon: <Users className="w-5 h-5 text-[#FEDB71]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">4.1 Profile Accuracy:</span> Creators must maintain accurate profiles, 
            including viewer statistics, content categories, and contact information.
          </p>
          <p className="mb-4">
            <span className="font-black">4.2 Campaign Performance:</span> When accepting an offer, Creators agree to:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Complete the agreed number of streams</li>
            <li>Display campaign materials as specified</li>
            <li>Submit proof of performance within 24 hours</li>
            <li>Maintain professional conduct during streams</li>
          </ul>
          <p className="mb-4">
            <span className="font-black">4.3 Content Standards:</span> Creators warrant that their content does not 
            violate any laws or third-party rights and is appropriate for the campaign.
          </p>
          <p>
            <span className="font-black">4.4 Exclusivity:</span> Creators may work with multiple businesses but must 
            avoid conflicts of interest (e.g., promoting competing products in the same campaign period).
          </p>
        </>
      ),
    },
    {
      id: "businesses",
      title: "5. Business Obligations",
      icon: <Users className="w-5 h-5 text-[#FEDB71]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">5.1 Campaign Accuracy:</span> Businesses must provide accurate campaign 
            descriptions, requirements, and compensation details.
          </p>
          <p className="mb-4">
            <span className="font-black">5.2 Payment:</span> Businesses agree to pay the agreed amount promptly upon 
            successful completion of campaign requirements. Payments are processed through the Platform.
          </p>
          <p className="mb-4">
            <span className="font-black">5.3 Communication:</span> Businesses must communicate professionally with 
            Creators through the Platform's messaging system.
          </p>
          <p>
            <span className="font-black">5.4 Verification:</span> Businesses must provide valid identification and 
            business documentation for verification purposes.
          </p>
        </>
      ),
    },
    {
      id: "payments",
      title: "6. Payments and Fees",
      icon: <DollarSign className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">6.1 Platform Fee:</span> LiveLink charges a platform fee of 10% on all 
            completed campaign payments. This fee is deducted before funds are released to Creators.
          </p>
          <p className="mb-4">
            <span className="font-black">6.2 Payment Processing:</span> Payments are held securely and released upon 
            verification of completed work. Processing typically takes 3-5 business days.
          </p>
          <p className="mb-4">
            <span className="font-black">6.3 Refunds and Disputes:</span> In case of disputes, LiveLink may hold funds 
            until resolution. Refunds are issued at LiveLink's discretion based on evidence provided.
          </p>
          <p>
            <span className="font-black">6.4 Taxes:</span> Users are responsible for any applicable taxes on their 
            earnings. LiveLink does not withhold taxes on behalf of users.
          </p>
        </>
      ),
    },
    {
      id: "verification",
      title: "7. Verification and Approval",
      icon: <Shield className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">7.1 Creator Verification:</span> All Creator applications are reviewed 
            before approval. LiveLink may request additional documentation to verify identity and viewer statistics.
          </p>
          <p className="mb-4">
            <span className="font-black">7.2 Business Verification:</span> Businesses must provide valid identification 
            or business registration documents for verification.
          </p>
          <p className="mb-4">
            <span className="font-black">7.3 Campaign Approval:</span> LiveLink reserves the right to review and 
            approve or reject any campaign before it is published.
          </p>
          <p>
            <span className="font-black">7.4 Rejection:</span> LiveLink may reject applications or campaigns that do 
            not meet our standards or violate these terms.
          </p>
        </>
      ),
    },
    {
      id: "intellectual",
      title: "8. Intellectual Property",
      icon: <Lock className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">8.1 Platform Content:</span> LiveLink owns all rights to the Platform, 
            including its design, code, and proprietary features.
          </p>
          <p className="mb-4">
            <span className="font-black">8.2 User Content:</span> Users retain ownership of their content but grant 
            LiveLink a license to host, display, and use it for Platform operations.
          </p>
          <p className="mb-4">
            <span className="font-black">8.3 Campaign Materials:</span> Businesses retain ownership of their campaign 
            materials. Creators may use them only for the agreed campaign purposes.
          </p>
          <p>
            <span className="font-black">8.4 Feedback:</span> Any suggestions or feedback about the Platform become 
            the property of LiveLink.
          </p>
        </>
      ),
    },
    {
      id: "termination",
      title: "9. Termination",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">9.1 By User:</span> Users may terminate their account at any time by 
            contacting support. Active campaigns must be completed or cancelled before termination.
          </p>
          <p className="mb-4">
            <span className="font-black">9.2 By LiveLink:</span> LiveLink may suspend or terminate accounts for:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Violation of these Terms</li>
            <li>Fraudulent activity or misrepresentation</li>
            <li>Harassment or abusive behavior</li>
            <li>Inactivity for extended periods</li>
            <li>Legal or regulatory requirements</li>
          </ul>
          <p>
            <span className="font-black">9.3 Effect of Termination:</span> Upon termination, users lose access to 
            their account. Pending payments will be processed according to campaign status.
          </p>
        </>
      ),
    },
    {
      id: "disputes",
      title: "10. Dispute Resolution",
      icon: <Scale className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            <span className="font-black">10.1 Informal Resolution:</span> Users agree to attempt informal resolution 
            of disputes through LiveLink's support system before pursuing other remedies.
          </p>
          <p className="mb-4">
            <span className="font-black">10.2 Mediation:</span> If informal resolution fails, disputes may be submitted 
            to mediation at LiveLink's discretion.
          </p>
          <p className="mb-4">
            <span className="font-black">10.3 Governing Law:</span> These Terms are governed by the laws of [Your Jurisdiction].
          </p>
          <p>
            <span className="font-black">10.4 Class Action Waiver:</span> Users agree to resolve disputes individually 
            and waive the right to participate in class actions.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "11. Changes to Terms",
      icon: <FileText className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-4">
            LiveLink may modify these Terms at any time. Continued use of the Platform after changes constitutes 
            acceptance of the modified Terms.
          </p>
          <p>
            Material changes will be notified via email or Platform notification at least 30 days before they take effect.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "12. Contact Information",
      icon: <HelpCircle className="w-5 h-5 text-[#389C9A]" />,
      content: (
        <>
          <p className="mb-2">For questions about these Terms, please contact:</p>
          <p className="font-black">LiveLink Support</p>
          <p>Email: [email address]</p>
          <p>Address: [Your Business Address]</p>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D] pb-[80px]">
      <AppHeader showBack title="Terms of Service" backPath="/" />

      <main className="max-w-[480px] mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-[#1D1D1D] border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-[#389C9A]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-gray-500">
            Last Updated: March 15, 2024
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 mb-8">
          <p className="text-sm leading-relaxed">
            Welcome to LiveLink. These Terms of Service govern your use of our platform connecting 
            content creators with businesses for promotional campaigns. By using LiveLink, you agree 
            to these terms. Please read them carefully.
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

        {/* Acceptance Checkbox */}
        <div className="mb-8 p-6 bg-[#F8F8F8] border-2 border-[#1D1D1D]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-xs font-medium leading-relaxed">
              I have read and agree to the Terms of Service and Privacy Policy. I confirm that I am at least 18 years old.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => accepted ? navigate(-1) : toast.error("Please accept the Terms of Service")}
            className={`w-full py-4 text-sm font-black uppercase tracking-widest transition-all ${
              accepted
                ? "bg-[#1D1D1D] text-white hover:bg-[#389C9A]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Accept & Continue
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 border-2 border-[#1D1D1D] text-sm font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white transition-all"
          >
            Go Back
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
