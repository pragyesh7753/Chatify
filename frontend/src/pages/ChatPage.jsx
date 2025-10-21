import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import TypingIndicator from "../components/TypingIndicator";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser, // this will run only when authUser is available
  });

  // Effect 1: Connect user once when token is available
  useEffect(() => {
    const connectChatUser = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        console.log("Connecting user to Stream Chat...");

        const client = StreamChat.getInstance(STREAM_API_KEY);

        // Check if user is already connected
        if (client.userID === authUser._id) {
          console.log("User already connected");
          setChatClient(client);
          return;
        }

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        console.log("User connected successfully");
        setChatClient(client);
      } catch (error) {
        console.error("Error connecting user:", error);
        toast.error("Could not connect to chat. Please try again.");
      }
    };

    connectChatUser();
  }, [tokenData, authUser]);

  // Effect 2: Create/watch channel when chatClient and targetUserId are available
  useEffect(() => {
    const initChannel = async () => {
      if (!chatClient || !authUser || !targetUserId) return;

      setLoading(true);

      try {
        console.log("Initializing channel...");

        const channelId = [authUser._id, targetUserId].sort().join("-");

        // you and me
        // if i start the chat => channelId: [myId, yourId]
        // if you start the chat => channelId: [yourId, myId]  => [myId,yourId]

        const currChannel = chatClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        setChannel(currChannel);
        console.log("Channel initialized successfully");
      } catch (error) {
        console.error("Error initializing channel:", error);
        toast.error("Could not load chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChannel();
  }, [chatClient, authUser, targetUserId]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent successfully!");
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  const CustomChatHeader = () => {
    return (
      <div className="flex items-center gap-2">
        {/* Back button for mobile screens */}
        <button
          onClick={() => navigate(-1)}
          className="md:hidden btn btn-ghost btn-sm btn-circle"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <ChannelHeader />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-base-100 transition-colors duration-200">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full h-full relative flex flex-col whatsapp-chat">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <CustomChatHeader />
              <MessageList />
              <TypingIndicator channel={channel} authUser={authUser} />
              <MessageInput focus />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
export default ChatPage;
