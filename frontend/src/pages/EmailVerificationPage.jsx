import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyEmail, resendVerificationEmail } from "../lib/api";
import { CheckCircleIcon, XCircleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

const EmailVerificationPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [verificationStatus, setVerificationStatus] = useState("verifying");
    const [email, setEmail] = useState("");

    const token = searchParams.get("token");

    const verifyMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            setVerificationStatus("success");
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            setTimeout(() => navigate("/"), 3000);
        },
        onError: (error) => {
            setVerificationStatus("error");
            console.error("Verification error:", error);
        },
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
        if (token) {
            verifyMutation.mutate(token);
        } else {
            setVerificationStatus("no-token");
        }
    }, [token]);

    const handleResendEmail = () => {
        if (email) {
            resendMutation.mutate(email);
        }
    };

    return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
            <div className="card bg-base-200 w-full max-w-md shadow-xl">
                <div className="card-body text-center">
                    {verificationStatus === "verifying" && (
                        <>
                            <div className="loading loading-spinner loading-lg mx-auto"></div>
                            <h2 className="card-title justify-center">Verifying Email...</h2>
                            <p>Please wait while we verify your email address.</p>
                        </>
                    )}

                    {verificationStatus === "success" && (
                        <>
                            <CheckCircleIcon className="w-16 h-16 text-success mx-auto" />
                            <h2 className="card-title justify-center text-success">Email Verified!</h2>
                            <p>Your email has been successfully verified. You will be redirected to the home page shortly.</p>
                        </>
                    )}

                    {verificationStatus === "error" && (
                        <>
                            <XCircleIcon className="w-16 h-16 text-error mx-auto" />
                            <h2 className="card-title justify-center text-error">Verification Failed</h2>
                            <p className="mb-4">The verification link is invalid or has expired.</p>

                            <div className="form-control w-full">
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
                                className="btn btn-primary mt-4"
                                onClick={handleResendEmail}
                                disabled={!email || resendMutation.isPending}
                            >
                                {resendMutation.isPending ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <EnvelopeIcon className="w-4 h-4" />
                                        Resend Verification Email
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {verificationStatus === "resent" && (
                        <>
                            <EnvelopeIcon className="w-16 h-16 text-info mx-auto" />
                            <h2 className="card-title justify-center text-info">Email Sent!</h2>
                            <p>A new verification email has been sent. Please check your inbox.</p>
                        </>
                    )}

                    {verificationStatus === "no-token" && (
                        <>
                            <XCircleIcon className="w-16 h-16 text-warning mx-auto" />
                            <h2 className="card-title justify-center text-warning">Invalid Link</h2>
                            <p>This verification link is invalid. Please use the link from your verification email.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;