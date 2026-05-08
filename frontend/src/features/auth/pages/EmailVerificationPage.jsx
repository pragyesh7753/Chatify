import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyEmail, resendVerificationEmail } from "@/shared/lib/api";
import { CheckCircleIcon, XCircleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

const EmailVerificationPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [verificationStatus, setVerificationStatus] = useState("verifying");
    const [email, setEmail] = useState("");
    const hasVerified = useRef(false);

    const token = searchParams.get("token");

    const verifyMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: (data) => {
            console.log("Verification successful:", data);
            if (data && data.success) {
                setVerificationStatus("success");
                queryClient.invalidateQueries({ queryKey: ["authUser"] });
                setTimeout(() => navigate("/"), 3000);
            } else {
                console.error("Verification response indicates failure:", data);
                setVerificationStatus("error");
            }
        },
        onError: (error) => {
            console.error("Verification error:", error);
            console.error("Error response:", error.response?.data);
            setVerificationStatus("error");
        },
        retry: false,
    });

    const resendMutation = useMutation({
        mutationFn: resendVerificationEmail,
        onSuccess: () => {
            setVerificationStatus("resent");
        },
        onError: (error) => {
            console.error("Resend error:", error);
        },
    });

    useEffect(() => {
        if (token && !hasVerified.current) {
            console.log("Starting verification with token:", token);
            hasVerified.current = true;
            verifyMutation.mutate(token);
        } else if (!token) {
            console.log("No token found in URL");
            setVerificationStatus("no-token");
        }
    }, [token, verifyMutation]);

    const handleResendEmail = () => {
        if (email) {
            resendMutation.mutate(email);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden bg-base-200/50" data-theme="forest">
            {/* Background decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full bg-base-100/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 border border-primary/10 relative z-10">
                <div className="text-center">
                    {verificationStatus === "verifying" && (
                        <>
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Verifying Email...</h2>
                            <p className="text-base-content/70">Please wait while we verify your email address.</p>
                        </>
                    )}

                    {verificationStatus === "success" && (
                        <>
                            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-success">Email Verified!</h2>
                            <p className="text-base-content/70">Your email has been successfully verified. You will be redirected to the home page shortly.</p>
                        </>
                    )}

                    {verificationStatus === "error" && (
                        <>
                            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircleIcon className="w-8 h-8 text-error" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-error">Verification Failed</h2>
                            <p className="text-base-content/70 mb-6">The verification link is invalid or has expired.</p>

                            <div className="form-control w-full text-left">
                                <label className="label">
                                    <span className="label-text">Enter your email to resend verification</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="your.email@example.com"
                                    className="input input-bordered w-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <button
                                className="btn btn-primary mt-4 w-full"
                                onClick={handleResendEmail}
                                disabled={!email || resendMutation.isPending}
                            >
                                {resendMutation.isPending ? (
                                    <span className="loading loading-ring loading-sm"></span>
                                ) : (
                                    <>
                                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                                        Resend Verification Email
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {verificationStatus === "resent" && (
                        <>
                            <div className="w-16 h-16 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <EnvelopeIcon className="w-8 h-8 text-info" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-info">Email Sent!</h2>
                            <p className="text-base-content/70">A new verification email has been sent. Please check your inbox.</p>
                        </>
                    )}

                    {verificationStatus === "no-token" && (
                        <>
                            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircleIcon className="w-8 h-8 text-warning" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-warning">Invalid Link</h2>
                            <p className="text-base-content/70">This verification link is invalid. Please use the link from your verification email.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;