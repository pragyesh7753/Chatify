import { useState } from "react";
import { Link } from "react-router";

import useSignUp from "@/features/auth/hooks/useSignUp";
import { validateFullName, validateEmail, validatePassword, validatePasswordMatch } from "@/features/auth/utils/validation";

import EmailVerificationNotice from "@/features/auth/components/EmailVerificationNotice";
import PasswordInput from "@/shared/components/PasswordInput";

const SignUpPage = () => {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { isPending, error, signupMutation } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    setValidationError("");

    // Frontend validation
    const fullNameError = validateFullName(signupData.fullName);
    if (fullNameError) {
      setValidationError(fullNameError);
      setShowErrorModal(true);
      return;
    }

    const emailError = validateEmail(signupData.email);
    if (emailError) {
      setValidationError(emailError);
      setShowErrorModal(true);
      return;
    }

    const passwordMatchError = validatePasswordMatch(signupData.password, signupData.confirmPassword);
    if (passwordMatchError) {
      setValidationError(passwordMatchError);
      setShowErrorModal(true);
      return;
    }

    const passwordError = validatePassword(signupData.password);
    if (passwordError) {
      setValidationError(passwordError);
      setShowErrorModal(true);
      return;
    }

    signupMutation(signupData, {
      onSuccess: () => {
        setUserEmail(signupData.email);
        setShowVerificationNotice(true);
      },
      onError: () => {
        setShowErrorModal(true);
      },
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center p-2 sm:p-3"
        data-theme="forest">
        <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-6xl mx-auto bg-base-100 rounded-lg shadow-lg overflow-hidden">
          {/* SIGNUP FORM - LEFT SIDE */}
          <div className="w-full lg:w-1/2 p-3 sm:p-4 md:p-5 flex flex-col">
            {/* LOGO */}
            <div className="mb-2 sm:mb-3 flex items-center justify-start gap-2">
              <img src="/favicon.png" alt="favicon" className="size-6 sm:size-7 text-primary" />
              <span className="text-xl sm:text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                Chatify
              </span>
            </div>

            <div className="w-full">
              <form onSubmit={handleSignup}>
                <div className="space-y-2">
                  <div>
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold">Create an Account</h2>
                    <p className="text-xs sm:text-sm opacity-70">
                      Your all-in-one communication starts here.!
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* FULLNAME */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs sm:text-sm">Full Name</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        placeholder="John Doe"
                        className="input input-bordered input-sm sm:input-md w-full text-sm"
                        value={signupData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {/* EMAIL */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs sm:text-sm">Email</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        placeholder="john@gmail.com"
                        className="input input-bordered input-sm sm:input-md w-full text-sm"
                        value={signupData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {/* PASSWORD */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs sm:text-sm flex items-center gap-1">
                          Password
                          <div className="tooltip tooltip-right" data-tip="Must be 8-128 characters with at least one uppercase, lowercase, and number">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60 cursor-help">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                          </div>
                        </span>
                      </label>
                      <PasswordInput
                        placeholder="********"
                        className="input input-bordered input-sm sm:input-md w-full text-sm"
                        value={signupData.password}
                        onChange={handleChange}
                        name="password"
                        required
                      />
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs sm:text-sm">Confirm Password</span>
                      </label>
                      <PasswordInput
                        placeholder="********"
                        className="input input-bordered input-sm sm:input-md w-full text-sm"
                        value={signupData.confirmPassword}
                        onChange={handleChange}
                        name="confirmPassword"
                        required
                      />
                      {signupData.password && signupData.confirmPassword && (signupData.password !== signupData.confirmPassword ? (
                        <p className="text-xs sm:text-sm text-error mt-0.5">Passwords do not match</p>
                      ) : (
                        <p className="text-xs sm:text-sm text-success mt-0.5">Passwords match</p>
                      ))}
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2 py-1">
                        <input type="checkbox" className="checkbox checkbox-xs sm:checkbox-sm" required />
                        <span className="text-xs sm:text-sm leading-tight">
                          I agree to the{" "}
                          <span className="text-primary hover:underline">terms of service</span> and{" "}
                          <span className="text-primary hover:underline">privacy policy</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm sm:btn-md w-full text-xs sm:text-sm"
                    type="submit"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="loading loading-ring loading-sm"></span>
                    ) : (
                      <>
                        <UserPlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Sign Up
                      </>
                    )}
                  </button>

                  <div className="divider my-1 text-xs sm:text-sm">OR</div>

                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    className="btn btn-outline btn-sm sm:btn-md w-full flex items-center justify-center gap-2 text-xs sm:text-sm"
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

                  <div className="text-center mt-2">
                    <p className="text-xs sm:text-sm">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary hover:underline">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* SIGNUP FORM - RIGHT SIDE */}
          <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center p-3">
            <div className="max-w-md p-4">
              {/* Illustration */}
              <div className="relative aspect-square max-w-xs mx-auto">
                <img src="/i.png" alt="Language connection illustration" className="w-full h-full" />
              </div>

              <div className="text-center space-y-2 mt-4">
                <h2 className="text-base lg:text-lg font-semibold">Connect with anyone, anywhere</h2>
                <p className="text-xs lg:text-sm opacity-70">
                  Stay close to your friends, family, and groups with instant chats, voice & video calls, and threads.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showVerificationNotice && (
        <EmailVerificationNotice
          email={userEmail}
          onClose={() => setShowVerificationNotice(false)}
        />
      )}
      {showErrorModal && (validationError || error) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-base-100 rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Signup Failed</h3>
              <div className="text-sm opacity-70 mb-4 text-left">
                {validationError ? (
                  <p className="text-center">{validationError}</p>
                ) : error?.response?.data?.errors ? (
                  <ul className="list-disc list-inside space-y-1">
                    {error.response.data.errors.map((err, idx) => (
                      <li key={idx}>{err.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center">{error?.response?.data?.message || "An error occurred during signup. Please try again."}</p>
                )}
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  setShowErrorModal(false);
                  setValidationError("");
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignUpPage;
