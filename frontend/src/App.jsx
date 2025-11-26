import { Navigate, Route, Routes } from "react-router";
import { useEffect } from "react";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import NotificationsPage from "./pages/NotificationsPage";
import FriendsPage from "./pages/FriendsPage";
import CallPage from "./pages/CallPage";
import ChatPage from "./pages/ChatPage";
import OnboardingPage from "./pages/OnboardingPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import EmailChangeVerificationPage from "./pages/EmailChangeVerificationPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ConnectionStatus from "./components/OfflineIndicator";
import ErrorBoundary from "./components/ErrorBoundary";
import useAuthUser from "./hooks/useAuthUser.js";
import { useTokenRefresh } from "./hooks/useTokenRefresh.js";
import Layout from "./components/Layout";
import LayoutWithSidebar from "./components/LayoutWithSidebar";
import { useThemeStore } from "./store/useThemeStore.js";

import { SpeedInsights } from "@vercel/speed-insights/react"

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  // Auto-refresh tokens before they expire
  useTokenRefresh(isAuthenticated);

  // Apply theme to document element
  useEffect(() => {
    const isDarkTheme = [
      "dark", "synthwave", "halloween", "forest", "black", 
      "luxury", "dracula", "business", "night", "coffee"
    ].includes(theme);
    
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  if (isLoading) return <PageLoader />;

  return (
    <ErrorBoundary>
      <div className="h-screen" data-theme={theme}>
        <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <HomePage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/login"
          element={
            !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/verify-email"
          element={<EmailVerificationPage />}
        />
        <Route
          path="/verify-email-change"
          element={<EmailChangeVerificationPage />}
        />
        <Route
          path="/forgot-password"
          element={!isAuthenticated ? <ForgotPasswordPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />}
        />
        <Route
          path="/reset-password"
          element={!isAuthenticated ? <ResetPasswordPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />}
        />
        <Route
          path="/friends"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <FriendsPage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <NotificationsPage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <ProfilePage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <SettingsPage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/call/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <CallPage />
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/chat/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <LayoutWithSidebar>
                <ChatPage />
              </LayoutWithSidebar>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

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
      </Routes>

      <Toaster />
      <PWAInstallPrompt />
      <ConnectionStatus />
      <SpeedInsights />
    </div>
    </ErrorBoundary>
  );
};
export default App;