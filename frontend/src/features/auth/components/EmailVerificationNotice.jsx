import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { resendVerificationEmail } from "@/shared/lib/api";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

const EmailVerificationNotice = ({ email, onClose }) => {
    const [countdown, setCountdown] = useState(0);

    const resendMutation = useMutation({
        mutationFn: resendVerificationEmail,
        onSuccess: () => {
            setCountdown(60);
        },
    });

    // Use useEffect to handle countdown cleanup
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown]);

    const handleResend = () => {
        resendMutation.mutate(email);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
            <div className="bg-base-100/90 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-2xl p-6 sm:p-8 max-w-md w-full">
                <div className="text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <EnvelopeIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Check Your Email!</h3>
                    <p className="text-base-content/70 mb-8 leading-relaxed">
                        We've sent a verification link to <strong className="text-base-content">{email}</strong>.
                        <br />
                        Please click the link in the email to verify your account.
                    </p>

                    <div className="space-y-3">
                        <button
                            className="btn btn-primary w-full shadow-lg shadow-primary/20"
                            onClick={handleResend}
                            disabled={countdown > 0 || resendMutation.isPending}
                        >
                            {resendMutation.isPending ? (
                                <span className="loading loading-ring loading-sm"></span>
                            ) : countdown > 0 ? (
                                `Resend in ${countdown}s`
                            ) : (
                                "Resend Email"
                            )}
                        </button>

                        <button className="btn btn-ghost w-full text-base-content/70 hover:text-base-content" onClick={onClose}>
                            I'll verify later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationNotice;