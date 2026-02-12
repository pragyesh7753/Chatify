import { useReducer, useEffect, useState, useRef } from "react";
import { useSocket } from "@/features/chat/hooks/useSocket";
import useAuthUser from "@/features/auth/hooks/useAuthUser";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "@/features/call/services/stream";
import { CallContext } from "./CallContext"


/**
 * Call Context
 * 
 * Manages call state and Stream Video client for audio/video calling.
 * 
 * Architecture:
 * 1. Socket.io handles call signaling (invite, accept, reject, etc.)
 * 2. Stream Video handles actual media (audio/video transport)
 * 3. CallContext coordinates between signaling and media
 * 
 * Call Flow:
 * 1. User clicks "Call" button → initiateCall()
 * 2. Socket.io sends call-invite to receiver
 * 3. Receiver sees IncomingCallModal → acceptCall() or rejectCall()
 * 4. If accepted, both users transition to IN_CALL state
 * 5. CallScreen component joins Stream call using chatId
 * 6. Stream handles all WebRTC, STUN/TURN, media
 */

// Call states
const CALL_STATES = {
    IDLE: "idle",
    OUTGOING_RINGING: "outgoing_ringing",
    INCOMING_RINGING: "incoming_ringing",
    IN_CALL: "in_call"
};

// Call actions
const CALL_ACTIONS = {
    INITIATE_CALL: "INITIATE_CALL",
    INCOMING_CALL: "INCOMING_CALL",
    ACCEPT_CALL: "ACCEPT_CALL",
    REJECT_CALL: "REJECT_CALL",
    END_CALL: "END_CALL",
    CANCEL_CALL: "CANCEL_CALL",
    CALL_ACCEPTED: "CALL_ACCEPTED",
    CALL_REJECTED: "CALL_REJECTED",
    CALL_CANCELLED: "CALL_CANCELLED",
    CALL_ENDED: "CALL_ENDED"
};

const initialState = {
    state: CALL_STATES.IDLE,
    roomName: null,
    mode: null, // "audio" | "video"
    caller: null,
    receiver: null,
    isInitiator: false
};

function callReducer(state, action) {
    switch (action.type) {
        case CALL_ACTIONS.INITIATE_CALL:
            return {
                ...state,
                state: CALL_STATES.OUTGOING_RINGING,
                roomName: action.payload.roomName,
                mode: action.payload.mode,
                receiver: action.payload.receiver,
                isInitiator: true
            };

        case CALL_ACTIONS.INCOMING_CALL:
            return {
                ...state,
                state: CALL_STATES.INCOMING_RINGING,
                roomName: action.payload.roomName,
                mode: action.payload.mode,
                caller: action.payload.caller,
                isInitiator: false
            };

        case CALL_ACTIONS.ACCEPT_CALL:
        case CALL_ACTIONS.CALL_ACCEPTED:
            return {
                ...state,
                state: CALL_STATES.IN_CALL
            };

        case CALL_ACTIONS.REJECT_CALL:
        case CALL_ACTIONS.END_CALL:
        case CALL_ACTIONS.CANCEL_CALL:
        case CALL_ACTIONS.CALL_REJECTED:
        case CALL_ACTIONS.CALL_CANCELLED:
        case CALL_ACTIONS.CALL_ENDED:
            return initialState;

        default:
            return state;
    }
}

