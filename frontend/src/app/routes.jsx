import { Navigate, Outlet, Route, Routes } from "react-router";

import HomePage from "@/features/home/pages/HomePage";
import SignUpPage from "@/features/auth/pages/SignUpPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import FriendsPage from "@/features/friends/pages/FriendsPage";
import ChatPage from "@/features/chat/pages/ChatPage";
import OnboardingPage from "@/features/profile/pages/OnboardingPage";
import EmailVerificationPage from "@/features/auth/pages/EmailVerificationPage";
import EmailChangeVerificationPage from "@/features/auth/pages/EmailChangeVerificationPage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import SettingsPage from "@/features/profile/pages/SettingsPage";

import LayoutWithSidebar from "@/shared/components/LayoutWithSidebar";

const ProtectedRoutes = ({ isAuthenticated, isOnboarded }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isOnboarded) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <LayoutWithSidebar>
      <Outlet />
    </LayoutWithSidebar>
  );
};

const PublicRoutes = ({ isAuthenticated, isOnboarded }) => {
  if (isAuthenticated) {
    return <Navigate to={isOnboarded ? "/" : "/onboarding"} />;
  }

  return <Outlet />;
};

const AppRoutes = ({ isAuthenticated, isOnboarded }) => (
  <Routes>
    <Route
      path="/onboarding"
      element={
        isAuthenticated ? (
          !isOnboarded ? (
            <OnboardingPage />
          ) : (
            <Navigate to="/" />
          )
        ) : (
          <Navigate to="/login" />
        )
      }
    />
    <Route element={<PublicRoutes isAuthenticated={isAuthenticated} isOnboarded={isOnboarded} />}>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/verify-email-change" element={<EmailChangeVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>
    <Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} isOnboarded={isOnboarded} />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />
    </Route>
  </Routes>
);

export default AppRoutes;
