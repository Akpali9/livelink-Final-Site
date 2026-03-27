import { createBrowserRouter, RouteObject } from "react-router";
import { Home } from "./screens/home";
import { Message } from "./screens/message";
import { Dashboard } from "./screens/dashboard";
import { Profile } from "./screens/profile";
import { CampaignSummary } from "./screens/CampaignSummary";
import { Settings } from "./screens/settings";
import { Campaigns } from "./screens/campaigns";
import { LiveCampaignUpdate } from "./screens/live-campaign-update";
import { BusinessDashboard } from "./screens/business-dashboard";
import { BusinessProfile } from "./screens/business-profile";
import { BusinessSettings } from "./screens/business-settings";
import { BusinessCampaigns } from "./screens/business-campaigns";
import { BusinessCampaignOverview } from "./screens/business-campaign-overview";
import { BusinessCampaignCreators } from "./screens/business-campaign-creators";
import { BusinessCreateCampaign } from "./screens/business-create-campaign";
import { CampaignCreatorDetail } from "./screens/campaign-creator-detail";
import { BrowseBusinesses } from "./screens/browse-businesses";
import { BrowseCreators } from "./screens/browse";
import { Notifications } from "./screens/notifications";
import { UpcomingGigDetail } from "./screens/upcoming-gig-detail";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginPortal } from "./screens/login-portal";
import { BecomeCreator } from "./screens/become-creator";
import { BecomeBusiness } from "./screens/become-business";
import { BusinessAnalytics } from "./screens/business-analytics";
import { BusinessAssetLibrary } from "./screens/business-asset-library";
import { CampaignTypeSelection } from "./screens/campaign-type-selection";
import { CampaignCreation } from "./screens/campaign-creation";

// NEW IMPORT for the creator campaign detail page
import { CampaignDetails } from "./screens/campaign-details";

// Auth protection functions (placeholders)
const protectCreator = (Component: React.ComponentType) => <Component />;
const protectBusiness = (Component: React.ComponentType) => <Component />;
const protectAdmin = (Component: React.ComponentType) => <Component />;

export const routes: RouteObject[] = [
  // Public routes
  { path: "/", element: <Home/>  },
  { path: "/login/portal", element: <LoginPortal /> },
  { path: "/become-creator", element: <BecomeCreator /> },
  { path: "/become-business", element: <BecomeBusiness /> },
  
  // Creator routes
  { path: "/dashboard", element: protectCreator(Dashboard) },
  { path: "/profile/:id", element: protectCreator(Profile) },
  { path: "/settings", element: protectCreator(Settings) },
  { path: "/campaigns", element: protectCreator(Campaigns) },
  { path: "/campaign/:id", element: protectCreator(CampaignDetails) }, // <-- NEW creator campaign detail route
  { path: "/browse-businesses", element: protectCreator(BrowseBusinesses) },
  { path: "/messages", element: protectCreator(Messages) },
  { path: "/messages/:id", element: protectCreator(Message) },
  { path: "/notifications", element: protectCreator(Notifications) },
  
  // Business routes
  { path: "/business/dashboard", element: protectBusiness(BusinessDashboard) },
  { path: "/business/profile", element: protectBusiness(BusinessProfile) },
  { path: "/business/settings", element: protectBusiness(BusinessSettings) },
  { path: "/business/campaigns", element: protectBusiness(BusinessCampaigns) },
  { path: "/business/analytics", element: protectBusiness(BusinessAnalytics) },
  { path: "/business/asset-library", element: protectBusiness(BusinessAssetLibrary) },
  
  // Campaign creation flow
  { path: "/business/create-campaign", element: protectBusiness(CampaignTypeSelection) },     // entry point
  { path: "/business/campaign/type", element: protectBusiness(CampaignTypeSelection) },       // alias
  { path: "/business/campaign/creation", element: protectBusiness(CampaignCreation) },
  { path: "/messages/:campaignId/creator/:creatorId", element: protectCreator(Message) }, // brief & payment
  
  // Campaign detail routes
  { path: "/business/campaign/overview/:id", element: protectBusiness(BusinessCampaignOverview) },
  { path: "/business/campaign/creators/:id", element: protectBusiness(BusinessCampaignCreators) },
  { path: "/business/campaign/edit/:id", element: protectBusiness(BusinessCreateCampaign) },
  { path: "/business/campaign/:campaignId/creator/:creatorId", element: protectBusiness(CampaignCreatorDetail) },
  
  { path: "/browse", element: protectBusiness(BrowseCreators) },
  { path: "/business/messages", element: protectBusiness(Messages) },
  { path: "/campaign/live-update/:id", element: protectCreator(LiveCampaignUpdate) },
  // Admin routes
  { path: "/admin/dashboard", element: protectAdmin(AdminDashboard) },
  { path: "/admin/*", element: protectAdmin(AdminDashboard) },
  { path: "/campaign/:id/summary", element: protectCreator(CampaignSummary) },
  { path: "/business/messages/:campaignId/creator/:creatorId", element: protectBusiness(Message) },
  // Catch all
  { path: "*", element: <LoginPortal /> },
];
// In routes.tsx

// Then add:


export const router = createBrowserRouter(routes);
