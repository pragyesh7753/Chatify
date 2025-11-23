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
      // Retry other errors once
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (less than token expiry)
    refetchOnWindowFocus: true, // Check auth on window focus
    refetchOnReconnect: true, // Check auth when reconnecting
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes to keep session alive
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
