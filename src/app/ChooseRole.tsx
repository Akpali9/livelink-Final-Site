import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Users, Building2, ArrowRight } from 'lucide-react';

export function ChooseRole() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
      <div className="px-8 pt-12 pb-8 border-b-2 border-[#1D1D1D]">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-tight mb-4">
          Join LiveLink
        </h1>
        <p className="text-[#1D1D1D]/60 text-sm font-medium italic">
          Choose how you want to use LiveLink. You can only have one account type.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-[600px] w-full space-y-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/become-creator')}
            className="w-full bg-white border-2 border-[#1D1D1D] p-8 text-left hover:bg-[#1D1D1D] group transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-[#F8F8F8] group-hover:bg-white/10 transition-all">
                  <Users className="w-8 h-8 text-[#389C9A]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2 group-hover:text-white">
                    I'm a Creator
                  </h2>
                  <p className="text-sm text-[#1D1D1D]/60 group-hover:text-white/60">
                    I want to earn money by streaming and promoting brands during my live streams.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-[#1D1D1D] group-hover:text-white transition-all" />
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/become-business')}
            className="w-full bg-white border-2 border-[#1D1D1D] p-8 text-left hover:bg-[#1D1D1D] group transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-[#F8F8F8] group-hover:bg-white/10 transition-all">
                  <Building2 className="w-8 h-8 text-[#389C9A]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2 group-hover:text-white">
                    I'm a Business
                  </h2>
                  <p className="text-sm text-[#1D1D1D]/60 group-hover:text-white/60">
                    I want to advertise my products or services through live creators.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-[#1D1D1D] group-hover:text-white transition-all" />
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}