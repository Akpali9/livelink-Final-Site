import {createBrowserRouter, RouteObject } from "react-router";
import { Dashboard } from "./screens/dashboard";
import { Profile } from "./screens/profile";
import { Settings } from "./screens/settings";
import { Campaigns } from "./screens/campaigns";
import { BusinessDashboard } from "./screens/business-dashboard";
import { BusinessProfile } from "./screens/business-profile";
import { BusinessSettings } from "./screens/business-settings";
import { BusinessCampaigns } from "./screens/business-campaign-detail";
// import { BusinessCampaignDetail } from "./screens/business-campaign-detail";
import { BusinessCampaignCreators } from "./screens/business-campaign-detail";
import { BrowseBusinesses } from "./screens/browse-businesses";
import { BrowseCreators } from "./screens/browse";
import { Messages } from "./screens/messages"; // Commented out - file doesn't exist
import { Notifications } from "./screens/notifications";
// import { CampaignLiveUpdate } from "./screens/campaign-live-update";
// import { CampaignSummary } from "./screens/campaign-summary";
import { UpcomingGigDetail } from "./screens/upcoming-gig-detail";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginPortal } from "./screens/login-portal";
import { BecomeCreator } from "./screens/become-creator";
import { BecomeBusiness } from "./screens/become-business";

// Auth protection functions (placeholder)
const protectCreator = (Component: React.ComponentType) => {
  return <Component />;
};

const protectBusiness = (Component: React.ComponentType) => {
  return <Component />;
};

const protectAdmin = (Component: React.ComponentType) => {
  return <Component />;
};

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
  // { path: "/campaign/live-update/:id", element: protectCreator(CampaignLiveUpdate) },
  // { path: "/campaign/:id/summary", element: protectCreator(CampaignSummary) },
  // { path: "/creator/upcoming-gig/:id", element: protectCreator(UpcomingGig) },
   { path: "/browse-businesses", element: protectCreator(BrowseBusinesses) },
  { path: "/messages", element: protectCreator(Messages) }, // Commented out
  { path: "/messages/:id", element: protectCreator(Messages) }, // Commented out
  { path: "/notifications", element: protectCreator(Notifications) },
  
  // Business routes
  { path: "/business/dashboard", element: protectBusiness(BusinessDashboard) },
  { path: "/business/profile", element: protectBusiness(BusinessProfile) },
  { path: "/business/settings", element: protectBusiness(BusinessSettings) },
  { path: "/business/campaigns", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/business/campaign/overview/:id", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/business/campaign/creators/:id", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/business/create-campaign", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/business/campaign/edit/:id", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/browse", element: protectBusiness(BrowseCreators) },
  { path: "/business/messages", element: protectBusiness(Messages) }, // Commented out
  { path: "/business/messages/:id", element: protectBusiness(Messages) }, // Commented out
  
  // Admin routes
  { path: "/admin/dashboard", element: protectAdmin(AdminDashboard) },
  { path: "/admin/*", element: protectAdmin(AdminDashboard) },
  
  // Catch all
  { path: "*", element: <LoginPortal /> },
];

export const router = createBrowserRouter(routes);
