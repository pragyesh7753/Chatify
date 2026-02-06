import { useEffect, useState } from "react";

const TypingIndicator = ({ channel, authUser }) => {
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!channel) return;

    const handleTypingStart = (event) => {
      if (event.user?.id !== authUser._id) {
        setTypingUsers(prev => {
          const exists = prev.find(user => user.id === event.user.id);
          if (!exists) {
            return [...prev, event.user];
          }
          return prev;
        });
      }
    };

    const handleTypingStop = (event) => {
      if (event.user?.id !== authUser._id) {
        setTypingUsers(prev => prev.filter(user => user.id !== event.user.id));
      }
    };

    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);

    return () => {
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
    };
  }, [channel, authUser._id]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};

export default TypingIndicator;