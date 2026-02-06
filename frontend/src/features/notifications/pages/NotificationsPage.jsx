import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, getFriendRequests } from "@/shared/lib/api";
import { BellIcon, ClockIcon, MessageSquareIcon, UserCheckIcon } from "lucide-react";
import NoNotificationsFound from "@/shared/components/NoNotificationsFound";

const NotificationsPage = () => {
  const queryClient = useQueryClient();

  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequestMutation, isPending } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const incomingRequests = friendRequests?.incomingReqs?.filter(request => request?.sender) || [];
  const acceptedRequests = friendRequests?.acceptedReqs?.filter(notification => notification?.recipient) || [];

  return (
    <div className="h-full overflow-y-auto bg-base-100 transition-colors duration-200">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 sm:mb-6 text-base-content">Notifications</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {incomingRequests.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                  <UserCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Friend Requests
                  <span className="badge badge-primary ml-2 text-xs">{incomingRequests.length}</span>
                </h2>

                <div className="space-y-3">
                  {incomingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="card-body p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <div className="avatar w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                              <div className="rounded-full bg-base-300">
                                <img 
                                  src={request.sender?.profilePic || "/default-avatar.svg"} 
                                  alt={request.sender?.fullName || "User"} 
                                  onError={(e) => { e.target.src = "/default-avatar.svg"; }}
                                />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{request.sender?.fullName || "Unknown User"}</h3>
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1">
                                <span className="badge badge-secondary badge-xs sm:badge-sm text-[10px] sm:text-xs">
                                  Native: {request.sender?.nativeLanguage || "N/A"}
                                </span>
                                <span className="badge badge-outline badge-xs sm:badge-sm text-[10px] sm:text-xs">
                                  @{request.sender?.username || "unknown"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            className="btn btn-primary btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                            onClick={() => acceptRequestMutation(request._id)}
                            disabled={isPending}
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ACCEPTED REQS NOTIFICATONS */}
            {acceptedRequests.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                  <BellIcon className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  New Connections
                </h2>

                <div className="space-y-3">
                  {acceptedRequests.map((notification) => (
                    <div key={notification._id} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="avatar mt-1 size-8 sm:size-10 flex-shrink-0">
                            <div className="rounded-full">
                              <img
                                src={notification.recipient?.profilePic || "/default-avatar.svg"}
                                alt={notification.recipient?.fullName || "User"}
                                onError={(e) => { e.target.src = "/default-avatar.svg"; }}
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{notification.recipient?.fullName || "Unknown User"}</h3>
                            <p className="text-xs sm:text-sm my-1">
                              {notification.recipient?.fullName || "Someone"} accepted your friend request
                            </p>
                            <p className="text-[10px] sm:text-xs flex items-center opacity-70">
                              <ClockIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                              Recently
                            </p>
                          </div>
                          <div className="badge badge-success text-[10px] sm:text-xs flex-shrink-0">
                            <MessageSquareIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            New Friend
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {incomingRequests.length === 0 && acceptedRequests.length === 0 && (
              <NoNotificationsFound />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};
export default NotificationsPage;
