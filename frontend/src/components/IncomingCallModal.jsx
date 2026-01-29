import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Modal component for displaying incoming call notification
 * Shows caller information and provides Accept/Reject buttons
 * Includes a ringing sound effect
 */
const IncomingCallModal = ({ 
  isOpen, 
  callerInfo, 
  callType, 
  onAccept, 
  onReject 
}) => {
  const ringtoneRef = useRef(null);

  // Play ringtone when modal opens
  useEffect(() => {
    if (isOpen && ringtoneRef.current) {
      ringtoneRef.current.play().catch(error => {
        console.log("Could not play ringtone:", error);
      });
    } else if (!isOpen && ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Ringtone audio element */}
      <audio ref={ringtoneRef} loop>
        <source src="/ringtone.mp3" type="audio/mpeg" />
      </audio>

      {/* Modal overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-base-100 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
          {/* Call type icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-primary/20 p-6 rounded-full animate-pulse">
              {callType === "video" ? (
                <Video className="w-12 h-12 text-primary" />
              ) : (
                <Phone className="w-12 h-12 text-primary" />
              )}
            </div>
          </div>

          {/* Caller information */}
          <div className="text-center mb-8">
            <div className="avatar mb-4">
              <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img 
                  src={callerInfo?.profilePic || "/default-avatar.png"} 
                  alt={callerInfo?.fullName || "Caller"} 
                />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">
              {callerInfo?.fullName || "Unknown Caller"}
            </h3>
            
            <p className="text-base-content/60">
              Incoming {callType} call...
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            {/* Reject button */}
            <button
              onClick={onReject}
              className="btn btn-circle btn-lg bg-error hover:bg-error/80 border-0"
              aria-label="Reject call"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            {/* Accept button */}
            <button
              onClick={onAccept}
              className="btn btn-circle btn-lg bg-success hover:bg-success/80 border-0 animate-pulse"
              aria-label="Accept call"
            >
              <Phone className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default IncomingCallModal;
