import { createBrowserRouter } from 'react-router';
import { Dashboard } from './screens/dashboard';
import { LoginPortal } from '../app/screens/login-portal';
import { Settings } from './screens/settings';
import { ProtectedRoute } from '../app/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Home Page</div>,
  },
  {
    path: "/login",
    element: <Login />,
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
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  // Business routes
  {
    path: "login/business,
    element: <Login />,
  },
  {
    path: "/business/dashboard",
    element: (
      <ProtectedRoute userType="business">
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/business/settings",
    element: (
      <ProtectedRoute userType="business">
        <Settings />
      </ProtectedRoute>
    ),
  },
]);
