import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: false, // Don't retry auth checks
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: true, // Always check auth on window focus for security
    refetchOnReconnect: true, // Check auth when reconnecting
  });

  return { isLoading: authUser.isLoading, authUser: authUser.data?.user };
};
export default useAuthUser;
