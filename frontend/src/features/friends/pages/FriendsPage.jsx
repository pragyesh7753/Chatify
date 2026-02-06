import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getOutgoingFriendReqs,
  searchUsersByUsername,
  getUserFriends,
  sendFriendRequest,
} from "@/shared/lib/api";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, Search } from "lucide-react";
import FriendCard from "@/features/friends/components/FriendCard";
import NoFriendsFound from "@/features/friends/components/NoFriendsFound";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    refetchInterval: 10000, // Refetch every 10 seconds to update online status
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
  });

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["userSearch", debouncedSearchQuery],
    queryFn: () => searchUsersByUsername(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length >= 2, // Only search if query is at least 2 characters
  });

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { mutate: sendRequestMutation, isPending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
  });

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient._id);
      });
      setOutgoingRequestsIds(outgoingIds);
    }
  }, [outgoingFriendReqs]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="h-full overflow-y-auto bg-base-100 transition-colors duration-200">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="container mx-auto space-y-10">
          {/* YOUR FRIENDS SECTION */}
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-base-content">Your Friends</h1>
                <p className="text-xs sm:text-sm md:text-base text-base-content opacity-70 mt-1 sm:mt-2">
                  Connect and chat with your friends
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <NoFriendsFound />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {friends.map((friend) => (
                  <FriendCard key={friend._id} friend={friend} />
                ))}
              </div>
            )}
          </section>

          {/* USER SEARCH SECTION */}
          <section>
            <div className="mb-4 sm:mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-base-content">
                    Find Friends
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-base-content opacity-70">
                    Search for users by username and send friend requests
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 sm:size-5 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered w-full pl-9 sm:pl-10 bg-base-200 text-sm sm:text-base"
                />
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-xs sm:text-sm text-base-content/60 mt-2">
                  Please enter at least 2 characters to search
                </p>
              )}
            </div>

            {/* Search Results */}
            {loadingSearch ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : debouncedSearchQuery.length >= 2 && searchResults.length === 0 ? (
              <div className="card bg-base-200 p-4 sm:p-6 text-center">
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-base-content">No users found</h3>
                <p className="text-xs sm:text-sm text-base-content opacity-70">
                  Try searching with a different username
                </p>
              </div>
            ) : debouncedSearchQuery.length >= 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {searchResults.map((user) => {
                  const hasRequestBeenSent = outgoingRequestsIds.has(user._id);

                  return (
                    <div
                      key={user._id}
                      className="card bg-base-200 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="card-body p-4 sm:p-5 space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="avatar size-12 sm:size-16 flex-shrink-0">
                            <div className="rounded-full">
                              <img src={user.profilePic} alt={user.fullName} />
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg text-base-content">{user.fullName}</h3>
                            {user.location && (
                              <div className="flex items-center text-xs text-base-content opacity-70 mt-1">
                                <MapPinIcon className="size-3 mr-1" />
                                {user.location}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge badge-outline">
                            @{user.username}
                          </span>
                        </div>

                        {user.bio && <p className="text-sm text-base-content opacity-70">{user.bio}</p>}

                        {/* Action button */}
                        <button
                          className={`btn w-full mt-2 ${
                            hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                          } `}
                          onClick={() => sendRequestMutation(user._id)}
                          disabled={hasRequestBeenSent || isPending}
                        >
                          {hasRequestBeenSent ? (
                            <>
                              <CheckCircleIcon className="size-4 mr-2" />
                              Request Sent
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="size-4 mr-2" />
                              Send Friend Request
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card bg-base-200 p-6 text-center">
                <h3 className="font-semibold text-lg mb-2 text-base-content">Start searching</h3>
                <p className="text-base-content opacity-70">
                  Enter a username above to find users and send friend requests
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;