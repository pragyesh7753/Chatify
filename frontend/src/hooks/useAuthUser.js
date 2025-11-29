import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized) - user is simply not logged in
      if (error?.response?.status === 401) {
        return false;
      }
      // Don't retry on 400 (bad request) errors
      if (error?.response?.status === 400) {
        return false;
      }
      // Retry other errors once
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (less than token expiry)
    refetchOnWindowFocus: true, // Check auth on window focus
    refetchOnReconnect: true, // Check auth when reconnecting
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes to keep session alive
    // Don't show errors in console for expected 401s
    onError: (error) => {
      if (error?.response?.status !== 401) {
        console.error('Auth check error:', error);
      }
    },
  });

  return { 
    isLoading: authUser.isLoading, 
    authUser: authUser.data?.user ? {
      ...authUser.data.user,
      token: authUser.data.token
    } : null
  };
};

export default useAuthUser;
