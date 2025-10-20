import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getUserFriends } from "../lib/api";
import { MessageCircleIcon, UsersIcon, SearchIcon, AlertCircleIcon } from "lucide-react";

const HomePage = () => {
  const { data: friends = [], isLoading: loadingFriends, error, refetch } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    retry: 2,
  });

  if (loadingFriends) {
    return (
      <div className="flex items-center justify-center h-full bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-base-200 p-8">
        <AlertCircleIcon className="h-16 w-16 text-error mb-4" />
        <h3 className="text-lg font-semibold text-base-content mb-2">
          Failed to load friends
        </h3>
        <p className="text-sm text-base-content opacity-70 mb-4 text-center">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button onClick={() => refetch()} className="btn btn-sm btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-base-200 transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-base-200 border-b border-base-300 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Chatify" className="w-8 h-8" />
            <span className="text-xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              Chatify
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content opacity-50" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-4 py-2 bg-base-100 border border-base-300 rounded-lg text-sm text-base-content placeholder:text-base-content placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
          />
        </div>
      </div>

      {/* Desktop Welcome Screen - Hidden on Mobile */}
      <div className="hidden md:flex flex-col items-center justify-center h-full">
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

      {/* Mobile Chat List */}
      <div className="flex-1 overflow-y-auto bg-base-100 md:hidden transition-colors duration-200">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircleIcon className="h-16 w-16 text-base-content opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-base-content mb-2">
              No chats yet
            </h3>
            <p className="text-sm text-base-content opacity-70 mb-4">
              Start a conversation with your friends
            </p>
            <Link to="/friends" className="btn btn-sm btn-primary">
              <UsersIcon className="h-4 w-4 mr-2" />
              Find Friends
            </Link>
          </div>
        ) : (
          <div>
            {friends.map((friend) => (
              <Link
                key={friend._id}
                to={`/chat/${friend._id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-base-200 border-b border-base-300 transition-colors duration-200 active:bg-base-300"
              >
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full">
                    <img
                      src={friend.profilePic}
                      alt={friend.fullName}
                      onError={(e) => {
                        e.target.src = "/default-avatar.svg";
                      }}
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-base-content truncate">
                      {friend.fullName}
                    </h3>
                  </div>
                  <p className="text-sm text-base-content opacity-70 truncate">
                    @{friend.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
