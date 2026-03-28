import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./app/lib/contexts/AuthContext";
import { router } from "./app/routes";
import "./styles/index.css";
import { Toaster } from "sonner"; // <-- add this

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <Toaster richColors position="top-center" />
    <RouterProvider router={router} />
  </AuthProvider>
);
