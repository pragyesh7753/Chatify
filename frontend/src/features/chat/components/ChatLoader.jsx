function ChatLoader() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-base-100 transition-colors duration-200">
      <span className="loading loading-ring loading-lg text-primary"></span>
      <p className="mt-4 text-center text-lg font-mono text-base-content">Connecting to chat...</p>
    </div>
  );
}

export default ChatLoader;
