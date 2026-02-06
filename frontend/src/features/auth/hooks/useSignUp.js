import { useMutation } from "@tanstack/react-query";
import { signup } from "@/shared/lib/api";

const useSignUp = () => {
  const { mutate, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      // Don't invalidate auth user since they're not logged in yet
      // The signup response now includes verification info
    },
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;