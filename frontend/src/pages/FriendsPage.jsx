import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
} from "../lib/api";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon } from "lucide-react";
import { capitalize } from "../lib/utils";
import FriendCard from "../components/FriendCard";
import { getLanguageFlag } from "../lib/flags";
import NoFriendsFound from "../components/NoFriendsFound";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    refetchInterval: 10000, // Refetch every 10 seconds to update online status
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
  });

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
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

  return (
    <div className="h-full overflow-y-auto bg-base-100 transition-colors duration-200">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto space-y-10">
          {/* YOUR FRIENDS SECTION */}
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">Your Friends</h1>
                <p className="text-base-content opacity-70 mt-2">
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

          {/* SUGGESTED CONTACTS SECTION */}
          <section>
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                    Suggested Contacts
                  </h2>
                  <p className="text-base-content opacity-70">
                    Suggested friends you may know or want to connect with.
                  </p>
                </div>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : recommendedUsers.length === 0 ? (
              <div className="card bg-base-200 p-6 text-center">
                <h3 className="font-semibold text-lg mb-2 text-base-content">No recommendations available</h3>
                <p className="text-base-content opacity-70">
                  Check back later for new suggestions!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedUsers.map((user) => {
                  const hasRequestBeenSent = outgoingRequestsIds.has(user._id);

                  return (
                    <div
                      key={user._id}
                      className="card bg-base-200 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="card-body p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="avatar size-16 rounded-full">
                            <img src={user.profilePic} alt={user.fullName} />
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

                        {/* Languages with flags */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge badge-secondary">
                            {getLanguageFlag(user.nativeLanguage)}
                            Native: {capitalize(user.nativeLanguage)}
                          </span>
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;