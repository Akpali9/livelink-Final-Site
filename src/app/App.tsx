import { createBrowserRouter } from 'react-router';

// Auth
import { CreatorLogin } from './screens/creator-login';
import { LoginPortal } from './screens/login-portal';

// Creator screens
import { Home } from './screens/home';
import { Dashboard } from './screens/dashboard';
import { Settings } from './screens/settings';
import { Profile } from './screens/profile';
import { Browse } from './screens/browse';
import { BrowseBusinesses } from './screens/browse-businesses';
import { Campaigns } from './screens/campaigns';
import { CreatorCampaignDetail } from './screens/creator-campaign-detail';
import { LiveCampaignUpdate } from './screens/live-campaign-update';
import { GigAccepted } from './screens/gig-accepted';
import { UpcomingGigDetail } from './screens/upcoming-gig-detail';
import { MessagesInbox } from './screens/messages-inbox';
import { MessageThread } from './screens/message-thread';
import { Notifications } from './screens/notifications';
import { PaymentHeld } from './screens/payment-held';

// Business screens
import { BusinessProfile } from './screens/business-profile';
import { BusinessSettings } from './screens/business-settings';
import { BusinessCampaignOverview } from './screens/business-campaign-overview';
import { BusinessCampaignDetail } from './screens/business-campaign-detail';
import { BusinessCampaignCreators } from './screens/business-campaign-creators';
import { BusinessSubmissionSuccess } from './screens/business-submission-success';
import { CampaignTypeSelection } from './screens/campaign-type-selection';
import { CampaignSetupBanner } from './screens/campaign-setup-banner';
import { CampaignSetupBannerPromo } from './screens/campaign-setup-banner-promo';
import { CampaignSetupPromoOnly } from './screens/campaign-setup-promo-only';
import { CampaignConfirm } from './screens/campaign-confirm';
import { CampaignCreation } from './screens/campaign-creation';
import { CampaignDetails } from './screens/campaign-details';
import { CampaignAcceptedBusiness } from './screens/campaign-accepted-business';
import { CampaignDeclined } from './screens/campaign-declined';

// Admin
import { AdminApplicationQueue } from './screens/AdminApplicationQueue';

// Guards
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([

  // ── Public ──────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <CreatorLogin />,
  },
  {
    path: '/login/portal',
    element: <LoginPortal />,
  },
  {
    path: '/login/business',
    element: <LoginPortal />,
  },
  {
    path: '/browse',
    element: <Browse />,
  },

  // ── Creator (protected) ──────────────────────────────────────────────────
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute userType="creator">
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute userType="creator">
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/:id',
    element: (
      <ProtectedRoute userType="creator">
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/browse-businesses',
    element: (
      <ProtectedRoute userType="creator">
        <BrowseBusinesses />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaigns',
    element: (
      <ProtectedRoute userType="creator">
        <Campaigns />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/:id',
    element: (
      <ProtectedRoute userType="creator">
        <CreatorCampaignDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/live-update/:id',
    element: (
      <ProtectedRoute userType="creator">
        <LiveCampaignUpdate />
      </ProtectedRoute>
    ),
  },
  {
    path: '/gig-accepted/:campaignId',
    element: (
      <ProtectedRoute userType="creator">
        <GigAccepted />
      </ProtectedRoute>
    ),
  },
  {
    path: '/creator/upcoming-gig/:id',
    element: (
      <ProtectedRoute userType="creator">
        <UpcomingGigDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages',
    element: (
      <ProtectedRoute userType="creator">
        <MessagesInbox />
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages/:id',
    element: (
      <ProtectedRoute userType="creator">
        <MessageThread />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute userType="creator">
        <Notifications />
      </ProtectedRoute>
    ),
  },

  // ── Business (protected) ─────────────────────────────────────────────────
  {
    path: '/business/dashboard',
    element: (
      <ProtectedRoute userType="business">
        <BusinessCampaignOverview />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/profile',
    element: (
      <ProtectedRoute userType="business">
        <BusinessProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/settings',
    element: (
      <ProtectedRoute userType="business">
        <BusinessSettings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/campaign/:id',
    element: (
      <ProtectedRoute userType="business">
        <BusinessCampaignDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/campaign/:id/creators',
    element: (
      <ProtectedRoute userType="business">
        <BusinessCampaignCreators />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/messages',
    element: (
      <ProtectedRoute userType="business">
        <MessagesInbox />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/messages/:id',
    element: (
      <ProtectedRoute userType="business">
        <MessageThread />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/notifications',
    element: (
      <ProtectedRoute userType="business">
        <Notifications />
      </ProtectedRoute>
    ),
  },

  // ── Campaign creation flow (business) ───────────────────────────────────
  {
    path: '/campaign/new',
    element: (
      <ProtectedRoute userType="business">
        <CampaignTypeSelection />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/setup/banner',
    element: (
      <ProtectedRoute userType="business">
        <CampaignSetupBanner />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/setup/banner-promo',
    element: (
      <ProtectedRoute userType="business">
        <CampaignSetupBannerPromo />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/setup/promo-only',
    element: (
      <ProtectedRoute userType="business">
        <CampaignSetupPromoOnly />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/confirm/:id',
    element: (
      <ProtectedRoute userType="business">
        <CampaignConfirm />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/confirm',
    element: (
      <ProtectedRoute userType="business">
        <CampaignConfirm />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/creation',
    element: (
      <ProtectedRoute userType="business">
        <CampaignCreation />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/details/:id',
    element: (
      <ProtectedRoute userType="business">
        <CampaignDetails />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/accepted/:id',
    element: (
      <ProtectedRoute userType="business">
        <CampaignAcceptedBusiness />
      </ProtectedRoute>
    ),
  },
  {
    path: '/campaign/declined/:id',
    element: (
      <ProtectedRoute userType="business">
        <CampaignDeclined />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/submission-success',
    element: (
      <ProtectedRoute userType="business">
        <BusinessSubmissionSuccess />
      </ProtectedRoute>
    ),
  },
  {
    path: '/payment-held/:campaignId',
    element: (
      <ProtectedRoute userType="business">
        <PaymentHeld />
      </ProtectedRoute>
    ),
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    path: '/admin/applications',
    element: (
      <ProtectedRoute userType="admin">
        <AdminApplicationQueue />
      </ProtectedRoute>
    ),
  },

  // ── 404 fallback ─────────────────────────────────────────────────────────
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">404</h1>
          <p className="text-sm text-gray-500 mb-6">This page doesn't exist.</p>
          <a href="/" className="text-[#389C9A] font-black uppercase text-xs underline">
            Go home
          </a>
        </div>
      </div>
    ),
  },
]);
