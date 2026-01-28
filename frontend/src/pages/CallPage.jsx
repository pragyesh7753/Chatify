import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, ArrowLeft } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import PermissionDialog from "../components/PermissionDialog";
import { handleMediaPermissionError, getPermissionInstructions } from "../lib/permissions";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  sdpSemantics: 'unified-plan',
};

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

const getMediaConstraints = (isVideo) => ({
  video: isVideo,
  audio: AUDIO_CONSTRAINTS
});

const getAnswerConstraints = (isVideo) => ({
  offerToReceiveAudio: true,
  offerToReceiveVideo: isVideo
});

const CallPage = () => {
  const navigate = useNavigate();
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channelId");
  const targetUserName = searchParams.get("userName");
  const targetUserAvatar = searchParams.get("userAvatar");
  const callType = searchParams.get("callType") || "video";
  const isIncoming = searchParams.get("incoming") === "true";
  const incomingOffer = searchParams.get("offer");
  
  const { socket, isConnected } = useSocket();
  const { authUser } = useAuthUser();

  const isVideoCall = callType === "video";
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState({ isCalling: false, isReceiving: false, isAccepted: false, isEnded: false });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [permissionError, setPermissionError] = useState(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const incomingCallDataRef = useRef(null);
  const localStreamRef = useRef(null);

  const setupRemoteAudio = useCallback((videoElement) => {
    if (!videoElement) return;
    videoElement.muted = false;
    videoElement.volume = 1.0;
    if (videoElement.setSinkId) {
      videoElement.setSinkId('').catch(() => {});
    }
    videoElement.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  }, []);

  const enableAudioTrack = useCallback((track) => {
    track.enabled = true;
    return track;
  }, []);

  const endCall = useCallback(() => {
    if (callState.isEnded) return;
    setCallState(prev => ({ ...prev, isEnded: true }));
    
    socket?.emit("end-call", { to: targetUserId, channelId });

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach(track => track.stop());

    toast.success("Call ended", { id: 'call-ended' });
    setTimeout(() => navigate('/', { replace: true }), 1000);
  }, [callState.isEnded, socket, targetUserId, channelId, navigate]);

  useEffect(() => {
    let mounted = true;
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(isVideoCall));
        stream.getAudioTracks().forEach(enableAudioTrack);
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current && isVideoCall) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        if (!mounted) return;
        
        if (error.name === 'NotReadableError' || error.message?.includes('in use')) {
          toast.error("Camera/microphone is in use. You can still receive audio.", { 
            duration: 5000,
            id: 'device-in-use'
          });
        } else {
          const errorInfo = handleMediaPermissionError(error);
          setPermissionError(errorInfo);
          setShowPermissionDialog(true);
          toast.error(errorInfo.message, { duration: 5000, id: 'media-permission-error' });
        }
      }
    };

    initLocalStream();

    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    };
  }, [isVideoCall, enableAudioTrack]);

  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        if (track.kind === 'audio') track.enabled = true;
        peerConnection.addTrack(track, localStream);
      });
    } else {
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      if (isVideoCall) peerConnection.addTransceiver('video', { direction: 'recvonly' });
    }

    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      stream.getAudioTracks().forEach(enableAudioTrack);
      
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setupRemoteAudio(remoteVideoRef.current);
        
        setTimeout(() => {
          remoteVideoRef.current?.paused && remoteVideoRef.current.play().catch(() => {});
        }, 1000);
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { to: targetUserId, candidate: event.candidate, channelId });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (!callState.isEnded && peerConnection.connectionState === "failed") endCall();
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [localStream, isVideoCall, socket, targetUserId, channelId, callState.isEnded, setupRemoteAudio, enableAudioTrack, endCall]);

  const handleIncomingCallFromUrl = useCallback(async () => {
    if (!incomingOffer || !localStream || callState.isAccepted) return;
    
    try {
      const offer = JSON.parse(decodeURIComponent(incomingOffer));
      incomingCallDataRef.current = { from: targetUserId, offer, channelId, callType };
      
      const peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer(getAnswerConstraints(isVideoCall));
      await peerConnection.setLocalDescription(answer);
      
      socket.emit("call-answer", { to: targetUserId, answer, channelId });
      setCallState(prev => ({ ...prev, isAccepted: true }));
      toast.success("Call connected", { id: 'call-connected' });
    } catch {
      toast.error("Failed to answer call");
    }
  }, [incomingOffer, localStream, callState.isAccepted, targetUserId, channelId, callType, isVideoCall, createPeerConnection, socket]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingCall = ({ from, offer, channelId: incomingChannelId, callType: incomingCallType }) => {
      incomingCallDataRef.current = { from, offer, channelId: incomingChannelId, callType: incomingCallType };
      setCallState(prev => ({ ...prev, isReceiving: true }));
    };

    const handleCallAnswered = async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState(prev => ({ ...prev, isAccepted: true }));
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore ICE candidate errors - they're usually harmless
        }
      }
    };

    if (!isIncoming) {
      socket.on("incoming-call", handleIncomingCall);
    } else {
      handleIncomingCallFromUrl();
    }

    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", endCall);

    return () => {
      if (!isIncoming) socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [socket, isConnected, isIncoming, handleIncomingCallFromUrl, endCall]);

  const startCall = useCallback(async () => {
    if (!socket || !targetUserId || !localStream) {
      toast.error(!localStream ? "No media access. Allow camera/microphone." : "Cannot start call");
      return;
    }

    try {
      setCallState(prev => ({ ...prev, isCalling: true }));
      const peerConnection = createPeerConnection();
      const offer = await peerConnection.createOffer(getAnswerConstraints(isVideoCall));
      await peerConnection.setLocalDescription(offer);

      socket.emit("call-user", {
        to: targetUserId,
        from: authUser._id,
        offer,
        channelId,
        callType,
      });

      toast.success("Calling...");
    } catch {
      toast.error("Failed to start call");
      setCallState(prev => ({ ...prev, isCalling: false }));
    }
  }, [socket, targetUserId, localStream, createPeerConnection, isVideoCall, authUser, channelId, callType]);

  const answerCall = useCallback(async () => {
    if (!incomingCallDataRef.current || !localStream || !socket) {
      toast.error("Cannot answer call - please try again");
      return;
    }

    try {
      const { from, offer, channelId: incomingChannelId } = incomingCallDataRef.current;
      const peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer(getAnswerConstraints(isVideoCall));
      await peerConnection.setLocalDescription(answer);

      socket.emit("call-answer", { to: from, answer, channelId: incomingChannelId });

      setCallState(prev => ({ ...prev, isReceiving: false, isAccepted: true }));
      toast.success("Call connected");
    } catch {
      toast.error("Failed to answer call");
    }
  }, [localStream, socket, createPeerConnection, isVideoCall]);

  const rejectCall = useCallback(() => {
    if (incomingCallDataRef.current?.from && socket) {
      socket.emit("end-call", {
        to: incomingCallDataRef.current.from,
        channelId: incomingCallDataRef.current.channelId,
      });
    }
    setCallState(prev => ({ ...prev, isReceiving: false }));
    toast.error("Call rejected", { id: 'call-rejected' });
    navigate('/', { replace: true });
  }, [socket, navigate]);

  const toggleTrack = useCallback((trackType) => {
    if (!localStream) {
      toast.error(`No ${trackType} stream available`);
      return;
    }
    
    const tracks = trackType === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks();
    const track = tracks[0];
    
    if (!track) {
      toast.error(`No ${trackType} track available`);
      return;
    }
    
    track.enabled = !track.enabled;
    const isOff = !track.enabled;
    
    if (peerConnectionRef.current) {
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === trackType);
      if (sender?.track) sender.track.enabled = track.enabled;
    }
    
    if (trackType === 'audio') {
      setIsMuted(isOff);
      toast.success(isOff ? "Microphone muted" : "Microphone unmuted", { duration: 1500, id: 'mute-toggle' });
    } else {
      setIsVideoOff(isOff);
      toast.success(isOff ? "Camera off" : "Camera on", { duration: 1500, id: 'video-toggle' });
    }
  }, [localStream]);

  const toggleMute = useCallback(() => toggleTrack('audio'), [toggleTrack]);
  const toggleVideo = useCallback(() => toggleTrack('video'), [toggleTrack]);

  useEffect(() => {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (audioTrack) setIsMuted(!audioTrack.enabled);
  }, [localStream]);

  useEffect(() => {
    const shouldStartCall = localStream && targetUserId && !callState.isCalling && !callState.isAccepted && !callState.isReceiving && !isIncoming;
    if (shouldStartCall) startCall();
  }, [localStream, targetUserId, isIncoming, callState.isCalling, callState.isAccepted, callState.isReceiving, startCall]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setupRemoteAudio(remoteVideoRef.current);
    }
  }, [remoteStream, setupRemoteAudio]);

  const getCallStatusText = () => {
    if (callState.isCalling) return "Calling...";
    if (callState.isReceiving) return "Incoming call...";
    return "Waiting for connection...";
  };

  const renderUserAvatar = (size = "w-32", textSize = "text-5xl") => (
    <div className="avatar placeholder mb-4">
      <div className={`bg-primary text-primary-content rounded-full ${size}`}>
        {targetUserAvatar ? (
          <img src={targetUserAvatar} alt={targetUserName} className="rounded-full" />
        ) : (
          <span className={textSize}>{targetUserName?.charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>
    </div>
  );

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
            {targetUserName || (callType === "voice" ? "Voice Call" : "Video Call")}
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
              muted={false}
              controls={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              {renderUserAvatar()}
              <p className="text-lg">{getCallStatusText()}</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        {isVideoCall && (
          <div className="absolute top-4 right-4 w-48 h-36 bg-base-300 rounded-lg overflow-hidden shadow-xl border-2 border-base-100">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 bg-base-300 flex items-center justify-center">
                <VideoOff className="w-8 h-8" />
              </div>
            )}
          </div>
        )}

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-4 bg-base-100/90 backdrop-blur-sm p-4 rounded-full shadow-xl">
            <button
              onClick={toggleMute}
              disabled={!localStream}
              className={`btn btn-circle ${isMuted ? "btn-error" : "btn-primary"} ${!localStream ? 'btn-disabled' : ''}`}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleVideo}
                disabled={!localStream}
                className={`btn btn-circle ${isVideoOff ? "btn-error" : "btn-primary"} ${!localStream ? 'btn-disabled' : ''}`}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button onClick={endCall} className="btn btn-circle btn-error" title="End call">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Unmute Audio Button - shows if audio is blocked */}
        {audioBlocked && remoteStream && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().then(() => {
                    setAudioBlocked(false);
                    toast.success('Audio enabled');
                  }).catch(() => {
                    toast.error('Could not enable audio');
                  });
                }
              }}
              className="btn btn-lg btn-primary gap-2 animate-pulse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Tap to Enable Audio
            </button>
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      {callState.isReceiving && !isIncoming && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Incoming Call</h3>
            <div className="flex flex-col items-center gap-4">
              {renderUserAvatar("w-24", "text-4xl")}
              <p className="text-center">
                {targetUserName || "Someone"} is calling you for a {incomingCallDataRef.current?.callType || "video"} call...
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
