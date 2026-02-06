import Sidebar from "./Sidebar";
import ResizableSplitter from "./ResizableSplitter";
import MobileBottomNav from "./MobileBottomNav";
import { useLocation } from "react-router";

const Layout = ({ children, showSidebar = false, friends = [] }) => {
  const location = useLocation();
  const isChat = location.pathname.startsWith("/chat/");

  return (
    <div className="h-screen bg-base-100 overflow-hidden transition-colors duration-200">
      {showSidebar ? (
        <ResizableSplitter
          leftPanel={<Sidebar friends={friends} />}
          rightPanel={
            <div className="h-full bg-base-100 transition-colors duration-200">
              <main className={`h-full overflow-hidden ${isChat ? 'pb-0' : 'pb-20 md:pb-0'}`}>{children}</main>
            </div>
          }
          defaultLeftWidth={400}
          minLeftWidth={280}
          maxLeftWidth={600}
        />
      ) : (
        <div className="h-full bg-base-100 transition-colors duration-200">
          <main className={`h-full overflow-hidden ${isChat ? 'pb-0' : 'pb-20 md:pb-0'}`}>{children}</main>
        </div>
      )}
      {!isChat && <MobileBottomNav />}
    </div>
  );
};
export default Layout;
