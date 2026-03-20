import { createBrowserRouter, RouteObject } from "react-router";
import { Home } from "./screens/home";
import { LoginPortal } from "./screens/login-portal";
import { CreatorLogin } from "./screens/creator-login";
import { BusinessLogin } from "./screens/business-login";
import { Browse } from "./screens/browse";
import { Profile } from "./screens/profile";
import { Dashboard } from "./screens/dashboard";
import { BusinessDashboard } from "./screens/business-dashboard";
import { BusinessProfile } from "./screens/business-profile";
import { CampaignCreation } from "./screens/campaign-creation";
import { CampaignTypeSelection } from "./screens/campaign-type-selection";
import { CampaignSetupBanner } from "./screens/campaign-setup-banner";
import { CampaignSetupBannerPromo } from "./screens/campaign-setup-banner-promo";
import { CampaignSetupPromoOnly } from "./screens/campaign-setup-promo-only";
import { BecomeCreator } from "./screens/become-creator";
import { BecomeBusiness } from "./screens/become-business";
import { BrowseBusinesses } from "./screens/browse-businesses";
import { GigAccepted } from "./screens/gig-accepted";
import { BusinessSubmissionSuccess } from "./screens/business-submission-success";
import { Campaigns } from "./screens/campaigns";
import { BusinessCampaignDetail } from "./screens/business-campaign-detail";
import { BusinessCampaignCreators } from "./screens/business-campaign-creators";
import { CreatorCampaignDetail } from "./screens/creator-campaign-detail";
import { LiveCampaignUpdate } from "./screens/live-campaign-update";
import { MessagesInbox } from "./screens/messages-inbox";
import { MessageThread } from "./screens/message-thread";
import { CampaignConfirm } from "./screens/campaign-confirm";
import { PaymentHeld } from "./screens/payment-held";
import { CampaignAcceptedBusiness } from "./screens/campaign-accepted-business";
import { CampaignDeclined } from "./screens/campaign-declined";
import { Notifications } from "./screens/notifications";
import { UpcomingGigDetail } from "./screens/upcoming-gig-detail";
import { BusinessCampaignOverview } from "./screens/business-campaign-overview";
import { RootLayout } from "../app/components/layout";
import { CampaignDetails } from "./screens/campaign-details";
import { Settings } from "./screens/settings";
import { BusinessSettings } from "./screens/business-settings";
import { ProtectedRoute } from "../app/components/ProtectedRoute";

// ── Admin imports ─────────────────────────────────────────────────────────────
// AdminDashboard is a DEFAULT export — do NOT use { } destructuring
import AdminDashboard from "../app/components/AdminDashboard";
import { AdminApplicationQueue } from "../app/components/AdminApplicationQueue";
import { AdminBusinessQueue } from "../app/components/AdminBusinessQueue";
import { AdminLayout } from "../app/components/AdminLayout";
import { AdminCampaigns } from "../app/components/AdminCampaigns";
// ─────────────────────────────────────────────────────────────────────────────

import { ForgotPassword } from "./screens/forgot-password";
import { ResetPassword } from "./screens/reset-password";
import { Terms } from "./screens/terms";
import { Privacy } from "./screens/privacy";
import { ConfirmEmail } from "./screens/confirm-email";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Helper functions for protected routes
const protectCreator = (Component: React.ComponentType) => (
  <ProtectedRoute userType="creator">
    <Component />
  </ProtectedRoute>
);

const protectBusiness = (Component: React.ComponentType) => (
  <ProtectedRoute userType="business">
    <Component />
  </ProtectedRoute>
);

const protectBoth = (Component: React.ComponentType) => (
  <ProtectedRoute>
    <Component />
  </ProtectedRoute>
);

// ── Fixed: protectAdmin wraps a Component type, not a JSX element ─────────────
const protectAdmin = (Component: React.ComponentType) => (
  <ProtectedRoute userType="admin">
    <Component />
  </ProtectedRoute>
);
// ─────────────────────────────────────────────────────────────────────────────

