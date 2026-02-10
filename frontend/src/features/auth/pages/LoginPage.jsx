import { useState, useEffect } from "react";
import { Link } from "react-router";
import useLogin from "@/features/auth/hooks/useLogin";
import { debugDeviceInfo, testCookieSupport } from "@/shared/utils/mobile-utils";
import PasswordInput from "@/shared/components/PasswordInput";

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    emailOrUsername: "",
    password: "",
  });

  // Debug mobile issues on component mount
  useEffect(() => {
    const deviceInfo = debugDeviceInfo();
    const cookieSupport = testCookieSupport();
    console.log('Cookie support:', cookieSupport);

    if (!cookieSupport && deviceInfo.isMobile) {
      console.warn('Mobile device detected with limited cookie support');
    }
  }, []);

  // This is how we did it at first, without using our custom hook
  // const queryClient = useQueryClient();
  // const {
  //   mutate: loginMutation,
  //   isPending,
  //   error,
  // } = useMutation({
  //   mutationFn: login,
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  // });

  // This is how we did it using our custom hook - optimized version
  const { isPending, error, loginMutation } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8"
      data-theme="forest"
    >
      <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-6xl mx-auto bg-base-100 rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
        {/* LOGIN FORM SECTION */}
        <div className="w-full lg:w-1/2 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col">
          {/* LOGO */}
          <div className="mb-4 sm:mb-6 flex items-center justify-start gap-2">
            <img src="/favicon.png" alt="favicon" className="size-8 sm:size-9 text-primary" />
            <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              Chatify
            </span>
          </div>

          {/* ERROR MESSAGE DISPLAY */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>
                {error.response?.data?.message ||
                  error.message ||
                  "Login failed. Please check your connection and try again."}
              </span>
            </div>
          )}

          <div className="w-full">
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Welcome Back to Chatify</h2>
                  <p className="text-xs sm:text-sm opacity-70">
                    Sign in to continue your conversations and stay connected.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="form-control w-full space-y-1 sm:space-y-2">
                    <label className="label">
                      <span className="label-text text-xs sm:text-sm">Email or Username</span>
                    </label>
                    <input
                      type="text"
                      placeholder="hello@example.com or username"
                      className="input input-bordered w-full text-sm sm:text-base"
                      value={loginData.emailOrUsername}
                      onChange={(e) => setLoginData({ ...loginData, emailOrUsername: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-control w-full space-y-1 sm:space-y-2">
                    <label className="label">
                      <span className="label-text text-xs sm:text-sm">Password</span>
                    </label>
                    <PasswordInput
                      placeholder="********"
                      className="input input-bordered w-full text-sm sm:text-base"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full text-sm sm:text-base" disabled={isPending}>
                    {isPending ? (
                      <span className="loading loading-ring loading-sm"></span>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <div className="divider">OR</div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="btn btn-outline w-full flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="text-center mt-4 space-y-2">
                    <Link to="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline block">
                      Forgot your password?
                    </Link>
                    <p className="text-xs sm:text-sm">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Create one
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* IMAGE SECTION */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center p-4">
          <div className="max-w-md p-6 lg:p-8">
            {/* Illustration */}
            <div className="relative aspect-square max-w-sm mx-auto">
              <img src="/i.png" alt="Language connection illustration" className="w-full h-full" />
            </div>

            <div className="text-center space-y-3 mt-6">
              <h2 className="text-lg lg:text-xl font-semibold">All-in-one Communication</h2>
              <p className="text-sm lg:text-base opacity-70">
                Seamless messaging, voice & video calls, group chats, and threads—everything in one powerful app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
