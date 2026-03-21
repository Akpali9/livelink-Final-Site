import { createBrowserRouter, RouteObject } from "react-router";
import { Dashboard } from "./screens/dashboard";
import { Profile } from "./screens/profile";
import { Settings } from "./screens/settings";
import { Campaigns } from "./screens/campaigns";
import { BusinessDashboard } from "./screens/business-dashboard";
import { BusinessProfile } from "./screens/business-profile";
import { BusinessSettings } from "./screens/business-settings";
import { BusinessCampaigns } from "./screens/business-campaigns";
import { BusinessCampaignOverview } from "./screens/business-campaign-overview";
import { BusinessCampaignCreators } from "./screens/business-campaign-creators";
import { BusinessCreateCampaign } from "./screens/business-create-campaign";
import { CampaignCreatorDetail } from "./screens/campaign-creator-detail"; // ← new import
import { BrowseBusinesses } from "./screens/browse-businesses";
import { BrowseCreators } from "./screens/browse";
import { Messages } from "./screens/messages";
import { Notifications } from "./screens/notifications";
import { UpcomingGigDetail } from "./screens/upcoming-gig-detail";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginPortal } from "./screens/login-portal";
import { BecomeCreator } from "./screens/become-creator";
import { BecomeBusiness } from "./screens/become-business";

// Auth protection functions (placeholders)
const protectCreator = (Component: React.ComponentType) => <Component />;
const protectBusiness = (Component: React.ComponentType) => <Component />;
const protectAdmin = (Component: React.ComponentType) => <Component />;

export const routes: RouteObject[] = [
  // Public routes
  { path: "/", element: <LoginPortal /> },
  { path: "/login/portal", element: <LoginPortal /> },
  { path: "/become-creator", element: <BecomeCreator /> },
  { path: "/become-business", element: <BecomeBusiness /> },
  
  // Creator routes
  { path: "/dashboard", element: protectCreator(Dashboard) },
  { path: "/profile/:id", element: protectCreator(Profile) },
  { path: "/settings", element: protectCreator(Settings) },
  { path: "/campaigns", element: protectCreator(Campaigns) },
  { path: "/browse-businesses", element: protectCreator(BrowseBusinesses) },
  { path: "/messages", element: protectCreator(Messages) },
  { path: "/messages/:id", element: protectCreator(Messages) },
  { path: "/notifications", element: protectCreator(Notifications) },
  
  // Business routes
  { path: "/business/dashboard", element: protectBusiness(BusinessDashboard) },
  { path: "/business/profile", element: protectBusiness(BusinessProfile) },
  { path: "/business/settings", element: protectBusiness(BusinessSettings) },
  { path: "/business/campaigns", element: protectBusiness(BusinessCampaigns) },
  { path: "/campaign/:id/summary", element: <YourCampaignSummaryComponent /> },
  
  // Campaign detail routes – use the new components
  { path: "/business/campaign/overview/:id", element: protectBusiness(BusinessCampaignOverview) },
  { path: "/business/campaign/creators/:id", element: protectBusiness(BusinessCampaignCreators) },
  { path: "/business/create-campaign", element: protectBusiness(BusinessCreateCampaign) },
  { path: "/business/campaign/edit/:id", element: protectBusiness(BusinessCreateCampaign) },
  { path: "/business/campaign/:campaignId/creator/:creatorId", element: protectBusiness(CampaignCreatorDetail) },
  
  { path: "/browse", element: protectBusiness(BrowseCreators) },
  { path: "/business/messages", element: protectBusiness(Messages) },
  { path: "/business/messages/:id", element: protectBusiness(Messages) },
  
  // Admin routes
  { path: "/admin/dashboard", element: protectAdmin(AdminDashboard) },
  { path: "/admin/*", element: protectAdmin(AdminDashboard) },
  
  // Catch all
  { path: "*", element: <LoginPortal /> },
];

export const router = createBrowserRouter(routes);
