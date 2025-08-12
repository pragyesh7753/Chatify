import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";
import { isMobile, getAllCookies } from "../lib/mobile-utils";

const useAuthUser = () => {
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      // Log mobile debugging info before auth check
      if (isMobile()) {
        const cookies = getAllCookies();
        console.log('Auth check on mobile - Available cookies:', cookies);
        console.log('Document cookie string:', document.cookie);
      }
      
      const result = await getAuthUser();
      
      // Log result for mobile debugging
      if (isMobile()) {
        console.log('Auth check result on mobile:', result ? 'SUCCESS' : 'FAILED');
      }
      
      return result;
    },
    retry: false, // auth check
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus (important for mobile)
  });

  return { isLoading: authUser.isLoading, authUser: authUser.data?.user };
};

export default useAuthUser;
