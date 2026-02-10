import { MessageCircleIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";

const FeatureCard = ({ Icon, label, color }) => (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-base-200/50 transition-all group">
        <div className={`p-3 rounded-full bg-gradient-to-br from-${color}/10 to-${color}/5 group-hover:from-${color}/20 group-hover:to-${color}/10 transition-all`}>
            <Icon className={`h-6 w-6 text-${color}`} />
        </div>
        <span className="text-sm font-medium text-base-content/80">{label}</span>
    </div>
);

const DesktopWelcome = () => (
    <div
        className="hidden md:flex flex-col items-center justify-center h-full"
        style={{ animation: "fadeIn 0.6s ease-out" }}
    >
        <div className="text-center px-8 max-w-2xl">
            <img
                src="/favicon.png"
                alt="Chatify"
                className="w-24 h-24 mx-auto mb-6 drop-shadow-2xl hover:scale-110 transition-transform"
            />

            <h1 className="text-4xl font-light text-base-content mb-3 bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/70">
                Chatify for Windows
            </h1>

            <p className="text-base-content/70 mb-8 leading-relaxed">
                Send and receive messages without keeping your phone online.
                <br />
                Select a chat from the list to start messaging.
            </p>

            <div className="grid grid-cols-3 gap-6 mt-8">
                <FeatureCard Icon={MessageCircleIcon} label="Real-time Chat" color="primary" />
                <FeatureCard Icon={ShieldCheckIcon} label="Secure & Private" color="secondary" />
                <FeatureCard Icon={ZapIcon} label="Lightning Fast" color="accent" />
            </div>
        </div>
    </div>
);

export default DesktopWelcome;


