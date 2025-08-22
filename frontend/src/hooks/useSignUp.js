import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../lib/api";

const useSignUp = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      // Don't invalidate auth user since they're not logged in yet
      // The signup response now includes verification info
    },
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;