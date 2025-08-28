export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return "Last seen unknown";
  
  const now = new Date();
  const lastSeen = new Date(lastSeenDate);
  const diffInMs = now - lastSeen;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return "Last seen just now";
  } else if (diffInMinutes < 60) {
    return `Last seen ${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `Last seen ${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `Last seen ${diffInDays}d ago`;
  } else {
    return `Last seen ${lastSeen.toLocaleDateString()}`;
  }
};