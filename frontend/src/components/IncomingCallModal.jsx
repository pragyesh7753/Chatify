import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import toast from "react-hot-toast";

const IncomingCallModal = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingCall = async ({ from, offer, channelId, callType, callerName, callerAvatar }) => {
      console.log("Global incoming call from:", from, "Type:", callType);
      
      setIncomingCall({
        from,
        offer,
        channelId,
        callType: callType || "video",
        callerName: callerName || "Someone",
        callerAvatar: callerAvatar || null
      });

      // Play ringtone
      if (audioRef.current) {
        try {
          audioRef.current.play().catch(err => console.log("Audio play failed:", err));
        } catch (error) {
          console.log("Audio play error:", error);
        }
      }
    };

    socket.on("incoming-call", handleIncomingCall);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
    };
  }, [socket, isConnected]);

  const answerCall = () => {
    if (!incomingCall) return;

    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Navigate to call page with all necessary data
    navigate(
      `/call/${incomingCall.from}?channelId=${incomingCall.channelId}&userName=${encodeURIComponent(incomingCall.callerName)}&callType=${incomingCall.callType}&incoming=true&offer=${encodeURIComponent(JSON.stringify(incomingCall.offer))}`,
      { replace: true }
    );
    
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall || !socket) return;

    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    socket.emit("end-call", {
      to: incomingCall.from,
      channelId: incomingCall.channelId,
    });

    toast.error("Call rejected");
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <>
      {/* Ringtone audio (you can replace with your own ringtone file) */}
      <audio ref={audioRef} loop>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnuH" type="audio/wav" />
      </audio>

      {/* Incoming Call Modal */}
      <div className="modal modal-open z-50">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-xl mb-6 text-center">
            Incoming {incomingCall.callType === "voice" ? "Voice" : "Video"} Call
          </h3>
          
          <div className="flex flex-col items-center gap-6">
            {/* Caller Avatar */}
            <div className="avatar placeholder animate-pulse">
              <div className="bg-primary text-primary-content rounded-full w-28 ring ring-primary ring-offset-base-100 ring-offset-2">
                {incomingCall.callerAvatar ? (
                  <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} />
                ) : (
                  <span className="text-5xl">
                    {incomingCall.callerName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Caller Name */}
            <div className="text-center">
              <p className="text-2xl font-semibold mb-2">{incomingCall.callerName}</p>
              <p className="text-base-content/60">
                is calling you...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-6 mt-4">
              <button 
                onClick={rejectCall} 
                className="btn btn-circle btn-lg btn-error shadow-lg hover:scale-110 transition-transform"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <button 
                onClick={answerCall} 
                className="btn btn-circle btn-lg btn-success shadow-lg hover:scale-110 transition-transform animate-bounce"
              >
                {incomingCall.callType === "voice" ? (
                  <Phone className="w-7 h-7" />
                ) : (
                  <Video className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop bg-black/80" />
      </div>
    </>
  );
};

export default IncomingCallModal;
