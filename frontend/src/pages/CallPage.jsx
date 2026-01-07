import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, ArrowLeft } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import PermissionDialog from "../components/PermissionDialog";
import { handleMediaPermissionError, getPermissionInstructions } from "../lib/permissions";

const CallPage = () => {
  const navigate = useNavigate();
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channelId");
  const targetUserName = searchParams.get("userName");
  
  const { socket, isConnected } = useSocket();
  const { authUser } = useAuthUser();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const incomingCallDataRef = useRef(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialize local media stream
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        const errorInfo = handleMediaPermissionError(error);
        setPermissionError(errorInfo);
        setShowPermissionDialog(true);
        
        toast.error(errorInfo.message, { 
          duration: 5000,
          id: 'media-permission-error'
        });
      }
    };

    initLocalStream();

    return () => {
      // Cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle incoming call
    socket.on("incoming-call", async ({ from, offer, channelId: incomingChannelId }) => {
      console.log("Incoming call from:", from);
      incomingCallDataRef.current = { from, offer, channelId: incomingChannelId };
      setIsReceivingCall(true);
    });

    // Handle call answer
    socket.on("call-answered", async ({ answer }) => {
      console.log("Call answered");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        setCallAccepted(true);
      }
    });

    // Handle ICE candidate
    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    // Handle call end
    socket.on("call-ended", () => {
      console.log("Call ended by remote user");
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected]);

  // Create peer connection
  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(iceServers);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track");
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", {
          to: targetUserId,
          candidate: event.candidate,
          channelId,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnection.connectionState);
      if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed"
      ) {
        endCall();
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  // Start call (caller)
  const startCall = async () => {
    if (!localStream || !socket || !targetUserId) {
      toast.error("Cannot start call");
      return;
    }

    try {
      setIsCalling(true);
      const peerConnection = createPeerConnection();

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to the other user
      socket.emit("call-user", {
        to: targetUserId,
        from: authUser._id,
        offer,
        channelId,
      });

      toast.success("Calling...");
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call");
      setIsCalling(false);
    }
  };

  // Answer call (receiver)
  const answerCall = async () => {
    if (!incomingCallDataRef.current || !localStream || !socket) return;

    try {
      const { from, offer, channelId: incomingChannelId } = incomingCallDataRef.current;
      
      const peerConnection = createPeerConnection();

      // Set remote description (offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer
      socket.emit("call-answer", {
        to: from,
        answer,
        channelId: incomingChannelId,
      });

      setIsReceivingCall(false);
      setCallAccepted(true);
      toast.success("Call connected");
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Failed to answer call");
    }
  };

  // Reject call
  const rejectCall = () => {
    if (incomingCallDataRef.current && socket) {
      socket.emit("end-call", {
        to: incomingCallDataRef.current.from,
        channelId: incomingCallDataRef.current.channelId,
      });
    }
    setIsReceivingCall(false);
    navigate(-1);
  };

  // End call
  const endCall = () => {
    if (socket && targetUserId && !callEnded) {
      socket.emit("end-call", {
        to: targetUserId,
        channelId,
      });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    setCallEnded(true);
    toast.success("Call ended");
    
    // Navigate back after a short delay
    setTimeout(() => {
      navigate(-1);
    }, 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Auto-start call if targetUserId is provided
  useEffect(() => {
    if (localStream && targetUserId && !isCalling && !callAccepted && !isReceivingCall) {
      startCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, targetUserId]);

  return (
    <div className="h-screen flex flex-col bg-base-300">
      {/* Header */}
      <div className="bg-base-100 shadow-lg p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">
            {targetUserName || "Video Call"}
          </h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0 bg-base-200 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-primary text-primary-content rounded-full w-32">
                  <span className="text-5xl">
                    {targetUserName?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              </div>
              <p className="text-lg">
                {isCalling ? "Calling..." : isReceivingCall ? "Incoming call..." : "Waiting for connection..."}
              </p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-base-300 rounded-lg overflow-hidden shadow-xl border-2 border-base-100">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-base-300 flex items-center justify-center">
              <VideoOff className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-4 bg-base-100/90 backdrop-blur-sm p-4 rounded-full shadow-xl">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`btn btn-circle ${isMuted ? "btn-error" : "btn-primary"}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className={`btn btn-circle ${isVideoOff ? "btn-error" : "btn-primary"}`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="btn btn-circle btn-error"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Incoming Call Modal */}
      {isReceivingCall && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Incoming Call</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-24">
                  <span className="text-4xl">
                    {targetUserName?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              </div>
              <p className="text-center">
                {targetUserName || "Someone"} is calling...
              </p>
              <div className="flex gap-4 mt-4">
                <button onClick={rejectCall} className="btn btn-error gap-2">
                  <PhoneOff className="w-5 h-5" />
                  Reject
                </button>
                <button onClick={answerCall} className="btn btn-success gap-2">
                  <Phone className="w-5 h-5" />
                  Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      {permissionError && (
        <PermissionDialog
          isOpen={showPermissionDialog}
          onClose={() => {
            setShowPermissionDialog(false);
            navigate(-1);
          }}
          permission={permissionError.type === 'permission_denied' ? 'Camera/Microphone' : 'Media Device'}
          message={permissionError.message}
          instructions={
            permissionError.type === 'permission_denied'
              ? getPermissionInstructions('camera')
              : []
          }
        />
      )}
    </div>
  );
};

export default CallPage;
