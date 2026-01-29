import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Call window component for active audio/video calls
 * Displays local and remote video streams
 * Provides controls for mute/unmute and ending the call
 */
const CallWindow = ({ 
  localStream, 
  remoteStream, 
  callType,
  remoteUserInfo,
  onEndCall,
  onToggleAudio,
  onToggleVideo
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      setConnectionStatus("connected");
    }
  }, [remoteStream]);

  // Handle audio toggle
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    onToggleAudio(newState);
  };

  // Handle video toggle
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    onToggleVideo(newState);
  };

  return (
    <div className="fixed inset-0 z-50 bg-base-300">
      {/* Remote video (main view) */}
      <div className="relative w-full h-full">
        {callType === "video" && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <div className="text-center">
              <div className="avatar mb-4">
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4">
                  <img 
                    src={remoteUserInfo?.profilePic || "/default-avatar.png"} 
                    alt={remoteUserInfo?.fullName || "User"} 
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {remoteUserInfo?.fullName || "User"}
              </h2>
              <p className="text-base-content/60">
                {connectionStatus === "connecting" ? "Connecting..." : "Audio call"}
              </p>
            </div>
          </div>
        )}

        {/* Connection status indicator */}
        {connectionStatus === "connecting" && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-base-100/90 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="loading loading-spinner loading-sm mr-2"></span>
            <span className="text-sm">Connecting...</span>
          </div>
        )}

        {/* Local video preview (picture-in-picture) */}
        {callType === "video" && (
          <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-2xl border-2 border-base-100">
            {isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full bg-base-200 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-base-content/60" />
              </div>
            )}
          </div>
        )}

        {/* Call controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
          {/* Microphone toggle */}
          <button
            onClick={handleToggleAudio}
            className={`btn btn-circle btn-lg ${
              isAudioEnabled 
                ? "bg-base-100 hover:bg-base-200" 
                : "bg-error hover:bg-error/80"
            }`}
            aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End call button */}
          <button
            onClick={onEndCall}
            className="btn btn-circle btn-lg bg-error hover:bg-error/80 border-0"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {/* Video toggle (only for video calls) */}
          {callType === "video" && (
            <button
              onClick={handleToggleVideo}
              className={`btn btn-circle btn-lg ${
                isVideoEnabled 
                  ? "bg-base-100 hover:bg-base-200" 
                  : "bg-error hover:bg-error/80"
              }`}
              aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

CallWindow.propTypes = {
  localStream: PropTypes.object,
  remoteStream: PropTypes.object,
  callType: PropTypes.oneOf(["audio", "video"]).isRequired,
  remoteUserInfo: PropTypes.shape({
    fullName: PropTypes.string,
    profilePic: PropTypes.string
  }),
  onEndCall: PropTypes.func.isRequired,
  onToggleAudio: PropTypes.func.isRequired,
  onToggleVideo: PropTypes.func.isRequired
};

export default CallWindow;
