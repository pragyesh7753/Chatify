import { useEffect, useRef, useState } from "react";
import { Smile, X } from "lucide-react";

const EmojiPicker = ({ onEmojiSelect, disabled = false }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiData, setEmojiData] = useState(null);
  const emojiPickerRef = useRef(null);

  // Load emoji-mart from CDN
  useEffect(() => {
    const loadEmojiMart = async () => {
      try {
        // Load emoji data
        const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
        const data = await response.json();
        setEmojiData(data);

        // Load Picker component if not already loaded
        if (!window.EmojiMart) {
          const script = document.createElement('script');
          script.type = 'module';
          script.innerHTML = `
            import { Picker } from 'https://cdn.jsdelivr.net/npm/emoji-mart@latest/+esm';
            window.EmojiMart = { Picker };
          `;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Failed to load emoji-mart:', error);
      }
    };

    loadEmojiMart();
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="btn btn-ghost btn-xs sm:btn-sm btn-circle"
        aria-label="Add emoji"
        disabled={disabled}
      >
        <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="fixed md:absolute bottom-[76px] left-2 sm:left-4 z-20 shadow-xl rounded-lg overflow-hidden"
        >
          <div className="bg-base-200 p-2 flex justify-between items-center border-b border-base-300">
            <span className="text-sm font-semibold">Pick an emoji</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div id="emoji-picker-container"></div>
        </div>
      )}

      {showEmojiPicker && emojiData && (
        <EmojiPickerRenderer
          data={emojiData}
          onEmojiSelect={handleEmojiSelect}
        />
      )}
    </>
  );
};

// Component to handle emoji picker rendering
const EmojiPickerRenderer = ({ data, onEmojiSelect }) => {
  useEffect(() => {
    const container = document.getElementById('emoji-picker-container');
    if (container && window.EmojiMart) {
      const picker = new window.EmojiMart.Picker({
        data: data,
        onEmojiSelect: onEmojiSelect,
        theme: 'auto',
        previewPosition: 'none',
        skinTonePosition: 'search',
        perLine: 7,
        maxFrequentRows: 2,
        emojiSize: 24
      });
      container.innerHTML = '';
      container.appendChild(picker);
      
      // Apply custom height constraint
      const pickerElement = container.querySelector('em-emoji-picker');
      if (pickerElement) {
        pickerElement.style.height = '280px';
      }
    }
  }, [data, onEmojiSelect]);

  return null;
};

export default EmojiPicker;
