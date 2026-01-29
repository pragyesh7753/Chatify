import { Phone, Video } from "lucide-react";

/**
 * Call button component for initiating audio/video calls
 * Displays in the chat header to initiate calls with the current chat user
 */
const CallButton = ({ onCall, disabled = false, className = "" }) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Audio Call Button */}
      <button
        onClick={() => onCall("audio")}
        disabled={disabled}
        className="btn btn-ghost btn-circle btn-sm"
        aria-label="Start audio call"
        title="Audio call"
      >
        <Phone className="w-5 h-5" />
      </button>

      {/* Video Call Button */}
      <button
        onClick={() => onCall("video")}
        disabled={disabled}
        className="btn btn-ghost btn-circle btn-sm"
        aria-label="Start video call"
        title="Video call"
      >
        <Video className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CallButton;
