import { useEffect } from "react";
import AppRoutes from "@/app/routes";
import { Toaster } from "react-hot-toast";

import PageLoader from "@/shared/components/PageLoader";
import PWAInstallPrompt from "@/shared/components/PWAInstallPrompt";
import ConnectionStatus from "@/shared/components/OfflineIndicator";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import CallManager from "@/features/call/components/CallManager";
import useAuthUser from "@/features/auth/hooks/useAuthUser";
import { useTokenRefresh } from "@/shared/hooks/useTokenRefresh";
import { useFCM } from "@/features/notifications/hooks/useFCM";
import { useThemeStore } from "@/store/useThemeStore";

import { SpeedInsights } from "@vercel/speed-insights/react"

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  // Auto-refresh tokens before they expire
  useTokenRefresh(isAuthenticated);

  // Setup FCM for push notifications
  useFCM();

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
        <AppRoutes isAuthenticated={isAuthenticated} isOnboarded={isOnboarded} />

      <Toaster />
      <PWAInstallPrompt />
      <ConnectionStatus />
      <CallManager />
      <SpeedInsights />
      </div>
    </ErrorBoundary>
  );
};
export default App;