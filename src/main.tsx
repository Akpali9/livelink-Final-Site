import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/routes";
import { AuthProvider } from "./app/lib/contexts/AuthContext";
import "./styles/index.css";

// Loading component for initial hydration
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="w-10 h-10 border-4 border-[#1D1D1D] border-t-transparent rounded-full animate-spin" />
  </div>
);

const rootEl = document.getElementById("root")!;

// Reveal root only after all assets load to prevent FOUC
const revealRoot = () => rootEl.classList.add("loaded");
if (document.readyState === "complete") {
  revealRoot();
} else {
  window.addEventListener("load", revealRoot);
}

createRoot(rootEl).render(
  <AuthProvider>
    <RouterProvider 
      router={router} 
      fallbackElement={<LoadingFallback />}
    />
  </AuthProvider>
);
