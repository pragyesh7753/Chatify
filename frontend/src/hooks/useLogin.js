import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../lib/api";
import { getAllCookies, isMobile } from "../lib/mobile-utils";

const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      console.log('Login successful:', data);
      
      // Check cookies after successful login
      if (isMobile()) {
        setTimeout(() => {
          const cookies = getAllCookies();
          console.log('Cookies after login:', cookies);
          console.log('Document cookie string:', document.cookie);
        }, 1000);
      }
      
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      console.error('Login failed:', error);
      
      if (isMobile()) {
        const cookies = getAllCookies();
        console.log('Cookies after failed login:', cookies);
      }
    }
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
