import { createBrowserRouter, RouteObject, redirect } from "react-router";
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

import { BecomeBusiness } from "./screens/become-business";
import { Businesses } from "./screens/-businesses";
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
import { RootLayout } from "./components/layout";
import { CampaignDetails } from "./screens/campaign-details";
import { Settings } from "./screens/settings";
import { BusinessSettings } from "./screens/business-settings";
import { BecomeCreator, AdminApplicationQueue } from "./screens/become-creator";
import { AdminDashboard } from "./screens/admin-dashboard";
import { EditProfile } from "./screens/edit-profile";
import { supabase } from "./lib/supabase";
import { Suspense } from "react";

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect("/login/portal");
  return null;
}

async function requireCreator() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect("/login/portal");
  if (session.user.user_metadata?.user_type !== 'creator') return redirect("/business/dashboard");
  return null;
}

async function requireBusiness() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect("/login/portal");
  if (session.user.user_metadata?.user_type !== 'business') return redirect("/dashboard");
  return null;
}

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return redirect("/login/portal");
  const { data: adminProfile } = await supabase.from('admin_profiles').select('id').eq('id', session.user.id).single();
  const isAdmin = !!adminProfile || session.user.app_metadata?.role === 'admin';
  if (!isAdmin) return redirect("/");
  return null;
}

async function redirectIfAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const t = session.user.user_metadata?.user_type;
    if (t === 'creator') return redirect("/dashboard");
    if (t === 'business') return redirect("/business/dashboard");
  }
  return null;
}

async function loadUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { user: null, profile: null };
  const userType = session.user.user_metadata?.user_type;
  if (userType === 'creator') {
    const { data: profile } = await supabase.from('creators').select('*').eq('user_id', session.user.id).single();
    return { user: session.user, profile, userType };
  }
  if (userType === 'business') {
    const { data: profile } = await supabase.from('businesses').select('*').eq('user_id', session.user.id).single();
    return { user: session.user, profile, userType };
  }
  return { user: session.user, profile: null, userType };
}

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading application...</p>
    </div>
  </div>
);

const routes: RouteObject[] = [
  {
    path: "/",
    // ✅ Use ONLY Component — never mix element + Component on the same route
    Component: RootLayout,
    loader: loadUser,
    children: [
      { index: true,             Component: Home,          loader: redirectIfAuthenticated },
      { path: "login/portal",    Component: LoginPortal,   loader: redirectIfAuthenticated },
      { path: "login/creator",   Component: CreatorLogin,  loader: redirectIfAuthenticated },
      { path: "login/business",  Component: BusinessLogin, loader: redirectIfAuthenticated },
      { path: "become-creator",  Component: BecomeCreator, loader: redirectIfAuthenticated },
      { path: "become-business", Component: BecomeBusiness,loader: redirectIfAuthenticated },

      // Creator routes
      { path: "dashboard",                      Component: Dashboard,             loader: requireCreator },
      { path: "profile/:id",                    Component: Profile,               loader: requireCreator },
      { path: "profile/edit",                   Component: EditProfile,           loader: requireCreator }, // ← new
      { path: "campaigns",                      Component: Campaigns,             loader: requireCreator },
      { path: "creator/campaign/:id",           Component: CreatorCampaignDetail, loader: requireCreator },
      { path: "creator/upcoming-gig/:id",       Component: UpcomingGigDetail,     loader: requireCreator },
      { path: "campaign/live-update/:id",       Component: LiveCampaignUpdate,    loader: requireCreator },
      { path: "browse-businesses",              Component: BrowseBusinesses,      loader: requireCreator },
      { path: "gig-accepted",                   Component: GigAccepted,           loader: requireCreator },
      { path: "settings",                       Component: Settings,              loader: requireCreator },

      // Business routes
      { path: "business/dashboard",             Component: BusinessDashboard,         loader: requireBusiness },
      { path: "business/profile",               Component: BusinessProfile,           loader: requireBusiness },
      { path: "campaign/type",                  Component: CampaignTypeSelection,     loader: requireBusiness },
      { path: "campaign/setup/banner",          Component: CampaignSetupBanner,       loader: requireBusiness },
      { path: "campaign/setup/banner-promo",    Component: CampaignSetupBannerPromo,  loader: requireBusiness },
      { path: "campaign/setup/promo-only",      Component: CampaignSetupPromoOnly,    loader: requireBusiness },
      { path: "campaign/create",                Component: CampaignCreation,          loader: requireBusiness },
      { path: "campaign/confirm",               Component: CampaignConfirm,           loader: requireBusiness },
      { path: "payment/held",                   Component: PaymentHeld,               loader: requireBusiness },
      { path: "campaign/confirmed",             Component: CampaignAcceptedBusiness,  loader: requireBusiness },
      { path: "campaign/declined",              Component: CampaignDeclined,          loader: requireBusiness },
      { path: "campaign/:id",                   Component: CampaignDetails,           loader: requireBusiness },
      { path: "business/campaign/overview/:id", Component: BusinessCampaignOverview,  loader: requireBusiness },
      { path: "business/campaign/:id",          Component: BusinessCampaignCreators,  loader: requireBusiness },
      { path: "business/campaign/:campaignId/creator/:creatorId", Component: BusinessCampaignDetail, loader: requireBusiness },
      { path: "business/submission-success",    Component: BusinessSubmissionSuccess, loader: requireBusiness },
      { path: "browse",                         Component: Browse,                    loader: requireAuth },
      { path: "business/settings",              Component: BusinessSettings,          loader: requireBusiness },

      // Shared routes
      { path: "messages",      Component: MessagesInbox, loader: requireAuth },
      { path: "messages/:id",  Component: MessageThread, loader: requireAuth },
      { path: "notifications", Component: Notifications, loader: requireAuth },

      // Admin routes
      { path: "admin",               Component: AdminDashboard,        loader: requireAdmin },
      { path: "admin/applications",  Component: AdminApplicationQueue, loader: requireAdmin },
      { path: "*", Component: NotFound },
    ],
  },
];

export const router = createBrowserRouter(routes);

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-[#1D1D1D] px-8">
      <div className="w-16 h-16 bg-[#1D1D1D] flex items-center justify-center mb-6">
        <span className="text-white font-black text-2xl italic">?</span>
      </div>
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">404</h1>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1D]/40 italic mb-8">Page not found</p>
      <a href="/" className="px-6 py-3 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest italic hover:bg-[#389C9A] transition-colors">
        Go Home
      </a>
    </div>
  );
}
