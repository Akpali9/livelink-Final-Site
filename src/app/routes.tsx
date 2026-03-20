// routes.tsx - Complete corrected routes

import { RouteObject } from "react-router";
import { CreatorDashboard } from "./screens/creator-dashboard";
import { CreatorProfile } from "./screens/creator-profile";
import { CreatorSettings } from "./screens/creator-settings";
import { CreatorCampaigns } from "./screens/creator-campaigns";
import { BusinessDashboard } from "./screens/business-dashboard";
import { BusinessProfile } from "./screens/business-profile";
import { BusinessSettings } from "./screens/business-settings";
import { BusinessCampaigns } from "./screens/business-campaigns";
import { BusinessCampaignDetail } from "./screens/business-campaign-detail";
import { BusinessCampaignCreators } from "./screens/business-campaign-creators";
import { BrowseBusinesses } from "./screens/browse-businesses";
import { BrowseCreators } from "./screens/browse-creators";
import { Messages } from "./screens/messages";
import { Notifications } from "./screens/notifications";
import { Campaigns } from "./screens/campaigns"; // Creator campaigns
import { CampaignLiveUpdate } from "./screens/campaign-live-update";
import { CampaignSummary } from "./screens/campaign-summary";
import { UpcomingGig } from "./screens/upcoming-gig";
import { AdminDashboard } from "./screens/admin-dashboard";
import { Settings } from "./screens/settings";
import { LoginPortal } from "./screens/login-portal";
import { BecomeCreator } from "./screens/become-creator";
import { BecomeBusiness } from "./screens/become-business";

// Auth protection function
const protectCreator = (Component: React.ComponentType) => {
  return <Component />; // Add actual auth logic here
};

const protectBusiness = (Component: React.ComponentType) => {
  return <Component />; // Add actual auth logic here
};

const protectAdmin = (Component: React.ComponentType) => {
  return <Component />; // Add actual auth logic here
};

export const routes: RouteObject[] = [
  // Public routes
  { path: "/", element: <LoginPortal /> },
  { path: "/login/portal", element: <LoginPortal /> },
  { path: "/become-creator", element: <BecomeCreator /> },
  { path: "/become-business", element: <BecomeBusiness /> },
  
  // Creator routes
  { path: "/dashboard", element: protectCreator(CreatorDashboard) },
  { path: "/profile/:id", element: protectCreator(CreatorProfile) },
  { path: "/settings", element: protectCreator(CreatorSettings) },
  { path: "/campaigns", element: protectCreator(CreatorCampaigns) },
  { path: "/campaign/live-update/:id", element: protectCreator(CampaignLiveUpdate) },
  { path: "/campaign/:id/summary", element: protectCreator(CampaignSummary) },
  { path: "/creator/upcoming-gig/:id", element: protectCreator(UpcomingGig) },
  { path: "/browse-businesses", element: protectCreator(BrowseBusinesses) },
  { path: "/messages", element: protectCreator(Messages) },
  { path: "/messages/:id", element: protectCreator(Messages) },
  { path: "/notifications", element: protectCreator(Notifications) },
  
  // Business routes
  { path: "/business/dashboard", element: protectBusiness(BusinessDashboard) },
  { path: "/business/profile", element: protectBusiness(BusinessProfile) },
  { path: "/business/settings", element: protectBusiness(BusinessSettings) },
  { path: "/business/campaigns", element: protectBusiness(BusinessCampaigns) },
  { path: "/business/campaign/overview/:id", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/business/campaign/creators/:id", element: protectBusiness(BusinessCampaignCreators) },
  { path: "/business/create-campaign", element: protectBusiness(BusinessCampaignDetail) }, // Or your create campaign component
  { path: "/business/campaign/edit/:id", element: protectBusiness(BusinessCampaignDetail) },
  { path: "/browse-creators", element: protectBusiness(BrowseCreators) },
  
  // Admin routes
  { path: "/admin/dashboard", element: protectAdmin(AdminDashboard) },
  { path: "/admin/*", element: protectAdmin(AdminDashboard) },
  
  // Catch all
  { path: "*", element: <LoginPortal /> },
];
