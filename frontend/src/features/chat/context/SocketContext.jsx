import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuthUser from "@/features/auth/hooks/useAuthUser";
import { SocketContext } from "@/features/chat/context/SocketContext.context";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { authUser, isLoading } = useAuthUser();

  useEffect(() => {
    if (authUser?.token) {
      const SOCKET_URL = import.meta.env.VITE_API_URL;
      
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: authUser.token
        },
        withCredentials: true
      });

      newSocket.on("connect", () => {
        console.log("Connected to Socket.io server");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from Socket.io server");
        setIsConnected(false);
      });

      newSocket.on("user-online", ({ userId }) => {
        setOnlineUsers((prev) => new Set([...prev, userId]));
      });

      newSocket.on("user-offline", ({ userId }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
        
        // If token expired, the socket will be recreated when authUser updates with new token
        if (error.message?.includes("Token expired")) {
          console.log("Socket token expired, will reconnect with new token");
          newSocket.disconnect();
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      // If no auth user, disconnect socket if it exists
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.token, isLoading]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    isUserOnline: (userId) => onlineUsers.has(userId)
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
