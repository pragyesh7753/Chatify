import { Link, useLocation } from "react-router";
import {
  Home,
  UsersIcon,
  BellIcon,
  UserCircle,
} from "lucide-react";

const MobileBottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Don't show navigation on auth pages or chat pages
  const hideNavPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/verify-email-change", "/onboarding", "/chat/"];
  const shouldHide = hideNavPaths.some(path => currentPath.startsWith(path));
  
  if (shouldHide) return null;

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "Home",
      isActive: currentPath === "/",
    },
    {
      path: "/friends",
      icon: UsersIcon,
      label: "Friends",
      isActive: currentPath === "/friends",
    },
    {
      path: "/notifications",
      icon: BellIcon,
      label: "Alerts",
      isActive: currentPath === "/notifications",
    },
    {
      path: "/settings",
      icon: UserCircle,
      label: "Profile",
      isActive: currentPath === "/settings" || currentPath === "/profile",
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="px-4 pb-6 safe-area-inset-bottom">
        <div className="relative bg-base-300/80 dark:bg-neutral/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-base-content/10 pointer-events-auto">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.path}-${index}`}
                  to={item.path}
                  className="relative flex items-center justify-center flex-1 h-full transition-all duration-300"
                >
                  {/* Active Background Bubble - Lifted */}
                  {item.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-primary rounded-full shadow-2xl transform -translate-y-4 transition-all duration-500 ease-out animate-in fade-in zoom-in"></div>
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-500 ease-out ${
                    item.isActive
                      ? "text-primary-content -translate-y-4 scale-110"
                      : "text-base-content/70 hover:text-base-content active:scale-95"
                  }`}>
                    <Icon
                      className={`transition-all duration-300 ${
                        item.isActive ? "h-6 w-6 stroke-[2.5]" : "h-5 w-5 stroke-2"
                      }`}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
