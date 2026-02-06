import { useCall } from "@/features/call/hooks/useCall";
import IncomingCallModal from "./IncomingCallModal";
import OutgoingCallModal from "./OutgoingCallModal";
import CallScreen from "./CallScreen";

/**
 * CallManager Component
 * 
 * Manages the rendering of call-related UI based on call state.
 * Displays the appropriate component for each call state:
 * - Incoming call modal when receiving a call
 * - Outgoing call modal when initiating a call
 * - Call screen when call is active
 * 
 * This component should be rendered at the app root level
 * to overlay other content when calls are active.
 */
const CallManager = () => {
  const { callState, CALL_STATES, endCall, streamClient } = useCall();

  const handleCallClose = () => {
    endCall();
  };

  // Render based on call state
  switch (callState.state) {
    case CALL_STATES.INCOMING_RINGING:
      return <IncomingCallModal />;
      
    case CALL_STATES.OUTGOING_RINGING:
      return <OutgoingCallModal />;
      
    case CALL_STATES.IN_CALL: {
      // Extract chatId from roomName (format: "chatify-{chatId}")
      const chatId = callState.roomName?.replace("chatify-", "");
      
      if (!streamClient || !chatId) {
        console.error("Cannot start call: missing client or chatId");
        return null;
      }
      
      return (
        <CallScreen
          client={streamClient}
          chatId={chatId}
          mode={callState.mode}
          onClose={handleCallClose}
        />
      );
    }
      
    default:
      return null;
  }
};

export default CallManager;
