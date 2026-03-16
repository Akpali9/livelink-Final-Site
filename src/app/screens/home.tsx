import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, BadgePoundSterling, ArrowRight } from "lucide-react";

const links = [
  { to: "/login/portal", label: "Sign In", type: "border" },
  { to: "/become-creator", label: "Become a Creator", type: "bg" },
  { to: "/become-business", label: "Register Business", type: "border" },
  { to: "/browse-businesses", label: "Find Brands", type: "border" },
  { to: "/browse", label: "Find Creators", type: "border" }
];

const trustItems = [
  { icon: <Zap className="w-5 h-5 text-[#389C9A]" />, label: "Fast Matching" },
  { icon: <Shield className="w-5 h-5 text-[#389C9A]" />, label: "Verified" },
  { icon: <BadgePoundSterling className="w-5 h-5 text-[#389C9A]" />, label: "Instant Payout" }
];

export function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-start justify-center px-8 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-[#1D1D1D] text-white text-[10px] font-bold uppercase tracking-widest mb-8 italic"
        >
          <span className="w-1.5 h-1.5 bg-[#FEDB71] rounded-none animate-pulse" />
          Live Now
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[48px] leading-[0.9] font-black uppercase tracking-tighter mb-8 text-[#1D1D1D]"
        >
          Stream.<br />
          Earn.<br />
          Connect.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#1D1D1D]/70 text-lg mb-12 max-w-[300px] font-medium leading-tight italic"
        >
          Premium in-stream banner advertising for creators and growing businesses.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 w-full"
        >
          {links.map(({ to, label, type }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between ${
                type === "bg"
                  ? "bg-[#1D1D1D] text-white"
                  : "border-2 border-[#1D1D1D] text-[#1D1D1D]"
              } p-6 font-black uppercase tracking-tight transition-all active:scale-[0.98] hover:bg-[#1D1D1D] hover:text-white italic`}
            >
              {label}
              <ArrowRight className="w-5 h-5 text-[#389C9A]" />
            </Link>
          ))}
        </motion.div>
      </div>

      {/* Trust Bar */}
      <div className="px-8 pb-12">
        <div className="h-[1px] bg-[#1D1D1D]/10 mb-8" />
        <div className="grid grid-cols-3 gap-8">
          {trustItems.map(({ icon, label }) => (
            <div key={label} className="flex flex-col gap-2">
              {icon}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 leading-none italic">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee Branding */}
      <div className="py-6 border-t border-[#1D1D1D] overflow-hidden bg-[#1D1D1D] text-white">
        <motion.div
          animate={{ x: [0, -400] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex gap-12 items-center whitespace-nowrap"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-xl font-black uppercase italic tracking-tighter">
              LiveLink // <span className="text-[#389C9A]">Connect</span> // <span className="text-[#FEDB71]">Earn</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}