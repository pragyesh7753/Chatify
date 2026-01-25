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
  const callType = searchParams.get("callType") || "video"; // 'voice' or 'video'
  const isIncoming = searchParams.get("incoming") === "true";
  const incomingOffer = searchParams.get("offer");
  
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
  const [audioBlocked, setAudioBlocked] = useState(false);

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
    sdpSemantics: 'unified-plan',
  };

  // Initialize local media stream
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        // Verify audio track is enabled
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = true;
          console.log('Audio track initialized:', {
            id: audioTracks[0].id,
            enabled: audioTracks[0].enabled,
            muted: audioTracks[0].muted,
            readyState: audioTracks[0].readyState
          });
        }
        
        setLocalStream(stream);
        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
        }
        
        console.log(`Local stream initialized for ${callType} call:`, 
          stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, muted: t.muted }))
        );
        
        // If it's a voice call, set video as off by default
        if (callType === "voice") {
          setIsVideoOff(true);
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        
        // Check if it's a "device in use" error
        if (error.name === 'NotReadableError' || error.message.includes('in use')) {
          toast.error("Camera/microphone is being used by another application. You can still receive the call and hear audio.", { 
            duration: 7000,
            id: 'device-in-use'
          });
          console.log("Continuing without local media - receive-only mode");
          // Continue without local stream for testing purposes
        } else {
          const errorInfo = handleMediaPermissionError(error);
          setPermissionError(errorInfo);
          setShowPermissionDialog(true);
          
          toast.error(errorInfo.message, { 
            duration: 5000,
            id: 'media-permission-error'
          });
        }
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
  }, [callType]);

  // Create peer connection
  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(iceServers);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        // Ensure audio tracks are enabled
        if (track.kind === 'audio') {
          track.enabled = true;
        }
        console.log(`Adding local track: ${track.kind}, enabled: ${track.enabled}`);
        // Use addTrack for simpler and more reliable setup
        peerConnection.addTrack(track, localStream);
      });
    } else {
      console.error("No local stream available when creating peer connection");
      // Even without local stream, add transceivers to receive
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      if (callType === 'video') {
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind, "enabled:", event.track.enabled);
      const stream = event.streams[0];
      
      // Ensure audio tracks are enabled and unmuted
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        // Set audio track to maximum volume
        if (track.getSettings) {
          console.log("Audio track settings:", track.getSettings());
        }
        console.log("Audio track enabled:", track.id, "readyState:", track.readyState);
      });
      
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        // Ensure audio is not muted
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;
        // Set audio output to default device
        if (remoteVideoRef.current.setSinkId && typeof remoteVideoRef.current.setSinkId === 'function') {
          remoteVideoRef.current.setSinkId('').catch(err => console.log('setSinkId error:', err));
        }
        
        // Try to play the video element
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Remote stream playing successfully");
              setAudioBlocked(false);
            })
            .catch(err => {
              console.log("Autoplay blocked, user interaction may be needed:", err);
              setAudioBlocked(true);
              // Try to resume AudioContext if it exists
              if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                  try {
                    const audioContext = new AudioContextClass();
                    if (audioContext.state === 'suspended') {
                      audioContext.resume().then(() => {
                        console.log('AudioContext resumed');
                      });
                    }
                  } catch (e) {
                    console.log('AudioContext error:', e);
                  }
                }
              }
            });
        }
        
        console.log("Remote stream tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        // Additional check: verify audio element is actually playing
        setTimeout(() => {
          if (remoteVideoRef.current) {
            const state = {
              paused: remoteVideoRef.current.paused,
              muted: remoteVideoRef.current.muted,
              volume: remoteVideoRef.current.volume,
              readyState: remoteVideoRef.current.readyState
            };
            console.log("Remote video element state:", state);
            
            // If still paused, try playing again
            if (state.paused) {
              remoteVideoRef.current.play().catch(e => console.log('Retry play failed:', e));
            }
          }
        }, 1000);
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
        !callEnded &&
        (peerConnection.connectionState === "failed")
      ) {
        console.log("Connection failed, ending call");
        endCall();
      }
    };
    
    // Log ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peerConnection.iceConnectionState);
    };
    
    // Log signaling state
    peerConnection.onsignalingstatechange = () => {
      console.log("Signaling state:", peerConnection.signalingState);
    };
    
    // Log when negotiation is needed
    peerConnection.onnegotiationneeded = () => {
      console.log("Negotiation needed");
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  // Setup socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Only listen for incoming calls if not already handling an incoming call
    if (!isIncoming) {
      // Handle incoming call (for cases where user is already on call page)
      socket.on("incoming-call", async ({ from, offer, channelId: incomingChannelId, callType: incomingCallType }) => {
        console.log("Incoming call from:", from, "Type:", incomingCallType);
        incomingCallDataRef.current = { from, offer, channelId: incomingChannelId, callType: incomingCallType };
        setIsReceivingCall(true);
      });
    } else {
      // Handle incoming call from URL params (navigated from global modal)
      if (incomingOffer && localStream && !callAccepted) {
        const answerIncomingCall = async () => {
          try {
            const offer = JSON.parse(decodeURIComponent(incomingOffer));
            incomingCallDataRef.current = { from: targetUserId, offer, channelId, callType };
            
            console.log("Answering incoming call with local stream ready");
            console.log("Received offer SDP:", offer.sdp);
            console.log("Audio in offer:", offer.sdp?.includes('m=audio'));
            
            const peerConnection = createPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            console.log("Remote description set, creating answer...");
            
            // Create answer with explicit constraints to ensure audio/video
            const answer = await peerConnection.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: callType === 'video'
            });
            await peerConnection.setLocalDescription(answer);
            
            // Log SDP for debugging
            console.log('Created answer SDP:', answer.sdp);
            console.log('Audio in answer SDP:', answer.sdp.includes('m=audio'));
            
            socket.emit("call-answer", {
              to: targetUserId,
              answer,
              channelId,
            });
            
            setCallAccepted(true);
            toast.success("Call connected", { id: 'call-connected' });
          } catch (error) {
            console.error("Error answering incoming call:", error);
            toast.error("Failed to answer call");
          }
        };
        
        answerIncomingCall();
      }
    }

    // Handle call answer
    socket.on("call-answered", async ({ answer }) => {
      console.log("Call answered, received answer");
      console.log("Answer SDP:", answer.sdp);
      console.log("Audio in answer:", answer.sdp?.includes('m=audio'));
      
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("Remote description (answer) set successfully");
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
      if (!isIncoming) {
        socket.off("incoming-call");
      }
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, localStream, isIncoming, callAccepted]);

  // Start call (caller)
  const startCall = async () => {
    if (!socket || !targetUserId) {
      toast.error("Cannot start call - no connection");
      return;
    }
    
    if (!localStream) {
      toast.error("Cannot start call - no media access. Please allow camera/microphone.");
      return;
    }

    try {
      setIsCalling(true);
      const peerConnection = createPeerConnection();

      // Create offer with explicit constraints to ensure audio/video
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await peerConnection.setLocalDescription(offer);
      
      // Log SDP for debugging
      console.log('Created offer SDP:', offer.sdp);
      console.log('Audio in SDP:', offer.sdp.includes('m=audio'));

      // Send offer to the other user
      socket.emit("call-user", {
        to: targetUserId,
        from: authUser._id,
        offer,
        channelId,
        callType,
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
    if (!incomingCallDataRef.current || !localStream || !socket) {
      console.error("Cannot answer call - missing dependencies", {
        hasIncomingCall: !!incomingCallDataRef.current,
        hasLocalStream: !!localStream,
        hasSocket: !!socket
      });
      toast.error("Cannot answer call - please try again");
      return;
    }

    try {
      const { from, offer, channelId: incomingChannelId } = incomingCallDataRef.current;
      
      console.log("Answering call from:", from);
      console.log("Received offer SDP:", offer.sdp);
      console.log("Audio in offer:", offer.sdp?.includes('m=audio'));
      
      const peerConnection = createPeerConnection();

      // Set remote description (offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log("Remote description set, creating answer...");

      // Create answer with explicit constraints to ensure audio/video
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await peerConnection.setLocalDescription(answer);
      
      // Log SDP for debugging
      console.log('Created answer SDP:', answer.sdp);
      console.log('Audio in answer SDP:', answer.sdp.includes('m=audio'));

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
    toast.error("Call rejected", { id: 'call-rejected' });
    
    // Navigate back using replace to prevent history issues
    navigate('/', { replace: true });
  };

  // End call
  const endCall = () => {
    // Prevent multiple calls to endCall
    if (callEnded) return;
    
    setCallEnded(true);
    
    if (socket && targetUserId) {
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

    toast.success("Call ended", { id: 'call-ended' });
    
    // Navigate back to chat or home using replace to prevent history issues
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!localStream) {
      console.error("Cannot toggle mute: no local stream");
      toast.error("No audio stream available");
      return;
    }
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.error("Cannot toggle mute: no audio track");
      toast.error("No audio track available");
      return;
    }
    
    // Toggle the track on local stream
    audioTrack.enabled = !audioTrack.enabled;
    const newMutedState = !audioTrack.enabled;
    
    // Also update the sender track if peer connection exists
    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders();
      const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
      if (audioSender && audioSender.track) {
        audioSender.track.enabled = audioTrack.enabled;
        console.log(`Updated sender track enabled: ${audioSender.track.enabled}`);
      }
    }
    
    setIsMuted(newMutedState);
    
    console.log(`Audio ${newMutedState ? 'muted' : 'unmuted'}. Track enabled: ${audioTrack.enabled}`);
    toast.success(newMutedState ? "Microphone muted" : "Microphone unmuted", {
      duration: 1500,
      id: 'mute-toggle'
    });
  };

  // Toggle video
  const toggleVideo = () => {
    if (!localStream) {
      console.error("Cannot toggle video: no local stream");
      toast.error("No video stream available");
      return;
    }
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error("Cannot toggle video: no video track");
      toast.error("No video track available");
      return;
    }
    
    // Toggle the track on local stream
    videoTrack.enabled = !videoTrack.enabled;
    const newVideoOffState = !videoTrack.enabled;
    
    // Also update the sender track if peer connection exists
    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
      if (videoSender && videoSender.track) {
        videoSender.track.enabled = videoTrack.enabled;
        console.log(`Updated sender video track enabled: ${videoSender.track.enabled}`);
      }
    }
    
    setIsVideoOff(newVideoOffState);
    
    console.log(`Video ${newVideoOffState ? 'disabled' : 'enabled'}. Track enabled: ${videoTrack.enabled}`);
    toast.success(newVideoOffState ? "Camera off" : "Camera on", {
      duration: 1500,
      id: 'video-toggle'
    });
  };

  // Sync mute state with actual track state when local stream changes
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        // Sync state with actual track state
        setIsMuted(!audioTrack.enabled);
        console.log('Synced mute state. Audio track enabled:', audioTrack.enabled, 'isMuted:', !audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Auto-start call if targetUserId is provided and not incoming
  useEffect(() => {
    if (localStream && targetUserId && !isCalling && !callAccepted && !isReceivingCall && !isIncoming) {
      startCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, targetUserId, isIncoming]);

  // Ensure remote audio plays when stream is available
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("Remote stream updated, ensuring playback");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
      
      // Verify audio tracks
      const audioTracks = remoteStream.getAudioTracks();
      console.log("Remote audio tracks:", audioTracks.map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));
      
      const playAudio = async () => {
        try {
          await remoteVideoRef.current.play();
          console.log("Remote stream playing after state update");
          setAudioBlocked(false);
        } catch (err) {
          console.log("Play failed after state update:", err);
          setAudioBlocked(true);
        }
      };
      
      playAudio();
    }
  }, [remoteStream]);

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

        {/* Local Video (Picture-in-Picture) - only show for video calls */}
        {callType === "video" && (
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
        )}

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-4 bg-base-100/90 backdrop-blur-sm p-4 rounded-full shadow-xl">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              disabled={!localStream}
              className={`btn btn-circle ${isMuted ? "btn-error" : "btn-primary"} ${!localStream ? 'btn-disabled' : ''}`}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Video Toggle Button - only for video calls */}
            {callType === "video" && (
              <button
                onClick={toggleVideo}
                disabled={!localStream}
                className={`btn btn-circle ${isVideoOff ? "btn-error" : "btn-primary"} ${!localStream ? 'btn-disabled' : ''}`}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="btn btn-circle btn-error"
              title="End call"
            >
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
                  }).catch(err => {
                    console.error('Failed to enable audio:', err);
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
      {isReceivingCall && !isIncoming && (
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
