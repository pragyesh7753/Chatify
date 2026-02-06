import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/shared/lib/api";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      // Clear the authUser query instead of invalidating to prevent refetch
      queryClient.setQueryData(["authUser"], null);
      queryClient.removeQueries({ queryKey: ["authUser"] });
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
