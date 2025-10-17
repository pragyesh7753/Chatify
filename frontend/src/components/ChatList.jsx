import { Link, useLocation } from "react-router";
import { 
  MessageCircleIcon, 
  UsersIcon, 
  BellIcon, 
  UserIcon, 
  Settings, 
  SearchIcon,
  MoreVerticalIcon,
  MessageSquarePlusIcon
} from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";

const ChatList = ({ friends = [] }) => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;
  const activeChatId = currentPath.startsWith("/chat/") ? currentPath.split("/chat/")[1] : null;

  return (
    <div className="w-full bg-base-200 flex flex-col h-full transition-colors duration-200">
      {/* Header */}
      <div className="bg-base-200 px-4 py-3 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="avatar">
            <div className="w-10 h-10 rounded-full">
              <img 
                src={authUser?.profilePic} 
                alt="User Avatar"
                onError={(e) => {
                  e.target.src = "/default-avatar.svg";
                }}
              />
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/friends" className="btn btn-ghost btn-sm btn-circle">
            <UsersIcon className="h-5 w-5 text-base-content opacity-70" />
          </Link>
          <Link to="/notifications" className="btn btn-ghost btn-sm btn-circle">
            <BellIcon className="h-5 w-5 text-base-content opacity-70" />
          </Link>
          <Link to="/settings" className="btn btn-ghost btn-sm btn-circle">
            <Settings className="h-5 w-5 text-base-content opacity-70" />
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 bg-base-200 transition-colors duration-200">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content opacity-50" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-4 py-2 bg-base-100 border border-base-300 rounded-lg text-sm text-base-content placeholder:text-base-content placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-base-100 transition-colors duration-200">
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
            {friends.map((friend) => {
              const isActive = activeChatId === friend._id;
              return (
                <Link
                  key={friend._id}
                  to={`/chat/${friend._id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-base-200 border-b border-base-300 transition-colors duration-200 ${
                    isActive ? "bg-base-300" : ""
                  }`}
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
                      <span className="text-xs text-base-content opacity-60">
                        {/* You can add timestamp here */}
                      </span>
                    </div>
                    <p className="text-sm text-base-content opacity-70 truncate">
                      @{friend.username}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
