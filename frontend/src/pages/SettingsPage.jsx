import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../lib/api";
import toast from "react-hot-toast";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";
import { 
  UserIcon, 
  LockIcon, 
  PaletteIcon, 
  BellIcon, 
  ShieldIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon
} from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import useLogout from "../hooks/useLogout";

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { logoutMutation, isPending: isLoggingOut } = useLogout();
  const [activeSection, setActiveSection] = useState("account");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { mutate: changePasswordMutation, isPending: isChangingPassword } = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowChangePassword(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to change password");
    },
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    changePasswordMutation({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleLogout = () => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>Are you sure you want to logout?</span>
        <div className="flex gap-2">
          <button
            className="btn btn-error btn-sm"
            onClick={() => {
              toast.dismiss(t.id);
              logoutMutation();
            }}
          >
            Logout
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 3000,
    });
  };

  const sections = [
    { id: "account", name: "Account", icon: UserIcon },
    { id: "security", name: "Security", icon: ShieldIcon },
    { id: "appearance", name: "Appearance", icon: PaletteIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
  ];

  const renderAccountSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Account Settings</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-medium text-sm sm:text-base">Profile Information</h4>
                  <p className="text-xs sm:text-sm text-base-content/70">
                    Update your personal information and profile details
                  </p>
                </div>
                <button 
                  className="btn btn-outline btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                  onClick={() => window.location.href = '/profile'}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-medium text-sm sm:text-base">Password</h4>
                  <p className="text-xs sm:text-sm text-base-content/70">
                    Change your account password
                  </p>
                </div>
                <button 
                  className="btn btn-primary btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  <LockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Change Password
                </button>
              </div>
              
              {showChangePassword && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-base-300">
                  <form onSubmit={handlePasswordChange} className="space-y-3 sm:space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-xs sm:text-sm">Current Password</span>
                      </label>
                      <PasswordInput
                        placeholder="Enter current password"
                        className="input input-bordered w-full text-sm sm:text-base"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-xs sm:text-sm">New Password</span>
                      </label>
                      <PasswordInput
                        placeholder="Enter new password"
                        className="input input-bordered w-full text-sm sm:text-base"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">
                          Must be at least 8 characters
                        </span>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-xs sm:text-sm">Confirm New Password</span>
                      </label>
                      <PasswordInput
                        placeholder="Confirm new password"
                        className="input input-bordered w-full text-sm sm:text-base"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            <span className="text-xs sm:text-sm">Changing...</span>
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm border-2 border-error/20">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-medium text-error text-sm sm:text-base">Logout</h4>
                  <p className="text-xs sm:text-sm text-base-content/70">
                    Sign out of your account on this device
                  </p>
                </div>
                <button 
                  className="btn btn-error btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span className="text-xs sm:text-sm">Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOutIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Logout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Security Settings</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Two-Factor Authentication</h4>
              <p className="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4">
                Add an extra layer of security to your account
              </p>
              <button className="btn btn-outline btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto" disabled>
                Enable 2FA (Coming Soon)
              </button>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Active Sessions</h4>
              <p className="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4">
                Manage your active login sessions
              </p>
              <button className="btn btn-outline btn-xs sm:btn-sm text-xs sm:text-sm w-full sm:w-auto" disabled>
                View Sessions (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Appearance Settings</h3>
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 sm:p-5 md:p-6">
            <h4 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">Theme</h4>
            <p className="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4">
              Choose your preferred theme for the application
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {THEMES.map((themeOption) => (
                <div
                  key={themeOption.name}
                  className={`cursor-pointer rounded-lg p-2 sm:p-3 border-2 transition-all ${
                    theme === themeOption.name
                      ? "border-primary bg-primary/10"
                      : "border-base-300 hover:border-base-400"
                  }`}
                  onClick={() => setTheme(themeOption.name)}
                  data-theme={themeOption.name}
                >
                  <div className="flex flex-col items-center space-y-1.5 sm:space-y-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-secondary"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-accent"></div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center">
                      {themeOption.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Notification Settings</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <h4 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">Push Notifications</h4>
              <div className="space-y-2 sm:space-y-3">
                <div className="form-control">
                  <label className="cursor-pointer label justify-start gap-2 sm:gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" defaultChecked />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">New Messages</div>
                      <div className="text-[10px] sm:text-xs text-base-content/70">Get notified when you receive new messages</div>
                    </div>
                  </label>
                </div>
                
                <div className="form-control">
                  <label className="cursor-pointer label justify-start gap-2 sm:gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" defaultChecked />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">Friend Requests</div>
                      <div className="text-[10px] sm:text-xs text-base-content/70">Get notified when someone sends you a friend request</div>
                    </div>
                  </label>
                </div>
                
                <div className="form-control">
                  <label className="cursor-pointer label justify-start gap-2 sm:gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">Video Calls</div>
                      <div className="text-[10px] sm:text-xs text-base-content/70">Get notified when someone calls you</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 sm:p-5 md:p-6">
              <h4 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">Email Notifications</h4>
              <div className="space-y-2 sm:space-y-3">
                <div className="form-control">
                  <label className="cursor-pointer label justify-start gap-2 sm:gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">Weekly Summary</div>
                      <div className="text-[10px] sm:text-xs text-base-content/70">Receive a weekly summary of your activity</div>
                    </div>
                  </label>
                </div>
                
                <div className="form-control">
                  <label className="cursor-pointer label justify-start gap-2 sm:gap-3">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">Security Alerts</div>
                      <div className="text-[10px] sm:text-xs text-base-content/70">Get notified about security-related activities</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return renderAccountSection();
      case "security":
        return renderSecuritySection();
      case "appearance":
        return renderAppearanceSection();
      case "notifications":
        return renderNotificationsSection();
      default:
        return renderAccountSection();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-base-100 transition-colors duration-200">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-base-content">Settings</h1>
          <p className="text-xs sm:text-sm md:text-base text-base-content opacity-70 mt-1 sm:mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-2 sm:p-3 md:p-4">
                <ul className="menu menu-compact w-full text-sm">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <li key={section.id}>
                        <button
                          className={`w-full justify-start text-xs sm:text-sm ${
                            activeSection === section.id ? "active" : ""
                          }`}
                          onClick={() => setActiveSection(section.id)}
                        >
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          {section.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;