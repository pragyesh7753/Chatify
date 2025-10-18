import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";

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
        <div>
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
      </div>
    </div>
  );
};

export default HomePage;
