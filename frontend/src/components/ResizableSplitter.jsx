import { useState, useRef, useEffect, useCallback } from "react";

const ResizableSplitter = ({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 400, 
  minLeftWidth = 280, 
  maxLeftWidth = 600 
}) => {
  const [leftWidth, setLeftWidth] = useState(() => {
    // Load saved width from localStorage or use default
    const saved = localStorage.getItem("chatify-sidebar-width");
    return saved ? parseInt(saved, 10) : defaultLeftWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
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
        // Save to localStorage
        localStorage.setItem("chatify-sidebar-width", leftWidth.toString());
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
  const handleDoubleClick = useCallback(() => {
    setLeftWidth(defaultLeftWidth);
    localStorage.setItem("chatify-sidebar-width", defaultLeftWidth.toString());
  }, [defaultLeftWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Panel (Chat List) */}
      <div 
        style={{ width: `${leftWidth}px` }} 
        className="flex-shrink-0 h-full overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={startDragging}
        onDoubleClick={handleDoubleClick}
        className={`
          w-1 bg-base-300 hover:bg-primary cursor-col-resize 
          flex-shrink-0 transition-colors duration-200 relative group
          ${isDragging ? "bg-primary w-1.5" : ""}
        `}
        style={{ cursor: "col-resize" }}
        title="Drag to resize, double-click to reset"
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

      {/* Right Panel (Chat Area) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizableSplitter;
