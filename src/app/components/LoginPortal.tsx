import React, { useState } from "react";
import { motion } from "motion/react";
import { Video as VideoIcon, Building, ChevronRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/contexts/AuthContext";

export function LoginPortal() {
  const [selectedRole, setSelectedRole] = useState<"creator" | "business" | null>(null);
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate(`/dashboard?role=${selectedRole}`);
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const handleEmailLogin = () => {
    navigate("/login"); // separate email login page
  };

  return (
    <div className="min-h-screen flex flex-col px-8 pt-20 pb-12 bg-white">
      <div className="flex flex-col items-center mb-16">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-[#1D1D1D] flex items-center justify-center">
            <div className="w-5 h-5 bg-[#389C9A]" />
          </div>
          <span className="text-3xl font-black uppercase tracking-tighter italic text-[#1D1D1D]">LiveLink</span>
        </motion.div>
      </div>

      {!selectedRole && (
        <div className="flex flex-col gap-6">
          <motion.button onClick={() => setSelectedRole("creator")} className="flex justify-between p-8 border-2 border-black hover:bg-black hover:text-white">
            <div>
              <VideoIcon className="mb-2" />
              <h3 className="font-bold">I'm a Creator</h3>
              <p className="text-sm opacity-60">Access campaigns and earnings.</p>
            </div>
            <ChevronRight />
          </motion.button>

          <motion.button onClick={() => setSelectedRole("business")} className="flex justify-between p-8 border-2 border-black hover:bg-black hover:text-white">
            <div>
              <Building className="mb-2" />
              <h3 className="font-bold">I'm a Business</h3>
              <p className="text-sm opacity-60">Manage campaigns and creators.</p>
            </div>
            <ChevronRight />
          </motion.button>
        </div>
      )}

      {selectedRole && (
        <div className="flex flex-col gap-6">
          <button onClick={handleGoogleLogin} className="p-6 border-2 border-black hover:bg-black hover:text-white">
            Continue with Google
          </button>

          <button onClick={handleEmailLogin} className="p-6 border-2 border-black hover:bg-black hover:text-white flex items-center justify-center gap-2">
            <Mail size={18} /> Continue with Email
          </button>

          <button onClick={() => setSelectedRole(null)} className="text-sm opacity-60">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}