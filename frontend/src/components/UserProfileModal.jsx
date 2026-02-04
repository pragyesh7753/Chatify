import { X, MapPin, Calendar, Globe, Mail } from "lucide-react";
import { useEffect, useRef, memo } from "react";

const UserProfileModal = memo(({ user, isOpen, onClose, isOnline }) => {
    const modalRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={modalRef}
                className="bg-base-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
            >
                {/* Header/Cover Area with Close Button */}
                <div className="relative h-24 bg-gradient-to-r from-primary/20 to-base-200">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 btn btn-ghost btn-circle btn-sm bg-base-100/50 hover:bg-base-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full ring-4 ring-base-100 overflow-hidden bg-base-200">
                            <img
                                src={user.profilePic || "/default-avatar.svg"}
                                alt={user.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isOnline && (
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-success rounded-full ring-2 ring-base-100" title="Online" />
                        )}
                    </div>

                    {/* Name & Basic Info */}
                    <div className="text-center mt-3 mb-6">
                        <h2 className="text-xl font-bold">{user.fullName}</h2>
                        <p className="text-base-content/60 text-sm">@{user.username || "username"}</p>
                    </div>

                    {/* Stats/Details Grid */}
                    <div className="w-full space-y-4">
                        {/* Bio Section */}
                        {user.bio && (
                            <div className="bg-base-200/50 p-3 rounded-xl text-center">
                                <p className="text-sm italic opacity-80">"{user.bio}"</p>
                            </div>
                        )}

                        {/* Info Items */}
                        <div className="grid grid-cols-1 gap-3 text-sm">
                            {user.location && (
                                <div className="flex items-center gap-3 p-2 text-base-content/80">
                                    <MapPin className="w-4 h-4 opacity-70" />
                                    <span>{user.location}</span>
                                </div>
                            )}

                            {user.nativeLanguage && (
                                <div className="flex items-center gap-3 p-2 text-base-content/80">
                                    <Globe className="w-4 h-4 opacity-70" />
                                    <span>Speaks {user.nativeLanguage}</span>
                                </div>
                            )}

                            {user.email && (
                                <div className="flex items-center gap-3 p-2 text-base-content/80">
                                    <Mail className="w-4 h-4 opacity-70" />
                                    <span>{user.email}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-2 text-base-content/80">
                                <Calendar className="w-4 h-4 opacity-70" />
                                <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default UserProfileModal;
