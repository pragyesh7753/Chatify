import { useState, useEffect, useCallback, useRef } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { resendEmailVerification } from "../lib/api";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UserIcon, MailIcon, GlobeIcon, MapPinIcon, EditIcon, SaveIcon, XIcon, AtSignIcon, CameraIcon, UploadIcon, ShuffleIcon } from "lucide-react";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    bio: "",
    profilePic: "",
    nativeLanguage: "",
    location: "",
  });

  const { profile: userProfile, isLoading, error, updateProfile, isUpdating } = useUserProfile();

  // Email verification resend mutation
  const resendVerificationMutation = useMutation({
    mutationFn: resendEmailVerification,
    onSuccess: () => {
      toast.success("Verification email sent!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send verification email");
    },
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        username: userProfile.username || "",
        email: userProfile.email || "",
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

    // Validate email
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    const submitData = { ...formData };
    if (selectedFile) {
      submitData.profilePic = selectedFile;
    }
    
    updateProfile(submitData);
    setIsEditing(false);
  }, [formData, selectedFile, updateProfile]);

  const handleCancel = useCallback(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        username: userProfile.username || "",
        email: userProfile.email || "",
        bio: userProfile.bio || "",
        profilePic: userProfile.profilePic || "",
        nativeLanguage: userProfile.nativeLanguage || "",
        location: userProfile.location || "",
      });
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
  }, [userProfile]);

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    setFormData({ ...formData, profilePic: randomAvatar });
    setSelectedFile(null);
    setPreviewUrl(null);
    toast.success("Random profile picture generated!");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
        setFormData({ ...formData, profilePic: '' }); // Clear URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
    <div className="h-full overflow-y-auto bg-base-100 transition-colors duration-200">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-base-content">My Profile</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto text-sm"
            >
              <EditIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto text-sm"
                disabled={isUpdating}
              >
                <XIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto text-sm"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-xs sm:loading-sm mr-2"></span>
                ) : (
                  <SaveIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Profile Picture and Basic Info */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-lg sm:shadow-xl">
              <div className="card-body items-center text-center p-4 sm:p-6">
                <div className="avatar mb-3 sm:mb-4">
                  <div className="w-24 sm:w-28 md:w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img 
                      src={previewUrl || formData.profilePic || "/default-avatar.svg"} 
                      alt="Profile" 
                      onError={(e) => {
                        e.target.src = "/default-avatar.svg";
                      }}
                    />
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="space-y-3 sm:space-y-4 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={handleUploadClick} className="btn btn-primary btn-xs sm:btn-sm text-xs sm:text-sm">
                        <UploadIcon className="size-3 sm:size-4 mr-1 sm:mr-2" />
                        Upload Photo
                      </button>
                      <button type="button" onClick={handleRandomAvatar} className="btn btn-accent btn-xs sm:btn-sm text-xs sm:text-sm">
                        <ShuffleIcon className="size-3 sm:size-4 mr-1 sm:mr-2" />
                        Random Avatar
                      </button>
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-base-content opacity-70">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="card-title text-base sm:text-lg md:text-xl">{userProfile?.fullName}</h2>
                    <div className="text-xs sm:text-sm text-base-content/60">
                      Member since {new Date(userProfile?.createdAt).toLocaleDateString()}
                    </div>
                    {userProfile?.isVerified && (
                      <div className="badge badge-success gap-1 sm:gap-2 text-xs">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
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
            <div className="card bg-base-200 shadow-lg sm:shadow-xl">
              <div className="card-body p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Full Name */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        Full Name
                      </span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="input input-bordered w-full text-sm sm:text-base"
                        required
                      />
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg text-sm sm:text-base">
                        {userProfile?.fullName || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <AtSignIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
                        className="input input-bordered w-full text-sm sm:text-base"
                        pattern="^[a-zA-Z0-9_]+$"
                        minLength="3"
                        maxLength="20"
                        required
                      />
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg text-sm sm:text-base">
                        @{userProfile?.username || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-xs sm:text-sm">Bio</span>
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself..."
                        className="textarea textarea-bordered h-20 sm:h-24 text-sm sm:text-base"
                      />
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg min-h-[5rem] sm:min-h-[6rem] text-sm sm:text-base">
                        {userProfile?.bio || "No bio available"}
                      </div>
                    )}
                  </div>

                  {/* Native Language */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <GlobeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
                        className="input input-bordered w-full text-sm sm:text-base"
                      />
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg text-sm sm:text-base">
                        {userProfile?.nativeLanguage || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
                        className="input input-bordered w-full text-sm sm:text-base"
                      />
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg text-sm sm:text-base">
                        {userProfile?.location || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <MailIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        Email
                      </span>
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="input input-bordered w-full text-sm sm:text-base"
                          required
                        />
                        {userProfile?.email !== formData.email && (
                          <div className="text-[10px] sm:text-xs text-warning">
                            ⚠️ Changing email will require verification of the new email address
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 sm:p-3 bg-base-100 rounded-lg text-sm sm:text-base">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{userProfile?.email || "Not set"}</div>
                            {userProfile?.pendingEmail && (
                              <div className="text-[10px] sm:text-xs text-warning mt-1">
                                Pending change to: {userProfile.pendingEmail}
                              </div>
                            )}
                          </div>
                          {!userProfile?.isVerified && (
                            <button
                              onClick={() => resendVerificationMutation.mutate()}
                              disabled={resendVerificationMutation.isPending}
                              className="btn btn-warning btn-xs text-[10px] sm:text-xs ml-2 flex-shrink-0"
                            >
                              {resendVerificationMutation.isPending ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "Verify"
                              )}
                            </button>
                          )}
                        </div>
                        {!userProfile?.isVerified && (
                          <div className="text-[10px] sm:text-xs text-warning mt-2">
                            ⚠️ Email not verified - Click "Verify" to resend verification email
                          </div>
                        )}
                      </div>
                    )}
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