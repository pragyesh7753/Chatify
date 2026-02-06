import { useEffect, useState, useCallback } from "react";
import {
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  CallControls,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { Phone, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Maximize2, Minimize2 } from "lucide-react";
import { createCall, joinCall, leaveCall } from "@/features/call/services/stream";
import toast from "react-hot-toast";

/**
 * CallScreen Component
 * 
 * Renders the video/audio call interface using Stream Video SDK.
 * Handles call lifecycle, media controls, and participant rendering.
 * 
 * Props:
 * @param {StreamVideoClient} client - Initialized Stream client
 * @param {string} chatId - Chat ID for call routing
 * @param {string} mode - "audio" or "video"
 * @param {function} onClose - Callback when call ends
 * 
 * Features:
 * - Local video preview
 * - Remote participant video
 * - Mic/camera toggle
 * - End call button
 * - Auto cleanup on unmount
 */

const CallScreen = ({ client, chatId, mode, onClose }) => {
  const [call, setCall] = useState(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and join call
  useEffect(() => {
    let mounted = true;
    let callInstance = null;

    const setupCall = async () => {
      try {
        setIsJoining(true);
        setError(null);

        // Create call using chatId
        // callId will be "chatify-{chatId}"
        // Both users join the same call automatically
        callInstance = await createCall(chatId);

        if (!mounted) {
          // Component unmounted during setup, cleanup
          await leaveCall(callInstance);
          return;
        }

        // Join call with appropriate settings
        // Audio call: mic on, camera off
        // Video call: mic on, camera on
        await joinCall(callInstance, {
          audioEnabled: true,
          videoEnabled: mode === "video",
        });

        if (!mounted) {
          await leaveCall(callInstance);
          return;
        }

        setCall(callInstance);
        setIsJoining(false);
        
      } catch (err) {
        console.error("Failed to setup call:", err);
        if (mounted) {
          setError(err.message);
          setIsJoining(false);
          toast.error("Failed to join call");
          // Auto close on error after short delay
          setTimeout(() => onClose(), 2000);
        }
      }
    };

    setupCall();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (callInstance) {
        leaveCall(callInstance).catch(console.error);
      }
    };
  }, [client, chatId, mode, onClose]);

  // Handle end call
  const handleEndCall = useCallback(async () => {
    if (call) {
      await leaveCall(call);
    }
    onClose();
  }, [call, onClose]);

  // Render loading state
  if (isJoining) {
    return (
      <div className="fixed inset-0 bg-base-300 z-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="loading loading-spinner loading-md sm:loading-lg mb-3 sm:mb-4"></div>
          <p className="text-base sm:text-lg">Connecting to call...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-base-300 z-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md p-4 sm:p-6">
          <div className="text-error text-4xl sm:text-5xl mb-3 sm:mb-4">⚠️</div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Call Error</h3>
          <p className="text-sm sm:text-base text-base-content/70 mb-4">{error}</p>
          <button onClick={onClose} className="btn btn-primary btn-sm sm:btn-md">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Render call UI
  if (!call) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallUI 
            mode={mode} 
            onEndCall={handleEndCall}
          />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

/**
 * CallUI Component
 * 
 * Internal component that uses Stream hooks to render call interface.
 * Must be wrapped in StreamCall context.
 */
const CallUI = ({ mode, onEndCall }) => {
  const { useCallCallingState, useParticipants, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  // Show loading while connecting
  if (callingState !== "joined") {
    return (
      <div className="flex items-center justify-center h-full bg-base-300 p-4">
        <div className="text-center">
          <div className="loading loading-spinner loading-md sm:loading-lg mb-3 sm:mb-4"></div>
          <p className="text-base sm:text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  // Filter remote participants (exclude self)
  const remoteParticipants = participants.filter(
    (p) => p.sessionId !== localParticipant?.sessionId
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-base-300">
      {/* Main video area */}
      <div className="flex-1 relative flex items-stretch justify-stretch overflow-hidden">
        {remoteParticipants.length > 0 ? (
          // Show remote participant(s)
          <>
            {remoteParticipants.map((participant) => (
              <div key={participant.sessionId} className="absolute inset-0">
                <ParticipantView
                  participant={participant}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </>
        ) : (
          // Waiting for other participant
          <div className="text-center px-4">
            <div className="avatar placeholder mb-3 sm:mb-4 md:mb-6">
              <div className="bg-neutral text-neutral-content rounded-full w-16 sm:w-20 md:w-28 lg:w-32">
                <span className="text-2xl sm:text-3xl">
                  {mode === "audio" ? <Phone className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-16 lg:h-16" /> : <VideoIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-16 lg:h-16" />}
                </span>
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-base-content/80">Waiting for others to join...</p>
          </div>
        )}

        {/* Local video preview (Picture-in-Picture) */}
        {localParticipant && (
          <div 
            className="absolute bottom-16 sm:bottom-20 md:bottom-28 lg:bottom-32 right-2 sm:right-4 md:right-6 lg:right-8 w-24 h-20 sm:w-32 sm:h-24 md:w-48 md:h-36 lg:w-56 lg:h-40 rounded-md sm:rounded-lg md:rounded-xl overflow-hidden shadow-2xl border border-base-100 sm:border-2 md:border-4 bg-base-200"
          >
            <ParticipantView
              participant={localParticipant}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-base-100">
        <CallControlsCustom mode={mode} onEndCall={onEndCall} />
      </div>

      {/* Call info */}
      <div className="absolute top-2 sm:top-4 md:top-6 left-2 sm:left-4 md:left-6 bg-base-100/80 backdrop-blur-sm px-2 sm:px-3 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-3 rounded-md sm:rounded-lg md:rounded-xl">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          <div className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm md:text-base lg:text-lg font-medium">
            {mode === "audio" ? "Audio Call" : "Video Call"}
          </span>
          {remoteParticipants.length > 0 && (
            <span className="hidden sm:inline text-xs md:text-sm lg:text-base text-base-content/60">
              • {remoteParticipants.length} participant{remoteParticipants.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * CallControlsCustom Component
 * 
 * Custom call controls that match Chatify design.
 * Uses Stream's call hooks to control devices.
 */
const CallControlsCustom = ({ mode, onEndCall }) => {
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState();
  const { camera, isMute: isCameraMute } = useCameraState();

  // Toggle microphone
  const toggleMic = async () => {
    try {
      if (isMute) {
        await microphone.enable();
      } else {
        await microphone.disable();
      }
    } catch (error) {
      console.error("Error toggling microphone:", error);
      toast.error("Failed to toggle microphone");
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    try {
      if (isCameraMute) {
        await camera.enable();
      } else {
        await camera.disable();
      }
    } catch (error) {
      console.error("Error toggling camera:", error);
      toast.error("Failed to toggle camera");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
      {/* Microphone toggle */}
      <button
        onClick={toggleMic}
        className={`btn btn-circle btn-md sm:btn-lg lg:btn-lg ${isMute ? "btn-error" : "btn-ghost"}`}
        title={isMute ? "Unmute microphone" : "Mute microphone"}
      >
        {isMute ? (
          <MicOff className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
        ) : (
          <Mic className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
        )}
      </button>

      {/* Camera toggle (only in video mode) */}
      {mode === "video" && (
        <button
          onClick={toggleCamera}
          className={`btn btn-circle btn-md sm:btn-lg lg:btn-lg ${isCameraMute ? "btn-error" : "btn-ghost"}`}
          title={isCameraMute ? "Turn on camera" : "Turn off camera"}
        >
          {isCameraMute ? (
            <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
          ) : (
            <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
          )}
        </button>
      )}

      {/* End call button */}
      <button
        onClick={onEndCall}
        className="btn btn-error btn-circle btn-md sm:btn-lg lg:btn-lg"
        title="End call"
      >
        <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
      </button>
    </div>
  );
};

export default CallScreen;
