import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/shared/lib/api";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutate: forgotPasswordMutation, isPending } = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send reset email");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    forgotPasswordMutation(email);
  };

  if (isSubmitted) {
    return (
      <div className="h-screen flex items-center justify-center p-4" data-theme="forest">
        <div className="max-w-md w-full bg-base-100 rounded-xl shadow-lg p-8 border border-primary/25">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-base-content/70">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-base-content/60">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <button
                onClick={() => setIsSubmitted(false)}
                className="btn btn-outline btn-sm"
              >
                Try Different Email
              </button>
              
              <div className="pt-4">
                <Link to="/login" className="text-primary hover:underline text-sm">
                  ← Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center p-4" data-theme="forest">
      <div className="max-w-md w-full bg-base-100 rounded-xl shadow-lg p-8 border border-primary/25">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/favicon.png" alt="favicon" className="size-8" />
            <span className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Chatify
            </span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Forgot Password?</h2>
          <p className="text-base-content/70 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email Address</span>
            </label>
            <input
              type="email"
              placeholder="hello@example.com"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <Link to="/login" className="text-primary hover:underline text-sm">
            ← Back to Login
          </Link>
          <div className="text-sm text-base-content/60">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;