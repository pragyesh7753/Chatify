import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getUserFriends } from "@/shared/lib/api";
import { MessageCircleIcon, UsersIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import {
  SearchBar,
  ChatListItem,
  EmptyState,
  LoadingState,
  ErrorState,
  MobileHeader,
  DesktopWelcome,
} from "../components";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: friends = [], isLoading: loadingFriends, error, refetch } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    retry: 2,
  });

  // Loading state
  if (loadingFriends) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Filter friends based on search query
  const filteredFriends = friends.filter((friend) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      friend.fullName?.toLowerCase().includes(query) ||
      friend.username?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full bg-base-200 transition-colors duration-200">
      {/* Mobile Header */}
      <MobileHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Desktop Welcome Screen - Hidden on Mobile */}
      <DesktopWelcome />

      {/* Mobile Chat List */}
      <div className="flex-1 overflow-y-auto bg-base-100 md:hidden transition-colors duration-200">
        {friends.length === 0 ? (
          <EmptyState
            icon={MessageCircleIcon}
            title="No chats yet"
            description="Start a conversation with your friends"
            action={
              <Link to="/friends" className="btn btn-sm btn-primary">
                <UsersIcon className="h-4 w-4 mr-2" />
                Find Friends
              </Link>
            }
          />
        ) : filteredFriends.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No results found"
            description="Try searching with a different name or username"
          />
        ) : (
          <div>
            {filteredFriends.map((friend, index) => (
              <ChatListItem
                key={friend._id}
                friend={friend}
                searchQuery={searchQuery.trim()}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
