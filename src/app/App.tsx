// src/app/router.tsx
import { createBrowserRouter } from 'react-router';
import { Dashboard } from './screens/dashboard';
import { LoginPortal } from './screens/login-portal';
import { Settings } from './screens/settings';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Offers } from "./screens/offers";

// You need to create this component or import the correct one
// For now, let's create a simple component
const ConfirmEmail = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-4">Confirm Your Email</h1>
        <p className="text-gray-600">Please check your email to confirm your account.</p>
      </div>
    </div>
  );
};

// Login component - you already have LoginPortal, so use that
const Login = () => <LoginPortal />;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div className="min-h-screen flex items-center justify-center bg-white">
      <h1 className="text-4xl font-black uppercase tracking-tighter">Home Page</h1>
    </div>,
  },
  {
    path: "/login",
    element: <LoginPortal />, // Use LoginPortal directly
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/offers",
    element: (
      <ProtectedRoute>
        <Offers />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  // Business routes
  {
    path: "/business/login",
    element: <LoginPortal />, // Use LoginPortal directly
  },
  {
    path: "/business/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/confirm-email", // Fixed: removed the equals sign
    element: <ConfirmEmail />
  },
  {
    path: "/business/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
]);
