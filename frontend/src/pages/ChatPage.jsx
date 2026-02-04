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
import { useCall } from "../hooks/useCall";
import toast from "react-hot-toast";
import { ArrowLeft, Send, Paperclip, Phone, Video } from "lucide-react";
import ChatLoader from "../components/ChatLoader";
import EmojiPicker from "../components/EmojiPicker";
import UserProfileModal from "../components/UserProfileModal";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [channelId, setChannelId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { authUser } = useAuthUser();
  const { socket, isConnected } = useSocket();
  const { initiateCall, callState, CALL_STATES } = useCall();

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

  // Handle audio call
  const handleAudioCall = () => {
    if (callState.state !== CALL_STATES.IDLE) {
      toast.error("Already in a call");
      return;
    }

    if (!targetUser) {
      toast.error("User not found");
      return;
    }

    initiateCall(targetUser, "audio");
  };

  // Handle video call
  const handleVideoCall = () => {
    if (callState.state !== CALL_STATES.IDLE) {
      toast.error("Already in a call");
      return;
    }

    if (!targetUser) {
      toast.error("User not found");
      return;
    }

    initiateCall(targetUser, "video");
  };

  const handleCloseProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  if (channelLoading || messagesLoading || !targetUser) {
    return <ChatLoader />;
  }

  return (
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

        <div className="avatar cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
            <img src={targetUser.profilePic} alt={targetUser.fullName} />
          </div>
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
          <h2 className="font-semibold text-sm sm:text-base truncate">{targetUser.fullName}</h2>
          <p className="text-[10px] sm:text-xs text-base-content/60">
            {isConnected ? "Online" : "Offline"}
          </p>
        </div>

        {/* Call Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAudioCall}
            className="btn btn-ghost btn-sm btn-circle"
            title="Audio call"
            disabled={!isConnected || callState.state !== CALL_STATES.IDLE}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleVideoCall}
            className="btn btn-ghost btn-sm btn-circle"
            title="Video call"
            disabled={!isConnected || callState.state !== CALL_STATES.IDLE}
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
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

      <UserProfileModal
        user={targetUser}
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        isOnline={isConnected}
      />
    </div>
  );
};

export default ChatPage;