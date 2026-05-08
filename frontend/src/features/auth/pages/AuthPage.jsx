import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import LoginForm from "@/features/auth/components/LoginForm";
import SignUpForm from "@/features/auth/components/SignUpForm";
import EmailVerificationNotice from "@/features/auth/components/EmailVerificationNotice";

const AuthPage = () => {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Track which form is *visually* displayed (for crossfade)
  const [displayedForm, setDisplayedForm] = useState(isLogin ? "login" : "signup");
  const [animating, setAnimating] = useState(false);

  // Refs for measuring form heights
  const formWrapperRef = useRef(null);
  const loginRef = useRef(null);
  const signupRef = useRef(null);
  const [wrapperHeight, setWrapperHeight] = useState("auto");

  // Measure the active form and set wrapper height
  const measureHeight = useCallback(() => {
    const activeRef = displayedForm === "login" ? loginRef : signupRef;
    if (activeRef.current) {
      setWrapperHeight(activeRef.current.scrollHeight);
    }
  }, [displayedForm]);

  // On mount + resize, measure
  useEffect(() => {
    measureHeight();
    window.addEventListener("resize", measureHeight);
    return () => window.removeEventListener("resize", measureHeight);
  }, [measureHeight]);

  // When route changes, trigger crossfade
  useEffect(() => {
    const target = isLogin ? "login" : "signup";
    if (target !== displayedForm) {
      setAnimating(true);

      // Phase 1: fade out current form (150ms), then swap + measure + fade in
      const fadeOutTimer = setTimeout(() => {
        setDisplayedForm(target);
        // After React renders the new form, measure its height
        requestAnimationFrame(() => {
          const newRef = target === "login" ? loginRef : signupRef;
          if (newRef.current) {
            setWrapperHeight(newRef.current.scrollHeight);
          }
          // Small delay for the height transition to start, then fade in
          setTimeout(() => setAnimating(false), 50);
        });
      }, 200);

      return () => clearTimeout(fadeOutTimer);
    }
  }, [isLogin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignupSuccess = (email) => {
    setUserEmail(email);
    setShowVerificationNotice(true);
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden bg-base-200/50"
        data-theme="forest"
      >
        {/* Background decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="border border-primary/10 flex flex-col lg:flex-row-reverse w-full max-w-6xl mx-auto bg-base-100/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10">
          
          {/* FORM SECTION */}
          <div className="w-full lg:w-1/2 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col bg-base-100/50 z-20">
            <div
              ref={formWrapperRef}
              className="relative w-full overflow-hidden"
              style={{
                height: wrapperHeight,
                transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Login Form */}
              <div
                ref={loginRef}
                className="w-full"
                style={{
                  opacity: displayedForm === "login" && !animating ? 1 : 0,
                  transform: displayedForm === "login" && !animating ? "translateX(0)" : displayedForm === "login" ? "translateX(-20px)" : "translateX(20px)",
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                  position: displayedForm === "login" ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  pointerEvents: displayedForm === "login" ? "auto" : "none",
                }}
              >
                <LoginForm />
              </div>

              {/* Signup Form */}
              <div
                ref={signupRef}
                className="w-full"
                style={{
                  opacity: displayedForm === "signup" && !animating ? 1 : 0,
                  transform: displayedForm === "signup" && !animating ? "translateX(0)" : displayedForm === "signup" ? "translateX(20px)" : "translateX(-20px)",
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                  position: displayedForm === "signup" ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  pointerEvents: displayedForm === "signup" ? "auto" : "none",
                }}
              >
                <SignUpForm onSignupSuccess={handleSignupSuccess} />
              </div>
            </div>
          </div>

          {/* IMAGE SECTION */}
          <div className="hidden lg:flex w-full lg:w-1/2 flex-col relative items-center justify-end overflow-hidden bg-primary/10 group pb-12 lg:pb-16 z-10">
            <img
              src="/hero-illustration.png"
              alt="Communication illustration"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Text ON the image */}
            <div className="relative z-10 max-w-md text-center space-y-3 text-white">
              <div
                style={{
                  opacity: isLogin ? 1 : 0,
                  transform: isLogin ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                  position: isLogin ? "relative" : "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  pointerEvents: isLogin ? "auto" : "none",
                }}
              >
                <h2 className="text-2xl lg:text-3xl font-bold drop-shadow-lg">
                  All-in-one Communication
                </h2>
                <p className="text-sm lg:text-base drop-shadow-md opacity-90 mt-2">
                  Seamless messaging, voice & video calls, group chats, and threads—everything in one powerful app.
                </p>
              </div>
              <div
                style={{
                  opacity: !isLogin ? 1 : 0,
                  transform: !isLogin ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                  position: !isLogin ? "relative" : "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  pointerEvents: !isLogin ? "auto" : "none",
                }}
              >
                <h2 className="text-2xl lg:text-3xl font-bold drop-shadow-lg">
                  Connect with anyone, anywhere
                </h2>
                <p className="text-sm lg:text-base drop-shadow-md opacity-90 mt-2">
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
    </>
  );
};

export default AuthPage;
