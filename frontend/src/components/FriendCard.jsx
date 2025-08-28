import { Link } from "react-router";
import { formatLastSeen } from "../lib/utils";

const FriendCard = ({ friend }) => {
  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar size-12">
            <img src={friend.profilePic} alt={friend.fullName} />
          </div>
          <h3 className="font-semibold truncate">{friend.fullName}</h3>
        </div>

        {/* ONLINE / OFFLINE STATUS */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`badge text-xs ${friend?.isOnline ? "badge-success" : "badge-outline"}`}
            >
              <span
                className={`inline-block size-2 rounded-full mr-1 ${friend?.isOnline ? "bg-success" : "bg-base-300"}`}
              />
              {friend?.isOnline ? "Online" : "Offline"}
            </span>
          </div>
          {!friend?.isOnline && friend?.lastSeen && (
            <div className="text-xs text-base-content opacity-60 ml-1">
              {formatLastSeen(friend.lastSeen)}
            </div>
          )}
        </div>

        <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full">
          Message
        </Link>
      </div>
    </div>
  );
};
export default FriendCard;

