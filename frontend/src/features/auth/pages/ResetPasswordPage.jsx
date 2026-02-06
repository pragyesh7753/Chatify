import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/shared/lib/api";
import toast from "react-hot-toast";
import PasswordInput from "@/shared/components/PasswordInput";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      navigate("/login");
    }
  }, [token, navigate]);

  const { mutate: resetPasswordMutation, isPending } = useMutation({
    mutationFn: (password) => resetPassword(token, password),
    onSuccess: () => {
      toast.success("Password reset successfully! Please log in with your new password.");
      navigate("/login");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to reset password");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    resetPasswordMutation(formData.password);
  };

  if (!token) {
    return null;
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
          <h2 className="text-xl font-semibold mb-2">Reset Your Password</h2>
          <p className="text-base-content/70 text-sm">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">New Password</span>
            </label>
            <PasswordInput
              placeholder="Enter new password"
              className="input input-bordered w-full"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              <span className="label-text">Confirm New Password</span>
            </label>
            <PasswordInput
              placeholder="Confirm new password"
              className="input input-bordered w-full"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-primary hover:underline text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;