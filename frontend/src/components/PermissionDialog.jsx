import { AlertCircle, X } from "lucide-react";

const PermissionDialog = ({ isOpen, onClose, permission, message, instructions }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in"
      onClick={(e) => {
        // Prevent closing when clicking the backdrop
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
    >
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-warning" />
            </div>
            <h3 className="text-lg font-semibold">Permission Required</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="text-base-content/80">
            <p className="font-medium mb-2">{permission} access is required</p>
            <p className="text-sm">{message}</p>
          </div>

          {instructions && (
            <div className="bg-base-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">How to enable:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-base-content/70">
                {instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="btn btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
