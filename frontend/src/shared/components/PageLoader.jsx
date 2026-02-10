import { useThemeStore } from "@/store/useThemeStore";

const PageLoader = () => {
  const { theme } = useThemeStore();
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 transition-colors duration-200" data-theme={theme}>
      <span className="loading loading-ring loading-lg text-primary"></span>
    </div>
  );
};
export default PageLoader;
