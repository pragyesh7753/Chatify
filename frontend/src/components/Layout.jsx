import Sidebar from "./Sidebar";
import ResizableSplitter from "./ResizableSplitter";

const Layout = ({ children, showSidebar = false, friends = [] }) => {
  return (
    <div className="h-screen bg-base-100 overflow-hidden transition-colors duration-200">
      {showSidebar ? (
        <ResizableSplitter
          leftPanel={<Sidebar friends={friends} />}
          rightPanel={
            <div className="h-full bg-base-100 transition-colors duration-200">
              <main className="h-full overflow-hidden">{children}</main>
            </div>
          }
          defaultLeftWidth={400}
          minLeftWidth={280}
          maxLeftWidth={600}
        />
      ) : (
        <div className="h-full bg-base-100 transition-colors duration-200">
          <main className="h-full overflow-hidden">{children}</main>
        </div>
      )}
    </div>
  );
};
export default Layout;
