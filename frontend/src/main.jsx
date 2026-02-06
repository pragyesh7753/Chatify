import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "@/app/App";

import { BrowserRouter } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocketProvider } from "@/features/chat/context/SocketContext";
import { CallProvider } from "@/features/call/context/CallProvider";

// Export queryClient so it can be used in axios interceptors
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch on window focus for security
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 1, // Only retry failed requests once
      staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </SocketProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);