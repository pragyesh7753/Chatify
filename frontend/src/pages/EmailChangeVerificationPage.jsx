import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyEmailChange } from "../lib/api";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

const EmailChangeVerificationPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [verificationStatus, setVerificationStatus] = useState("verifying");
    const hasVerified = useRef(false);

    const token = searchParams.get("token");

    const verifyMutation = useMutation({
        mutationFn: verifyEmailChange,
        onSuccess: (data) => {
            console.log("Email change verification successful:", data);
            setVerificationStatus("success");
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            queryClient.invalidateQueries({ queryKey: ["userProfile"] });
            setTimeout(() => navigate("/profile"), 3000);
        },
        onError: (error) => {
            console.error("Email change verification error:", error);
            setVerificationStatus("error");
        },
        retry: false,
    });

    useEffect(() => {
        if (token && !hasVerified.current) {
            console.log("Starting email change verification with token:", token);
            hasVerified.current = true;
            verifyMutation.mutate(token);
        } else if (!token) {
            setVerificationStatus("error");
        }
    }, [token, verifyMutation]);

    const getStatusContent = () => {
        switch (verificationStatus) {
            case "verifying":
                return {
                    icon: <span className="loading loading-spinner loading-lg text-primary"></span>,
                    title: "Verifying Email Change...",
                    message: "Please wait while we verify your new email address.",
                    bgColor: "bg-base-100",
                };
            case "success":
                return {
                    icon: <CheckCircleIcon className="w-16 h-16 text-success" />,
                    title: "Email Changed Successfully!",
                    message: "Your email address has been updated. You will be redirected to your profile shortly.",
                    bgColor: "bg-success/10",
                };
            case "error":
                return {
                    icon: <XCircleIcon className="w-16 h-16 text-error" />,
                    title: "Verification Failed",
                    message: "The verification link is invalid or has expired. Please request a new email change from your profile.",
                    bgColor: "bg-error/10",
                };
            default:
                return {
                    icon: <XCircleIcon className="w-16 h-16 text-error" />,
                    title: "Unknown Error",
                    message: "An unexpected error occurred.",
                    bgColor: "bg-error/10",
                };
        }
    };

    const { icon, title, message, bgColor } = getStatusContent();

    return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className={`card shadow-xl ${bgColor} border`}>
                    <div className="card-body text-center">
                        <div className="flex justify-center mb-4">
                            {icon}
                        </div>
                        
                        <h2 className="card-title text-2xl justify-center mb-4">
                            {title}
                        </h2>
                        
                        <p className="text-base-content/70 mb-6">
                            {message}
                        </p>

                        <div className="card-actions justify-center">
                            {verificationStatus === "error" && (
                                <button
                                    onClick={() => navigate("/profile")}
                                    className="btn btn-primary"
                                >
                                    Go to Profile
                                </button>
                            )}
                            {verificationStatus === "success" && (
                                <div className="text-sm text-base-content/60">
                                    Redirecting in 3 seconds...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailChangeVerificationPage;
