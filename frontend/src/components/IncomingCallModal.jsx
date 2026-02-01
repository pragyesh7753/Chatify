import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "../hooks/useCall";

/**
 * IncomingCallModal Component
 * 
 * Displays incoming call notification UI with caller information.
 * Shows accept/reject buttons for the user to respond to the call.
 * 
 * Used when callState.state === "incoming_ringing"
 */
const IncomingCallModal = () => {
  const { callState, acceptCall, rejectCall } = useCall();

  if (callState.state !== "incoming_ringing" || !callState.caller) {
    return null;
  }

  const { caller, mode } = callState;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-sm md:max-w-md p-4 sm:p-6 md:p-8 text-center mx-auto">
        {/* Caller Avatar */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="avatar">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img 
                src={caller.avatar || "/default-avatar.svg"} 
                alt={caller.fullName}
                className="rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Caller Info */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 md:mb-2 truncate px-2">{caller.fullName}</h3>
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg text-base-content/70">
            {mode === "audio" ? (
              <>
                <Phone className="h-4 w-4 md:h-5 md:w-5" />
                <span>Incoming audio call</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4 md:h-5 md:w-5" />
                <span>Incoming video call</span>
              </>
            )}
          </div>
        </div>

        {/* Ringing Animation */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-primary rounded-full flex items-center justify-center animate-pulse">
                {mode === "audio" ? (
                  <Phone className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary-content" />
                ) : (
                  <Video className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary-content" />
                )}
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75"></div>
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50" style={{ animationDelay: "0.5s" }}></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 sm:gap-4 md:gap-6 justify-center">
          {/* Reject Button */}
          <button
            onClick={rejectCall}
            className="btn btn-error btn-circle btn-md sm:btn-lg"
            title="Reject call"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Accept Button */}
          <button
            onClick={acceptCall}
            className="btn btn-success btn-circle btn-md sm:btn-lg"
            title="Accept call"
          >
            <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Helper text */}
        <div className="mt-3 sm:mt-4 md:mt-6 text-xs sm:text-sm md:text-base text-base-content/60">
          Tap to answer or decline
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
