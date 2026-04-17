import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AppShell from "./components/layout/AppShell";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// User Pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LinkManagerPage = lazy(() => import("./pages/LinkManagerPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AudiencePage = lazy(() => import("./pages/AudiencePage"));
const ProfileEditorPage = lazy(() => import("./pages/ProfileEditorPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));

// Admin Pages
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));

// Public Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));  // ← Only once
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App() {
  const { user, accessToken } = useAuthStore();

  const getDefaultRoute = () => {
    if (!accessToken) return "/login";
    if (user?.role === "admin") return "/admin";
    return "/dashboard";
  };

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="/@:username" element={<PublicProfilePage />} />
        <Route path="/:username" element={<PublicProfilePage />} />

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/links" element={<LinkManagerPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard/audience" element={<AudiencePage />} />
            <Route path="/dashboard/appearance" element={<ProfileEditorPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/billing" element={<BillingPage />} />
            <Route path="/dashboard/pricing" element={<PricingPage />} />
            <Route path="/links" element={<LinkManagerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/audience" element={<AudiencePage />} />
            <Route path="/profile-editor" element={<ProfileEditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;