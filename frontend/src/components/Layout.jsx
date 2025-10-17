import ChatList from "./ChatList";

const Layout = ({ children, showChatList = false, friends = [] }) => {
  return (
    <div className="h-screen bg-base-100 overflow-hidden transition-colors duration-200">
      <div className="flex h-full">
        {/* Chat List Sidebar - WhatsApp style */}
        {showChatList && <ChatList friends={friends} />}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-base-100 transition-colors duration-200">
          <main className="flex-1 h-full overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
};
export default Layout;
