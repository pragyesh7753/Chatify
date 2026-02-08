import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import EmojiPickerLib from "emoji-picker-react";

const EmojiPicker = ({ onEmojiSelect, disabled = false }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const [pickerStyle, setPickerStyle] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Compute position so picker opens above the button when possible
  useEffect(() => {
    if (!showEmojiPicker || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 8;

    // Set temporary left so the picker can render and measure itself
    const initialLeft = Math.max(margin, rect.left);
    // default top above the button with an estimated height
    const estimatedHeight = 300;
    let top = rect.top - estimatedHeight - margin;

    // If there's not enough space above, open below
    if (top < margin) {
      top = rect.bottom + margin;
    }

    setPickerStyle({ position: 'fixed', left: initialLeft, top, zIndex: 9999 });

    // After render, measure actual height and adjust if needed
    requestAnimationFrame(() => {
      const el = pickerRef.current;
      if (!el) return;
      const pickerRect = el.getBoundingClientRect();
      let finalTop = rect.top - pickerRect.height - margin;
      if (finalTop < margin) {
        finalTop = rect.bottom + margin;
      }

      // Prevent overflow to the right
      let finalLeft = rect.left;
      if (finalLeft + pickerRect.width > window.innerWidth - margin) {
        finalLeft = Math.max(margin, window.innerWidth - margin - pickerRect.width);
      }

      setPickerStyle({ position: 'fixed', left: finalLeft, top: finalTop, zIndex: 9999 });
    });
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData, event) => {
    let char;

    if (!emojiData && event && typeof event === 'string') char = event;
    else if (typeof emojiData === 'string') char = emojiData;
    else if (emojiData && typeof emojiData === 'object') char = emojiData.emoji || emojiData.native || emojiData.unified || null;
    if (!char && event && typeof event === 'object') char = event.emoji || event.native || null;
    if (!char) return;

    onEmojiSelect({ native: char });
    setShowEmojiPicker(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowEmojiPicker((s) => !s)}
        className="btn btn-ghost btn-xs sm:btn-sm btn-circle"
        aria-label="Add emoji"
        disabled={disabled}
      >
        <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {showEmojiPicker && (
        <div
          ref={pickerRef}
          style={pickerStyle || { position: 'fixed', zIndex: 9999 }}
          className="shadow-xl rounded-lg overflow-hidden bg-base-100 p-2"
        >
          <EmojiPickerLib onEmojiClick={handleEmojiClick} theme="auto" />
        </div>
      )}
    </>
  );
};

export default EmojiPicker;