import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import { MessageCircleIcon } from "lucide-react";

const HomePage = () => {
  const { data: _friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  if (loadingFriends) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f0f2f5] dark:bg-[#222e35]">
        <span className="loading loading-spinner loading-lg text-[#00a884]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-base-200 border-l border-base-300 transition-colors duration-200">
      <div className="text-center px-8">
        <div className="mb-6">
          <img 
            src="/favicon.png" 
            alt="Chatify" 
            className="w-20 h-20 mx-auto opacity-80"
          />
        </div>
        
        <h1 className="text-3xl font-light text-base-content mb-4">
          Chatify for Windows
        </h1>
        
        <p className="text-base-content opacity-70 mb-8 max-w-md">
          Send and receive messages without keeping your phone online.<br />
          Select a chat from the list to start messaging.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-base-content opacity-60 pt-4">
          <svg viewBox="0 0 10 12" width="10" height="12" className="fill-current">
            <path d="M5 1.5A2.5 2.5 0 0 0 2.5 4v1h5V4A2.5 2.5 0 0 0 5 1.5zm-4 4v6h8v-6h-8zm4 3.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