export const CallProvider = ({ children }) => {
    const [callState, dispatch] = useReducer(callReducer, initialState);
    const { socket } = useSocket();
    const { authUser } = useAuthUser();
    const [streamClient, setStreamClient] = useState(null);

    /**
     * Initialize Stream Video client when user is authenticated
     * 
     * Stream client is created once per session and reused for all calls.
     * It's initialized with a token from the backend that proves user identity.
     */
    useEffect(() => {
        let mounted = true;

        const setupStreamClient = async () => {
            if (!authUser) {
                // User logged out, cleanup client
                if (streamClient) {
                    await disconnectStreamClient();
                    setStreamClient(null);
                }
                return;
            }

            // Don't reinitialize if client already exists
            if (streamClient) {
                return;
            }

            try {
                const client = await initializeStreamClient(
                    authUser._id,
                    authUser.fullName,
                    authUser.avatar
                );

                if (mounted) {
                    setStreamClient(client);
                }
            } catch (error) {
                console.error("Failed to initialize Stream client:", error);
                toast.error("Failed to initialize video calling");
            }
        };

        setupStreamClient();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser]); // streamClient intentionally not included to prevent re-initialization

    /**
     * Cleanup Stream client on unmount
     */
    useEffect(() => {
        return () => {
            if (streamClient) {
                disconnectStreamClient();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on unmount

    /**
     * Listen for service worker messages (from push notification clicks)
     */
    useEffect(() => {
        const handleServiceWorkerMessage = (event) => {
            // Only handle messages from service worker
            if (event.data && event.data.type) {
                if (event.data.type === "ACCEPT_CALL") {
                    const { callData } = event.data;

                    // Simulate incoming call and auto-accept
                    dispatch({
                        type: CALL_ACTIONS.INCOMING_CALL,
                        payload: {
                            roomName: callData.roomName,
                            mode: callData.mode,
                            caller: {
                                _id: callData.callerId,
                                fullName: callData.callerName
                            }
                        }
                    });

                    // Auto-accept the call after a brief delay
                    setTimeout(() => {
                        if (socket && streamClient) {
                            dispatch({ type: CALL_ACTIONS.ACCEPT_CALL });
                            socket.emit("call-accepted", {
                                roomName: callData.roomName,
                                targetUserId: callData.callerId
                            });
                        } else {
                            console.error("Cannot accept call: socket or streamClient not ready", {
                                hasSocket: !!socket,
                                hasStreamClient: !!streamClient
                            });
                        }
                    }, 500);
                } else if (event.data.type === "REJECT_CALL") {
                    const { callData } = event.data;

                    if (socket) {
                        socket.emit("call-rejected", {
                            roomName: callData.roomName,
                            targetUserId: callData.callerId
                        });
                    }
                }
            }
        };

        // Listen on window for messages from service worker
        window.addEventListener("message", handleServiceWorkerMessage);

        return () => {
            window.removeEventListener("message", handleServiceWorkerMessage);
        };
    }, [socket, streamClient]);

    /**
     * Check URL parameters on mount for call acceptance from push notification
     */
    const urlCallProcessedRef = useRef(false);

    useEffect(() => {
        // Only process once
        if (urlCallProcessedRef.current) return;

        const urlParams = new URLSearchParams(window.location.search);
        const acceptCall = urlParams.get("acceptCall");
        const roomName = urlParams.get("roomName");
        const callerId = urlParams.get("callerId");
        const callerName = urlParams.get("callerName");
        const mode = urlParams.get("mode");

        console.log("[CallProvider] URL params check:", {
            acceptCall,
            roomName,
            callerId,
            callerName,
            mode,
            hasSocket: !!socket,
            hasStreamClient: !!streamClient,
            hasAuthUser: !!authUser
        });

        if (acceptCall === "true" && roomName && callerId && mode && socket && streamClient && authUser) {
            urlCallProcessedRef.current = true; // Mark as processed

            console.log("[CallProvider] Auto-accepting call from URL parameters");

            // Set incoming call state
            dispatch({
                type: CALL_ACTIONS.INCOMING_CALL,
                payload: {
                    roomName,
                    mode,
                    caller: {
                        _id: callerId,
                        fullName: callerName || "Caller"
                    }
                }
            });

            // Auto-accept after brief delay
            setTimeout(() => {
                console.log("[CallProvider] Emitting call-accepted to backend");
                dispatch({ type: CALL_ACTIONS.ACCEPT_CALL });
                socket.emit("call-accepted", {
                    roomName,
                    targetUserId: callerId
                });

                // Clean up URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 500);
        }
    }, [socket, streamClient, authUser]); // Re-run when these become available

    /**
     * Socket event listeners for call signaling
     * 
     * All call coordination happens via Socket.io:
     * - call-invite: Incoming call from another user
     * - call-accepted: Receiver accepted the call
     * - call-rejected: Receiver rejected the call
     * - call-cancelled: Caller cancelled before answer
     * - call-ended: Either party ended an active call
     */
    useEffect(() => {
        if (!socket || !authUser) return;

        const handleCallInvite = (data) => {
            const { roomName, mode, caller } = data;

            if (callState.state !== CALL_STATES.IDLE) {
                socket.emit("call-rejected", {
                    roomName,
                    reason: "busy",
                    targetUserId: caller._id
                });
                return;
            }

            dispatch({
                type: CALL_ACTIONS.INCOMING_CALL,
                payload: { roomName, mode, caller }
            });
        };

        const handleCallAccepted = () => {
            dispatch({ type: CALL_ACTIONS.CALL_ACCEPTED });
        };

        const handleCallRejected = (data) => {
            dispatch({ type: CALL_ACTIONS.CALL_REJECTED });

            if (data.reason === "busy") {
                toast.error("User is currently busy");
            } else if (data.reason === "offline") {
                toast("User is currently unavailable. They'll be notified about your call.", {
                    icon: "📞",
                    duration: 4000
                });
            } else {
                toast.error("Call was rejected");
            }
        };

        const handleCallCancelled = () => {
            dispatch({ type: CALL_ACTIONS.CALL_CANCELLED });
            toast.error("Call was cancelled");
        };

        const handleCallEnded = () => {
            dispatch({ type: CALL_ACTIONS.CALL_ENDED });
        };

        socket.on("call-invite", handleCallInvite);
        socket.on("call-accepted", handleCallAccepted);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-cancelled", handleCallCancelled);
        socket.on("call-ended", handleCallEnded);

        return () => {
            socket.off("call-invite", handleCallInvite);
            socket.off("call-accepted", handleCallAccepted);
            socket.off("call-rejected", handleCallRejected);
            socket.off("call-cancelled", handleCallCancelled);
            socket.off("call-ended", handleCallEnded);
        };
    }, [socket, authUser, callState.state]);

    /**
     * Initiate a call to another user
     * 
     * @param {Object} targetUser - User to call
     * @param {string} mode - "audio" or "video"
     * 
     * Process:
     * 1. Generate deterministic roomName from user IDs
     * 2. Update local state to OUTGOING_RINGING
     * 3. Send call-invite via Socket.io to target user
     * 4. Wait for call-accepted or call-rejected event
     */
    const initiateCall = (targetUser, mode) => {
        if (!socket || !authUser) return;

        if (callState.state !== CALL_STATES.IDLE) {
            toast.error("Already in a call");
            return;
        }

        if (!streamClient) {
            toast.error("Video client not ready. Please try again.");
            return;
        }

        const chatId = [authUser._id, targetUser._id].sort().join("-");
        const roomName = `chatify-${chatId}`;

        dispatch({
            type: CALL_ACTIONS.INITIATE_CALL,
            payload: { roomName, mode, receiver: targetUser }
        });

        socket.emit("call-invite", {
            roomName,
            mode,
            targetUserId: targetUser._id,
            caller: {
                _id: authUser._id,
                fullName: authUser.fullName,
                avatar: authUser.avatar
            }
        });
    };

    /**
     * Accept an incoming call
     * 
     * Process:
     * 1. Update local state to IN_CALL
     * 2. Send call-accepted via Socket.io to caller
     * 3. CallManager will render CallScreen
     * 4. CallScreen joins Stream call
     */
    const acceptCall = () => {
        if (!socket || callState.state !== CALL_STATES.INCOMING_RINGING) return;

        if (!streamClient) {
            toast.error("Video client not ready");
            rejectCall();
            return;
        }

        dispatch({ type: CALL_ACTIONS.ACCEPT_CALL });

        socket.emit("call-accepted", {
            roomName: callState.roomName,
            targetUserId: callState.caller._id
        });
    };

    /**
     * Reject an incoming call
     */
    const rejectCall = () => {
        if (!socket || callState.state !== CALL_STATES.INCOMING_RINGING) return;

        dispatch({ type: CALL_ACTIONS.REJECT_CALL });

        socket.emit("call-rejected", {
            roomName: callState.roomName,
            targetUserId: callState.caller._id
        });
    };

    /**
     * Cancel an outgoing call (before it's answered)
     */
    const cancelCall = () => {
        if (!socket || callState.state !== CALL_STATES.OUTGOING_RINGING) return;

        dispatch({ type: CALL_ACTIONS.CANCEL_CALL });

        socket.emit("call-cancelled", {
            roomName: callState.roomName,
            targetUserId: callState.receiver._id
        });
    };

    /**
     * End an active call
     * 
     * Process:
     * 1. Update local state to IDLE
     * 2. Send call-ended via Socket.io to peer
     * 3. CallScreen will cleanup and leave Stream call
     */
    const endCall = () => {
        if (!socket || callState.state !== CALL_STATES.IN_CALL) return;

        dispatch({ type: CALL_ACTIONS.END_CALL });

        const targetUserId = callState.isInitiator
            ? callState.receiver._id
            : callState.caller._id;

        socket.emit("call-ended", {
            roomName: callState.roomName,
            targetUserId
        });
    };

    const value = {
        callState,
        CALL_STATES,
        streamClient,
        initiateCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
};
