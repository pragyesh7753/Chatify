import { AlertCircleIcon } from "lucide-react";

const ErrorState = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center h-full bg-base-200 p-8">
        <div className="mb-4" style={{ animation: "shake 0.5s ease-in-out" }}>
            <div className="relative">
                <div className="absolute inset-0 bg-error/20 rounded-full blur-xl" />
                <AlertCircleIcon className="relative h-16 w-16 text-error" />
            </div>
        </div>

        <h3 className="text-lg font-semibold text-base-content mb-2">
            Failed to load friends
        </h3>

        <p className="text-sm text-base-content/70 mb-6 text-center max-w-sm">
            {error?.message || "Something went wrong. Please try again."}
        </p>

        <button
            onClick={onRetry}
            className="btn btn-sm btn-primary hover:scale-105 transition-transform"
        >
            Try Again
        </button>
    </div>
);

export default ErrorState;

