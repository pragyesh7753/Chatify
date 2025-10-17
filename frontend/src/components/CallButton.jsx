import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <div className="p-3 border-b border-base-300 bg-base-200 flex items-center justify-end max-w-7xl mx-auto w-full absolute top-0 z-10 transition-colors duration-200">
      <button onClick={handleVideoCall} className="btn btn-primary btn-sm">
        <VideoIcon className="size-5" />
        Video Call
      </button>
    </div>
  );
}

export default CallButton;
