import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { MessageSquare, Bell, User, ArrowLeft, Settings, LogOut, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  showLogo?: boolean;
  userType?: "creator" | "business";
  subtitle?: string;
}

export function AppHeader({
  title,
  showBack = false,
  backPath,
  showLogo = false,
  userType = "creator",
  subtitle
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const isHome = location.pathname === "/";
  const isMessages = location.pathname.startsWith("/messages");
  const showActions = !isHome && !isMessages;

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserName(session.user.email || "User");
        setUserId(session.user.id);
      }
    };
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserName(session?.user?.email || null);
      setUserId(session?.user?.id || null);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserName(null);
    setUserId(null);
    navigate("/");
  };

  // Use actual user ID instead of "me" to avoid invalid UUID error
  const profilePath = userType === "business"
    ? "/business/profile"
    : userId ? `/profile/${userId}` : "/dashboard";

  return (
    <header className="px-5 pt-10 pb-4 border-b border-[#1D1D1D]/10 sticky top-0 bg-white z-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-1 -ml-1 active:bg-[#1D1D1D]/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showLogo && (
            <div
              className="flex flex-col cursor-pointer"
              onClick={() => navigate(userType === "business" ? "/business/dashboard" : "/dashboard")}
            >
              <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <div className="w-5 h-5 bg-[#1D1D1D] flex items-center justify-center text-white text-[8px] italic">LL</div>
                LiveLink
              </h1>
              {subtitle && <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-40 mt-0.5">{subtitle}</span>}
            </div>
          )}
          {title && !showLogo && (
            <h1 className="text-xl font-black uppercase tracking-tighter italic">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showActions && userName && (
            <>
              <Link
                to={userType === 'business' ? "/messages?role=business" : "/messages?role=creator"}
                className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors border border-transparent active:border-[#1D1D1D]/10"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
              <Link
                to={userType === 'business' ? "/notifications?role=business" : "/notifications?role=creator"}
                className="relative p-1.5 hover:bg-[#1D1D1D]/5 transition-colors"
              >
                <Bell className="w-5 h-5" />
              </Link>
            </>
          )}

          <div className="relative ml-1">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 border border-[#1D1D1D] flex items-center justify-center bg-white active:scale-95 transition-transform"
            >
              <User className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-48 bg-white border border-[#1D1D1D] shadow-none z-50"
                  >
                    {userName ? (
                      <>
                        <div className="p-4 border-b border-[#1D1D1D]/10">
                          <p className="text-[8px] font-black uppercase tracking-widest text-[#1D1D1D]/40 mb-1 italic">Logged in as</p>
                          <p className="text-[10px] font-black uppercase tracking-widest truncate italic">{userName}</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={() => { navigate(profilePath); setShowProfileMenu(false); }}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors italic"
                          >
                            <User className="w-3.5 h-3.5 text-[#389C9A]" /> My Profile
                          </button>
                          <button
                            onClick={() => { navigate(userType === "business" ? "/business/settings" : "/settings"); setShowProfileMenu(false); }}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors italic"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#389C9A]" /> Settings
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white text-red-500 flex items-center gap-3 transition-colors italic"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-2">
                        <button
                          onClick={() => { navigate("/login/portal"); setShowProfileMenu(false); }}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D1D1D] hover:text-white flex items-center gap-3 transition-colors italic"
                        >
                          <LogIn className="w-3.5 h-3.5 text-[#389C9A]" /> Login
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
