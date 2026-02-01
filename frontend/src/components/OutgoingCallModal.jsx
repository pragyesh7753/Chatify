import { Phone, PhoneOff, Video } from "lucide-react";
import {useCall} from "../hooks/useCall";

/**
 * OutgoingCallModal Component
 * 
 * Displays outgoing call UI while waiting for the receiver to answer.
 * Shows cancel button for the caller to abort the call.
 * 
 * Used when callState.state === "outgoing_ringing"
 */
const OutgoingCallModal = () => {
  const { callState, cancelCall } = useCall();

  if (callState.state !== "outgoing_ringing" || !callState.receiver) {
    return null;
  }

  const { receiver, mode } = callState;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-sm md:max-w-md p-4 sm:p-6 md:p-8 text-center mx-auto">
        {/* Receiver Avatar */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="avatar">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img 
                src={receiver.avatar || "/default-avatar.svg"} 
                alt={receiver.fullName}
                className="rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Receiver Info */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 md:mb-2 truncate px-2">{receiver.fullName}</h3>
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg text-base-content/70">
            {mode === "audio" ? (
              <>
                <Phone className="h-4 w-4 md:h-5 md:w-5" />
                <span>Calling...</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4 md:h-5 md:w-5" />
                <span>Video calling...</span>
              </>
            )}
          </div>
        </div>

        {/* Calling Animation */}
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

        {/* Status */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="text-sm sm:text-base md:text-lg text-base-content/70">
            Ringing...
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-center">
          <button
            onClick={cancelCall}
            className="btn btn-error btn-circle btn-md sm:btn-lg"
            title="Cancel call"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Helper text */}
        <div className="mt-3 sm:mt-4 md:mt-6 text-xs sm:text-sm md:text-base text-base-content/60 truncate px-2">
          Waiting for {receiver.fullName} to answer...
        </div>
      </div>
    </div>
  );
};

export default OutgoingCallModal;
