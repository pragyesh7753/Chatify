import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <div className="absolute top-0 right-0 p-3 z-30">
      <button onClick={handleVideoCall} className="btn btn-primary btn-sm gap-2">
        <VideoIcon className="size-4" />
        <span className="hidden sm:inline">Video Call</span>
      </button>
    </div>
  );
}

export default CallButton;
