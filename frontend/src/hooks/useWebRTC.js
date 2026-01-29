import { useRef, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";

/**
 * Custom React hook for managing WebRTC peer connections
 * Handles the complete WebRTC lifecycle including:
 * - RTCPeerConnection creation and management
 * - Media stream acquisition (getUserMedia)
 * - SDP offer/answer exchange
 * - ICE candidate handling
 * - Proper cleanup on call end
 * 
 * Uses refs instead of state for RTCPeerConnection and MediaStreams
 * to avoid unnecessary re-renders and prevent memory leaks
 */
const useWebRTC = () => {
  const { socket } = useSocket();
  
  // Use refs to avoid re-creating peer connections and streams
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  
  // WebRTC configuration with Google STUN server
  const rtcConfig = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302"
        ]
      }
      // TURN servers can be added here if needed:
      // {
      //   urls: "turn:your-turn-server.com:3478",
      //   username: "username",
      //   credential: "password"
      // }
    ]
  };

  /**
   * Get user media (camera and microphone)
   * @param {boolean} video - Enable video
   * @param {boolean} audio - Enable audio
   * @returns {Promise<MediaStream>}
   */
  const getUserMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });
      
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }, []);

  /**
   * Create RTCPeerConnection with event handlers
   * @param {string} remoteUserId - Remote user ID for signaling
   * @param {string} callId - Unique call identifier
   * @param {Function} onRemoteStream - Callback when remote stream is received
   * @param {Function} onConnectionStateChange - Callback for connection state changes
   */
  const createPeerConnection = useCallback((remoteUserId, callId, onRemoteStream, onConnectionStateChange) => {
    try {
      // Don't recreate if peer connection already exists
      if (peerConnectionRef.current) {
        console.log("Peer connection already exists");
        return peerConnectionRef.current;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("ice-candidate", {
            to: remoteUserId,
            candidate: event.candidate,
            callId
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (onRemoteStream) {
            onRemoteStream(event.streams[0]);
          }
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (onConnectionStateChange) {
          onConnectionStateChange(pc.connectionState);
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
      };

      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      throw error;
    }
  }, [socket, rtcConfig]);

  /**
   * Add local media tracks to peer connection
   * @param {MediaStream} stream - Local media stream
   */
  const addLocalTracks = useCallback((stream) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("Peer connection not initialized");
      return;
    }

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }, []);

  /**
   * Create and send SDP offer
   * @param {string} remoteUserId - Remote user ID
   * @param {string} callId - Call identifier
   */
  const createOffer = useCallback(async (remoteUserId, callId) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("Peer connection not initialized");
      return;
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit("offer", {
          to: remoteUserId,
          offer: offer,
          callId
        });
      }

      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }, [socket]);

  /**
   * Handle received SDP offer and create answer
   * @param {RTCSessionDescriptionInit} offer - Received offer
   * @param {string} remoteUserId - Remote user ID
   * @param {string} callId - Call identifier
   */
  const handleOffer = useCallback(async (offer, remoteUserId, callId) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("Peer connection not initialized");
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process queued ICE candidates after setting remote description
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit("answer", {
          to: remoteUserId,
          answer: answer,
          callId
        });
      }

      return answer;
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }, [socket]);

  /**
   * Handle received SDP answer
   * @param {RTCSessionDescriptionInit} answer - Received answer
   */
  const handleAnswer = useCallback(async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("Peer connection not initialized");
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Process queued ICE candidates after setting remote description
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }, []);

  /**
   * Handle received ICE candidate
   * @param {RTCIceCandidateInit} candidate - Received ICE candidate
   */
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("Peer connection not initialized");
      return;
    }

    try {
      // If remote description is not set, queue the candidate
      if (!pc.remoteDescription) {
        iceCandidatesQueueRef.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

  /**
   * Toggle audio track
   * @param {boolean} enabled - Enable or disable audio
   */
  const toggleAudio = useCallback((enabled) => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }, []);

  /**
   * Toggle video track
   * @param {boolean} enabled - Enable or disable video
   */
  const toggleVideo = useCallback((enabled) => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }, []);

  /**
   * Clean up WebRTC resources
   * CRITICAL: Must be called when call ends to prevent memory leaks
   */
  const cleanup = useCallback(() => {
    console.log("Cleaning up WebRTC resources");

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Stop all remote media tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear ICE candidates queue
    iceCandidatesQueueRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // Functions
    getUserMedia,
    createPeerConnection,
    addLocalTracks,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    cleanup,
    
    // Refs (access .current to get values)
    peerConnectionRef,
    localStreamRef,
    remoteStreamRef
  };
};

export default useWebRTC;
