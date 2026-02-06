import { useContext } from "react";
import { SocketContext } from "@/features/chat/context/SocketContext.context";

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
