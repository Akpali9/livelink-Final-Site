import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Clock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../app/lib/supabase';

export function ApplicationPending() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <button 
          onClick={handleSignOut}
          className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-opacity"
        >
          ← Sign Out
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-4">
          Application Under Review
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 bg-[#1D1D1D] rounded-none border-2 border-[#FEDB71] flex items-center justify-center mx-auto mb-8">
            <Clock className="w-12 h-12 text-[#389C9A]" />
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tight italic mb-4">
            We're reviewing your application
          </h2>
          
          <p className="text-[#1D1D1D]/60 mb-8 text-sm">
            Our team is currently reviewing your information. This usually takes 24-48 hours. 
            You'll receive an email notification once a decision has been made.
          </p>

          <div className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 mb-8 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">
              What happens next
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">01</span>
                <p className="text-xs font-medium">Our team reviews your application and documents</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">02</span>
                <p className="text-xs font-medium">You receive an approval email with next steps</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#389C9A] font-black">03</span>
                <p className="text-xs font-medium">You get full access to your dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#1D1D1D]/40 text-[10px] font-black uppercase tracking-widest">
            <Mail className="w-4 h-4" />
            <span>Check your email for updates</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}