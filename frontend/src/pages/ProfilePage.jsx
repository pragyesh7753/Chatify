import { useState, useEffect, useCallback } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import toast from "react-hot-toast";
import { UserIcon, MailIcon, GlobeIcon, MapPinIcon, EditIcon, SaveIcon, XIcon, AtSignIcon } from "lucide-react";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    bio: "",
    profilePic: "",
    nativeLanguage: "",
    location: "",
  });

  const { profile: userProfile, isLoading, error, updateProfile, isUpdating } = useUserProfile();

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        username: userProfile.username || "",
        bio: userProfile.bio || "",
        profilePic: userProfile.profilePic || "",
        nativeLanguage: userProfile.nativeLanguage || "",
        location: userProfile.location || "",
      });
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    
    if (formData.fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters long");
      return;
    }

    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }
    
    if (formData.username.trim().length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }

    if (formData.username.trim().length > 20) {
      toast.error("Username must be less than 20 characters long");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }
    
    // Validate URL if provided
    if (formData.profilePic.trim()) {
      try {
        new URL(formData.profilePic);
      } catch {
        toast.error("Please enter a valid profile picture URL");
        return;
      }
    }
    
    updateProfile(formData);
    setIsEditing(false);
  }, [formData, updateProfile]);

  const handleCancel = useCallback(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        username: userProfile.username || "",
        bio: userProfile.bio || "",
        profilePic: userProfile.profilePic || "",
        nativeLanguage: userProfile.nativeLanguage || "",
        location: userProfile.location || "",
      });
    }
    setIsEditing(false);
  }, [userProfile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isEditing) {
        handleCancel();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s" && isEditing) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    if (isEditing) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isEditing, handleCancel, handleSubmit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-error">Failed to load profile</p>
          <button 
            className="btn btn-primary mt-4" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary btn-sm w-full sm:w-auto"
            >
              <EditIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm w-full sm:w-auto"
                disabled={isUpdating}
              >
                <XIcon className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary btn-sm w-full sm:w-auto"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                ) : (
                  <SaveIcon className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Picture and Basic Info */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="avatar mb-4">
                  <div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img 
                      src={formData.profilePic || "/default-avatar.svg"} 
                      alt="Profile" 
                      onError={(e) => {
                        e.target.src = "/default-avatar.svg";
                      }}
                    />
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="form-control w-full max-w-xs">
                    <label className="label">
                      <span className="label-text">Profile Picture URL</span>
                    </label>
                    <input
                      type="url"
                      name="profilePic"
                      value={formData.profilePic}
                      onChange={handleInputChange}
                      placeholder="Enter image URL"
                      className="input input-bordered w-full max-w-xs"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="card-title text-xl">{userProfile?.fullName}</h2>
                    <div className="flex items-center gap-2 text-base-content/70">
                      <MailIcon className="w-4 h-4" />
                      <span className="text-sm">{userProfile?.email}</span>
                    </div>
                    <div className="text-sm text-base-content/60">
                      Member since {new Date(userProfile?.createdAt).toLocaleDateString()}
                    </div>
                    {userProfile?.isVerified && (
                      <div className="badge badge-success gap-2">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="lg:col-span-2">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Full Name
                      </span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="input input-bordered w-full"
                        required
                      />
                    ) : (
                      <div className="p-3 bg-base-100 rounded-lg">
                        {userProfile?.fullName || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <AtSignIcon className="w-4 h-4" />
                        Username
                      </span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="e.g., john_doe"
                        className="input input-bordered w-full"
                        pattern="^[a-zA-Z0-9_]+$"
                        minLength="3"
                        maxLength="20"
                        required
                      />
                    ) : (
                      <div className="p-3 bg-base-100 rounded-lg">
                        @{userProfile?.username || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Bio</span>
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself..."
                        className="textarea textarea-bordered h-24"
                      />
                    ) : (
                      <div className="p-3 bg-base-100 rounded-lg min-h-[6rem]">
                        {userProfile?.bio || "No bio available"}
                      </div>
                    )}
                  </div>

                  {/* Native Language */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <GlobeIcon className="w-4 h-4" />
                        Native Language
                      </span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="nativeLanguage"
                        value={formData.nativeLanguage}
                        onChange={handleInputChange}
                        placeholder="e.g., English"
                        className="input input-bordered w-full"
                      />
                    ) : (
                      <div className="p-3 bg-base-100 rounded-lg">
                        {userProfile?.nativeLanguage || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4" />
                        Location
                      </span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., New York, USA"
                        className="input input-bordered w-full"
                      />
                    ) : (
                      <div className="p-3 bg-base-100 rounded-lg">
                        {userProfile?.location || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <MailIcon className="w-4 h-4" />
                        Email
                      </span>
                    </label>
                    <div className="p-3 bg-base-300 rounded-lg text-base-content/60">
                      {userProfile?.email}
                      <span className="text-xs ml-2">(Cannot be changed)</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
