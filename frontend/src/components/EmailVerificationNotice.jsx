import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { resendVerificationEmail } from "../lib/api";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

const EmailVerificationNotice = ({ email, onClose }) => {
    const [countdown, setCountdown] = useState(0);

    const resendMutation = useMutation({
        mutationFn: resendVerificationEmail,
        onSuccess: () => {
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        },
    });

    const handleResend = () => {
        resendMutation.mutate(email);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-base-100 rounded-lg p-6 max-w-md w-full">
                <div className="text-center">
                    <EnvelopeIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Check Your Email!</h3>
                    <p className="text-sm opacity-70 mb-4">
                        We've sent a verification link to <strong>{email}</strong>.
                        Please click the link in the email to verify your account.
                    </p>

                    <div className="space-y-3">
                        <button
                            className="btn btn-primary w-full"
                            onClick={handleResend}
                            disabled={countdown > 0 || resendMutation.isPending}
                        >
                            {resendMutation.isPending ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Sending...
                                </>
                            ) : countdown > 0 ? (
                                `Resend in ${countdown}s`
                            ) : (
                                "Resend Email"
                            )}
                        </button>

                        <button className="btn btn-ghost w-full" onClick={onClose}>
                            I'll verify later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationNotice;