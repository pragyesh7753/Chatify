import { useState, useRef, useEffect, useCallback } from "react";

const ResizableSplitter = ({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 400, 
  minLeftWidth = 280, 
  maxLeftWidth = 600,
  collapsedWidth = 64 
}) => {
  const [leftWidth, setLeftWidth] = useState(() => {
    // Load saved width from localStorage or use default
    const saved = localStorage.getItem("chatify-sidebar-width");
    return saved ? parseInt(saved, 10) : defaultLeftWidth;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("chatify-sidebar-collapsed");
    return saved === "true";
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const containerRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  // Listen for collapse state changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("chatify-sidebar-collapsed");
      setIsCollapsed(saved === "true");
    };

    // Custom event listener for same-window localStorage changes
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen to a custom event for same-window updates
    const handleCustomEvent = (e) => {
      if (e.detail?.key === "chatify-sidebar-collapsed") {
        setIsCollapsed(e.detail.value);
      }
    };
    window.addEventListener("sidebar-collapse-change", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebar-collapse-change", handleCustomEvent);
    };
  }, []);

  const startDragging = useCallback((e) => {
    // Don't start dragging if this is part of a double-click
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      return; // This is a double-click, don't start dragging
    }
    
    e.preventDefault();
    setIsDragging(true);
    lastClickTimeRef.current = now;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      // Clamp the width between min and max
      const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth));
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save to localStorage after a short delay to get the final width
        setTimeout(() => {
          localStorage.setItem("chatify-sidebar-width", leftWidth.toString());
        }, 0);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      
      // Add a class to the body to prevent text selection
      document.body.classList.add("resizing");
    } else {
      document.body.classList.remove("resizing");
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.classList.remove("resizing");
    };
  }, [isDragging, leftWidth, minLeftWidth, maxLeftWidth]);

  // Handle double-click to reset to default width
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Double-click detected! Resetting to default width:", defaultLeftWidth);
    
    // Visual feedback
    setIsResetting(true);
    setLeftWidth(defaultLeftWidth);
    localStorage.setItem("chatify-sidebar-width", defaultLeftWidth.toString());
    
    // Remove visual feedback after animation
    setTimeout(() => {
      setIsResetting(false);
    }, 300);
  }, [defaultLeftWidth]);

  // Calculate the actual width to display (collapsed or expanded)
  const actualWidth = isCollapsed ? collapsedWidth : leftWidth;

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Panel (Sidebar) */}
      <div 
        style={{ width: `${actualWidth}px` }} 
        className={`flex-shrink-0 h-full overflow-hidden transition-all ${isResetting ? "duration-300" : isCollapsed ? "duration-300" : "duration-0"}`}
      >
        {leftPanel}
      </div>

      {/* Draggable Divider - Hide when collapsed */}
      {!isCollapsed && (
        <div
          onMouseDown={startDragging}
          onDoubleClick={handleDoubleClick}
          className={`
            w-1 bg-base-300 hover:bg-primary cursor-col-resize 
            flex-shrink-0 transition-colors duration-200 relative group
            ${isDragging ? "bg-primary w-1.5" : ""}
            ${isResetting ? "bg-success w-2" : ""}
          `}
          style={{ cursor: "col-resize" }}
          title="Drag to resize, double-click to reset to default"
        >
          {/* Visual indicator on hover */}
          <div className={`
            absolute inset-0 bg-primary transition-all duration-200
            ${isDragging ? "w-1.5 opacity-100" : "w-1 opacity-0 group-hover:opacity-100 group-hover:w-1.5"}
          `} />
          
          {/* Larger hit area for easier dragging */}
          <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
          
          {/* Three dots indicator (vertical ellipsis) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
            <div className="w-0.5 h-0.5 bg-base-content rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-base-content rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-base-content rounded-full"></div>
          </div>
        </div>
      )}

      {/* Right Panel (Chat Area) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizableSplitter;
