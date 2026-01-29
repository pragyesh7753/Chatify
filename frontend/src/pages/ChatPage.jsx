import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  createOrGetChannel,
  getChannelMessages,
  sendMessage as sendMessageApi,
  getUserFriends
} from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import useWebRTC from "../hooks/useWebRTC";
import toast from "react-hot-toast";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import ChatLoader from "../components/ChatLoader";
import EmojiPicker from "../components/EmojiPicker";
import CallButton from "../components/CallButton";
import IncomingCallModal from "../components/IncomingCallModal";
import CallWindow from "../components/CallWindow";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [channelId, setChannelId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Call-related state
  const [callState, setCallState] = useState({
    isInCall: false,
    callType: null, // "audio" or "video"
    callId: null,
    remoteUserId: null,
    isIncoming: false,
    incomingCallData: null
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const callTimeoutRef = useRef(null);

  const { authUser } = useAuthUser();
  const { socket, isConnected } = useSocket();
  const webRTC = useWebRTC();

  // Get target user info from friends list
  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser
  });

  const targetUser = friends?.find(f => f._id === targetUserId);

  // Create or get channel
  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", targetUserId],
    queryFn: () => createOrGetChannel(targetUserId),
    enabled: !!authUser && !!targetUserId
  });

  // Get messages
  const { data: initialMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", channel?.channelId],
    queryFn: () => getChannelMessages(channel.channelId),
    enabled: !!channel?.channelId
  });

  // Set channel ID and initial messages
  useEffect(() => {
    if (channel?.channelId) {
      setChannelId(channel.channelId);
    }
  }, [channel]);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !channelId || !authUser) return;

    // Join the channel
    socket.emit("join-channel", channelId);

    // Listen for new messages - only add if not from current user
    const handleNewMessage = (data) => {
      // If data has senderId, check if it's not from current user
      if (data.senderId && data.senderId === authUser._id) {
        return; // Ignore own messages from socket
      }

      // Handle both formats: direct message or wrapped in data object
      const message = data.message || data;
      
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userName }) => {
      setIsTyping(true);
      setTypingUser(userName);
    };

    const handleUserStoppedTyping = () => {
      setIsTyping(false);
      setTypingUser(null);
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stopped-typing", handleUserStoppedTyping);

    return () => {
      socket.emit("leave-channel", channelId);
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stopped-typing", handleUserStoppedTyping);
    };
  }, [socket, channelId, authUser]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: sendMessageApi,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
      scrollToBottom();
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !channelId) return;

    sendMessageMutation.mutate({
      channelId,
      text: newMessage.trim(),
      attachments: []
    });

    // Stop typing indicator
    if (socket) {
      socket.emit("typing-stop", {
        channelId,
        userId: authUser._id
      });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !channelId) return;

    // Emit typing start
    socket.emit("typing-start", {
      channelId,
      userId: authUser._id,
      userName: authUser.fullName
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing-stop", {
        channelId,
        userId: authUser._id
      });
    }, 2000);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
  };

  // ==================== WebRTC Call Functions ====================

  /**
   * Initiate a call to the target user
   */
  const initiateCall = useCallback(async (callType) => {
    if (!socket || !targetUserId || !authUser) {
      toast.error("Cannot initiate call");
      return;
    }

    try {
      // Request media permissions
      const stream = await webRTC.getUserMedia(
        callType === "video",
        true // always get audio
      );
      
      setLocalStream(stream);

      // Create peer connection
      const pc = webRTC.createPeerConnection(
        targetUserId,
        null, // callId will be set when call is accepted
        (stream) => {
          setRemoteStream(stream);
        },
        (state) => {
          console.log("Connection state:", state);
          if (state === "disconnected" || state === "failed" || state === "closed") {
            endCall();
          }
        }
      );

      // Add local tracks to peer connection
      webRTC.addLocalTracks(stream);

      // Update call state
      setCallState({
        isInCall: true,
        callType,
        callId: null,
        remoteUserId: targetUserId,
        isIncoming: false,
        incomingCallData: null
      });

      // Emit call-user event
      socket.emit("call-user", {
        to: targetUserId,
        callType,
        callerInfo: {
          fullName: authUser.fullName,
          profilePic: authUser.profilePic
        }
      });

      // Set timeout for unanswered call (45 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callState.isInCall && !callState.callId) {
          // Call was not accepted within timeout period
          toast.error("Call timeout - no answer");
          endCall();
        }
      }, 45000);

      toast.success(`Calling ${targetUser.fullName}...`);
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Could not access camera/microphone");
      webRTC.cleanup();
    }
  }, [socket, targetUserId, authUser, targetUser, webRTC]);

  /**
   * Accept an incoming call
   */
  const acceptCall = useCallback(async () => {
    if (!socket || !callState.incomingCallData) {
      return;
    }

    const { callId, from, callType } = callState.incomingCallData;

    try {
      // Request media permissions
      const stream = await webRTC.getUserMedia(
        callType === "video",
        true
      );
      
      setLocalStream(stream);

      // Create peer connection
      webRTC.createPeerConnection(
        from,
        callId,
        (stream) => {
          setRemoteStream(stream);
        },
        (state) => {
          console.log("Connection state:", state);
          if (state === "disconnected" || state === "failed" || state === "closed") {
            endCall();
          }
        }
      );

      // Add local tracks
      webRTC.addLocalTracks(stream);

      // Update call state
      setCallState({
        isInCall: true,
        callType,
        callId,
        remoteUserId: from,
        isIncoming: false,
        incomingCallData: null
      });

      // Accept the call
      socket.emit("accept-call", { callId });
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Could not access camera/microphone");
      rejectCall();
    }
  }, [socket, callState.incomingCallData, webRTC]);

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(() => {
    if (!socket || !callState.incomingCallData) {
      return;
    }

    const { callId } = callState.incomingCallData;
    
    socket.emit("reject-call", { callId, reason: "Call declined" });
    
    setCallState({
      isInCall: false,
      callType: null,
      callId: null,
      remoteUserId: null,
      isIncoming: false,
      incomingCallData: null
    });

    toast.success("Call declined");
  }, [socket, callState.incomingCallData]);

  /**
   * End an active call
   */
  const endCall = useCallback(() => {
    // Clear call timeout if it exists
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    if (callState.callId && socket) {
      socket.emit("end-call", {
        callId: callState.callId,
        to: callState.remoteUserId
      });
    }

    // Cleanup WebRTC resources
    webRTC.cleanup();
    
    setLocalStream(null);
    setRemoteStream(null);
    setCallState({
      isInCall: false,
      callType: null,
      callId: null,
      remoteUserId: null,
      isIncoming: false,
      incomingCallData: null
    });
  }, [callState, socket, webRTC]);

  // ==================== WebRTC Socket Event Listeners ====================

  useEffect(() => {
    if (!socket || !authUser) return;

    // Handle incoming call
    const handleIncomingCall = (data) => {
      console.log("Incoming call:", data);
      
      setCallState({
        isInCall: false,
        callType: data.callType,
        callId: data.callId,
        remoteUserId: data.from,
        isIncoming: true,
        incomingCallData: data
      });

      toast.success(`Incoming ${data.callType} call from ${data.callerInfo.fullName}`);
    };

    // Handle call accepted
    const handleCallAccepted = async (data) => {
      console.log("Call accepted:", data);
      
      // Clear call timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
      setCallState(prev => ({
        ...prev,
        callId: data.callId
      }));

      // Create and send offer
      try {
        await webRTC.createOffer(callState.remoteUserId, data.callId);
      } catch (error) {
        console.error("Error creating offer:", error);
        endCall();
      }
    };

    // Handle call rejected
    const handleCallRejected = (data) => {
      console.log("Call rejected:", data);
      toast.error(`Call declined by ${targetUser?.fullName || "user"}`);
      endCall();
    };

    // Handle call ended
    const handleCallEnded = (data) => {
      console.log("Call ended:", data);
      toast.success("Call ended");
      endCall();
    };

    // Handle call failed
    const handleCallFailed = (data) => {
      console.log("Call failed:", data);
      toast.error(data.reason || "Call failed");
      endCall();
    };

    // Handle WebRTC offer
    const handleOffer = async (data) => {
      console.log("Received offer:", data);
      
      try {
        await webRTC.handleOffer(data.offer, data.from, data.callId);
      } catch (error) {
        console.error("Error handling offer:", error);
        endCall();
      }
    };

    // Handle WebRTC answer
    const handleAnswer = async (data) => {
      console.log("Received answer:", data);
      
      try {
        await webRTC.handleAnswer(data.answer);
      } catch (error) {
        console.error("Error handling answer:", error);
        endCall();
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data) => {
      try {
        await webRTC.handleIceCandidate(data.candidate);
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    };

    // Register event listeners
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-failed", handleCallFailed);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-failed", handleCallFailed);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket, authUser, webRTC, callState.remoteUserId, targetUser, endCall]);

  // Cleanup on unmount or navigation
  useEffect(() => {
    return () => {
      if (callState.isInCall) {
        endCall();
      }
    };
  }, []);

  // ==================== End WebRTC Functions ====================

  if (channelLoading || messagesLoading || !targetUser) {
    return <ChatLoader />;
  }

  return (
    <>
      {/* Incoming Call Modal */}
      <IncomingCallModal
        isOpen={callState.isIncoming}
        callerInfo={callState.incomingCallData?.callerInfo}
        callType={callState.callType}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {/* Active Call Window */}
      {callState.isInCall && !callState.isIncoming && (
        <CallWindow
          localStream={localStream}
          remoteStream={remoteStream}
          callType={callState.callType}
          remoteUserInfo={targetUser}
          onEndCall={endCall}
          onToggleAudio={webRTC.toggleAudio}
          onToggleVideo={webRTC.toggleVideo}
        />
      )}

      <div className="h-full flex flex-col bg-base-100 overflow-hidden">
        {/* Chat Header */}
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-b border-base-300 bg-base-200 w-full">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden btn btn-ghost btn-sm btn-circle"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="avatar">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
              <img src={targetUser.profilePic} alt={targetUser.fullName} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm sm:text-base truncate">{targetUser.fullName}</h2>
            <p className="text-[10px] sm:text-xs text-base-content/60">
              {isConnected ? "Online" : "Offline"}
            </p>
          </div>

          {/* Call Buttons */}
          <CallButton 
            onCall={initiateCall} 
            disabled={!isConnected || callState.isInCall}
          />
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-base-content/60 px-4">
            <p className="text-sm sm:text-base text-center">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId === authUser._id;
            const showSenderName =
              !isOwnMessage &&
              (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            
            // Check if message is emoji only
            const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(message.text.trim());

            return isEmojiOnly ? (
              <div
                key={message.$id || index}
                className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} mb-3`}
              >
                <div className="text-4xl sm:text-5xl py-1">
                  {message.text}
                </div>
                <div className="opacity-50 px-2">
                  <time className="text-xs">
                    {new Date(message.$createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </div>
              </div>
            ) : (
              <div
                key={message.$id || index}
                className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              >
                {showSenderName && (
                  <div className="chat-header mb-1">
                    <span className="text-xs sm:text-sm font-semibold">{message.senderName}</span>
                  </div>
                )}

                <div className={`chat-bubble ${isOwnMessage ? "chat-bubble-primary" : ""}`}>
                  {message.text}
                </div>

                <div className="chat-footer opacity-50">
                  <time className="text-xs">
                    {new Date(message.$createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </div>
              </div>
            );
          })
        )}

        {isTyping && typingUser && (
          <div className="chat chat-start">
            <div className="chat-bubble">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex-shrink-0 p-2 sm:p-3 md:p-4 border-t border-base-300 bg-base-200">
        <div className="flex gap-1 sm:gap-2 items-center">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={!isConnected} />

          <button
            type="button"
            className="btn btn-ghost btn-xs sm:btn-sm btn-circle"
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="input input-bordered flex-1 h-9 sm:h-12"
            disabled={!isConnected}
          />

          <button
            type="submit"
            className="btn btn-primary btn-circle btn-sm sm:btn-md"
            disabled={!newMessage.trim() || sendMessageMutation.isPending || !isConnected}
            aria-label="Send message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
    </>
  );
};

export default ChatPage;