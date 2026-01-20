import { VideoIcon, Phone } from "lucide-react";

function CallButton({ handleVoiceCall, handleVideoCall }) {
  return (
    <div className="absolute top-0 right-0 p-3 z-30 flex gap-2">
      <button onClick={handleVoiceCall} className="btn btn-success btn-sm gap-2">
        <Phone className="size-4" />
        <span className="hidden sm:inline">Voice Call</span>
      </button>
      <button onClick={handleVideoCall} className="btn btn-primary btn-sm gap-2">
        <VideoIcon className="size-4" />
        <span className="hidden sm:inline">Video Call</span>
      </button>
    </div>
  );
}

export default CallButton;
