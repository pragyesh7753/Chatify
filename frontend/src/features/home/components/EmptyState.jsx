const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div
        className="flex flex-col items-center justify-center h-full p-8 text-center"
        style={{ animation: "fadeIn 0.5s ease-out" }}
    >
        {Icon && <Icon className="h-16 w-16 text-base-content/30 mb-6" />}

        <h3 className="text-lg font-semibold text-base-content mb-2">{title}</h3>
        <p className="text-sm text-base-content/70 mb-6 max-w-sm">{description}</p>

        {action && (
            <div className="hover:scale-105 transition-transform">
                {action}
            </div>
        )}
    </div>
);

export default EmptyState;