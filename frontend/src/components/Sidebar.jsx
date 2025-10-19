import { Link, useLocation } from "react-router";
import { useState, useEffect } from "react";
import {
    MessageCircleIcon,
    UsersIcon,
    BellIcon,
    Settings,
    SearchIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

const Sidebar = ({ friends = [] }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    const activeChatId = currentPath.startsWith("/chat/") ? currentPath.split("/chat/")[1] : null;
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem("chatify-sidebar-collapsed");
        return saved === "true";
    });

    // Notify ResizableSplitter when collapse state changes
    useEffect(() => {
        // Dispatch custom event to notify ResizableSplitter
        window.dispatchEvent(new CustomEvent("sidebar-collapse-change", {
            detail: { key: "chatify-sidebar-collapsed", value: isCollapsed }
        }));
    }, [isCollapsed]);

    const toggleCollapse = () => {
        setIsCollapsed((prev) => {
            const newValue = !prev;
            localStorage.setItem("chatify-sidebar-collapsed", String(newValue));
            return newValue;
        });
    };

    return (
        <div className="chat-list-container bg-base-200 flex flex-col h-full w-full">
            {/* Header */}
            <div className={`bg-base-200 py-3 flex items-center transition-colors duration-200 ${isCollapsed ? "px-2 justify-center" : "px-4 justify-between"}`}>
                {!isCollapsed && (
                    <>
                        <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
                            <img src="/favicon.png" alt="Chatify" className="size-8 flex-shrink-0" />
                            <span className="text-xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider truncate">
                                Chatify
                            </span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link to="/friends" className="btn btn-ghost btn-sm btn-circle" title="Friends">
                                <UsersIcon className="h-5 w-5 text-base-content opacity-70" />
                            </Link>
                            <Link to="/notifications" className="btn btn-ghost btn-sm btn-circle" title="Notifications">
                                <BellIcon className="h-5 w-5 text-base-content opacity-70" />
                            </Link>
                            <Link to="/settings" className="btn btn-ghost btn-sm btn-circle" title="Settings">
                                <Settings className="h-5 w-5 text-base-content opacity-70" />
                            </Link>
                        </div>
                    </>
                )}
                {isCollapsed && (
                    <Link to="/" className="flex items-center justify-center">
                        <img src="/favicon.png" alt="Chatify" className="size-8" />
                    </Link>
                )}
            </div>

            {/* Collapse/Expand Button */}
            <div className="px-2 py-2 bg-base-200 border-b border-base-300">
                <button
                    onClick={toggleCollapse}
                    className="btn btn-ghost btn-sm w-full justify-center gap-2"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="text-xs">Collapse</span>
                        </>
                    )}
                </button>
            </div>

            {/* Search Bar */}
            {!isCollapsed && (
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
            )}

            {/* Collapsed Menu Icons */}
            {isCollapsed && (
                <div className="flex flex-col items-center gap-2 py-2 border-b border-base-300">
                    <Link to="/friends" className="btn btn-ghost btn-sm btn-circle" title="Friends">
                        <UsersIcon className="h-5 w-5 text-base-content opacity-70" />
                    </Link>
                    <Link to="/notifications" className="btn btn-ghost btn-sm btn-circle" title="Notifications">
                        <BellIcon className="h-5 w-5 text-base-content opacity-70" />
                    </Link>
                    <Link to="/settings" className="btn btn-ghost btn-sm btn-circle" title="Settings">
                        <Settings className="h-5 w-5 text-base-content opacity-70" />
                    </Link>
                </div>
            )}

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto bg-base-100 transition-colors duration-200">
                {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageCircleIcon className={`${isCollapsed ? "h-8 w-8" : "h-16 w-16"} text-base-content opacity-30 mb-4`} />
                        {!isCollapsed && (
                            <>
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
                            </>
                        )}
                    </div>
                ) : (
                    <div>
                        {friends.map((friend) => {
                            const isActive = activeChatId === friend._id;
                            return (
                                <Link
                                    key={friend._id}
                                    to={`/chat/${friend._id}`}
                                    className={`flex items-center gap-3 ${isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-3"} hover:bg-base-200 border-b border-base-300 transition-colors duration-200 ${isActive ? "bg-base-300" : ""
                                        }`}
                                    title={isCollapsed ? friend.fullName : ""}
                                >
                                    <div className="avatar">
                                        <div className={`${isCollapsed ? "w-10 h-10" : "w-12 h-12"} rounded-full`}>
                                            <img
                                                src={friend.profilePic}
                                                alt={friend.fullName}
                                                onError={(e) => {
                                                    e.target.src = "/default-avatar.svg";
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {!isCollapsed && (
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
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
