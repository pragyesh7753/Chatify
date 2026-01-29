import { Phone, Video } from "lucide-react";
import PropTypes from "prop-types";

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

CallButton.propTypes = {
  onCall: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

export default CallButton;
