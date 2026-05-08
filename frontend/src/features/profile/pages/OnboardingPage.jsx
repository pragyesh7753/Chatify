import { useState, useRef } from "react";
import useAuthUser from "@/features/auth/hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "@/shared/lib/api";
import { LoaderIcon, MapPinIcon, ShipWheelIcon, ShuffleIcon, CameraIcon, UploadIcon } from "lucide-react";
import { LANGUAGES } from "@/shared/constants";

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    username: authUser?.username || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },

    onError: (error) => {
      toast.error(error.response.data.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = { ...formState };
    if (selectedFile) {
      submitData.profilePic = selectedFile;
    }

    onboardingMutation(submitData);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    setFormState({ ...formState, profilePic: randomAvatar });
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
        setFormState({ ...formState, profilePic: '' }); // Clear random avatar
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen w-full relative overflow-x-hidden overflow-y-auto bg-base-200/50" data-theme="forest">
      {/* Background decoration - fixed so it stays in place while scrolling */}
      <div className="fixed top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-secondary/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Inner wrapper ensures scroll height expands and card stays vertically centered */}
      <div className="min-h-full w-full py-10 px-4 sm:px-6 flex flex-col">
        <div className="max-w-2xl w-full mx-auto my-auto bg-base-100/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-primary/10 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Complete Your Profile</h1>
          <p className="text-center text-sm text-base-content/70 mb-8">Let's get to know you better!</p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                {/* PROFILE PIC CONTAINER */}
                <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                  {/* IMAGE PREVIEW */}
                  <div className="relative group">
                    <div className="size-24 sm:size-28 md:size-32 rounded-full bg-base-300 overflow-hidden border-4 border-base-100 shadow-xl transition-transform duration-300 group-hover:scale-105">
                      {previewUrl || formState.profilePic ? (
                        <img
                          src={previewUrl || formState.profilePic}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <CameraIcon className="size-10 sm:size-12 text-base-content opacity-40" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload and Random Avatar Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <button type="button" onClick={handleUploadClick} className="btn btn-primary btn-sm sm:btn-md text-sm w-full sm:w-auto">
                      <UploadIcon className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                      Upload Photo
                    </button>
                    <button type="button" onClick={handleRandomAvatar} className="btn btn-accent btn-sm sm:btn-md text-sm w-full sm:w-auto">
                      <ShuffleIcon className="size-3 sm:size-4 mr-1.5 sm:mr-2" />
                      Random Avatar
                    </button>
                  </div>

                  {selectedFile && (
                    <p className="text-xs sm:text-sm text-base-content opacity-70 text-center">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                {/* FULL NAME */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Full Name</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formState.fullName}
                    onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                    className="input input-bordered w-full text-sm sm:text-base"
                    placeholder="Your full name"
                  />
                </div>

                {/* USERNAME */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Username</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formState.username}
                    onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                    className="input input-bordered w-full text-sm sm:text-base"
                    placeholder="your_username"
                    pattern="^[a-zA-Z0-9_]+$"
                    minLength="3"
                    maxLength="20"
                  />
                  <label className="label">
                    <span className="label-text-alt text-[10px] sm:text-xs">3-20 characters, letters, numbers, and underscores only</span>
                  </label>
                </div>

                {/* BIO */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Bio</span>
                  </label>
                  <textarea
                    name="bio"
                    value={formState.bio}
                    onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                    className="textarea textarea-bordered h-20 sm:h-24 text-sm sm:text-base"
                    placeholder="Tell others about yourself"
                  />
                </div>

                {/* NATIVE LANGUAGE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Native Language</span>
                  </label>
                  <select
                    name="nativeLanguage"
                    value={formState.nativeLanguage}
                    onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                    className="select select-bordered w-full text-sm sm:text-base"
                  >
                    <option value="">Select your native language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={`native-${lang}`} value={lang.toLowerCase()}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LOCATION */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Location</span>
                  </label>
                  <div className="relative">
                    <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-4 sm:size-5 text-base-content opacity-70" />
                    <input
                      type="text"
                      name="location"
                      value={formState.location}
                      onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                      className="input input-bordered w-full pl-9 sm:pl-10 text-sm sm:text-base"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                {/* SUBMIT BUTTON */}

                <button className="btn btn-primary w-full text-sm sm:text-base" disabled={isPending} type="submit">
                  {!isPending ? (
                    <>
                      <ShipWheelIcon className="size-4 sm:size-5 mr-1.5 sm:mr-2" />
                      Submit
                    </>
                  ) : (
                    <span className="loading loading-ring loading-sm"></span>
                  )}
                </button>
              </form>
        </div>
      </div>
    </div>
  );
};
export default OnboardingPage;