import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";
import { StreamChat } from "stream-chat";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      // Disconnect from Stream Chat
      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        if (client.userID) {
          await client.disconnectUser();
          console.log("User disconnected from Stream Chat");
        }
      } catch (error) {
        console.error("Error disconnecting from Stream Chat:", error);
      }
      
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
