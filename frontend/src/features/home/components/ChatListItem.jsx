import { Link } from "react-router";

const HighlightText = ({ text, query }) => {
    if (!query || !text) return text;

    const idx = String(text).toLowerCase().indexOf(String(query).toLowerCase());
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);

    return (
        <>
            {before}
            <span className="bg-gradient-to-r from-primary/20 to-secondary/20 font-semibold px-1 rounded">
                {match}
            </span>
            {after}
        </>
    );
};

const ChatListItem = ({ friend, searchQuery, index = 0 }) => (
    <Link
        to={`/chat/${friend._id}`}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-base-200 border-b border-base-300 transition-all active:scale-[0.98] group"
        style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` }}
    >
        <div className="avatar">
            <div className="w-12 h-12 rounded-full ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                <img
                    src={friend.profilePic}
                    alt={friend.fullName}
                    onError={(e) => e.target.src = "/default-avatar.svg"}
                    className="object-cover"
                />
            </div>
            {friend.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-base-100 animate-pulse" />
            )}
        </div>

        <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
                <HighlightText text={friend.fullName} query={searchQuery} />
            </h3>
            <p className="text-sm text-base-content/70 truncate group-hover:text-base-content/90 transition-colors">
                @<HighlightText text={friend.username} query={searchQuery} />
            </p>
        </div>
    </Link>
);

export default ChatListItem;