const routes: RouteObject[] = [
  {
    path: "/",
    element: <ErrorBoundary><RootLayout /></ErrorBoundary>,
    errorElement: <ErrorBoundary><div>Error</div></ErrorBoundary>,
    children: [
      // Public routes
      { index: true, element: <Home /> },
      { path: "login/portal", element: <LoginPortal /> },
      { path: "login/creator", element: <CreatorLogin /> },
      { path: "login/business", element: <BusinessLogin /> },
      { path: "browse", element: <Browse /> },
      { path: "profile/:id", element: <Profile /> },
      { path: "browse-businesses", element: <BrowseBusinesses /> },
      { path: "become-creator", element: <BecomeCreator /> },
      { path: "become-business", element: <BecomeBusiness /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "confirm-email", element: <ConfirmEmail /> },
      { path: "terms", element: <Terms /> },
      { path: "privacy", element: <Privacy /> },

      // Protected Creator Routes
      { path: "dashboard", element: protectCreator(Dashboard) },
      { path: "campaigns", element: protectCreator(Campaigns) },
      { path: "campaign/type", element: protectCreator(CampaignTypeSelection) },
      { path: "campaign/setup/banner", element: protectCreator(CampaignSetupBanner) },
      { path: "campaign/setup/banner-promo", element: protectCreator(CampaignSetupBannerPromo) },
      { path: "campaign/setup/promo-only", element: protectCreator(CampaignSetupPromoOnly) },
      { path: "campaign/create", element: protectCreator(CampaignCreation) },
      { path: "campaign/confirm", element: protectCreator(CampaignConfirm) },
      { path: "campaign/:id", element: protectCreator(CampaignDetails) },
      { path: "creator/campaign/:id", element: protectCreator(CreatorCampaignDetail) },
      { path: "creator/upcoming-gig/:id", element: protectCreator(UpcomingGigDetail) },
      { path: "settings", element: protectCreator(Settings) },

      // Protected Business Routes
      { path: "business/dashboard", element: protectBusiness(BusinessDashboard) },
      { path: "business/profile", element: protectBusiness(BusinessProfile) },
      { path: "business/campaign/overview/:id", element: protectBusiness(BusinessCampaignOverview) },
      { path: "business/campaign/:id", element: protectBusiness(BusinessCampaignCreators) },
      { path: "business/campaign/:campaignId/creator/:creatorId", element: protectBusiness(BusinessCampaignDetail) },
      { path: "business/settings", element: protectBusiness(BusinessSettings) },
      { path: "business/submission-success", element: protectBusiness(BusinessSubmissionSuccess) },

      // Protected routes for both user types
      { path: "messages", element: protectBoth(MessagesInbox) },
      { path: "messages/:id", element: protectBoth(MessageThread) },
      { path: "notifications", element: protectBoth(Notifications) },
      { path: "campaign/live-update/:id", element: protectBoth(LiveCampaignUpdate) },
      { path: "payment/held", element: protectBoth(PaymentHeld) },
      { path: "campaign/confirmed", element: protectBoth(CampaignAcceptedBusiness) },
      { path: "campaign/declined", element: protectBoth(CampaignDeclined) },
      { path: "gig-accepted", element: protectBoth(GigAccepted) },

      // ── Admin Routes ────────────────────────────────────────────────────────
      // FIX: pass AdminLayout as a Component reference, not as <AdminLayout />
      {
        path: "admin",
        element: protectAdmin(AdminLayout),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "creators", element: <AdminApplicationQueue /> },
          { path: "businesses", element: <AdminBusinessQueue /> },
          { path: "campaigns", element: <AdminCampaigns /> },
        ],
      },
      // ────────────────────────────────────────────────────────────────────────
    ],
  },
];

export const router = createBrowserRouter(routes);
