import SearchBar from "./SearchBar";

const MobileHeader = ({ searchQuery, onSearchChange }) => (
    <div className="md:hidden bg-base-200/80 backdrop-blur-lg border-b border-base-300 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
            <img src="/favicon.png" alt="Chatify" className="w-8 h-8 drop-shadow-lg" />
            <span className="text-xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary tracking-wider animate-gradient">
                Chatify
            </span>
        </div>

        <SearchBar value={searchQuery} onChange={onSearchChange} />
    </div>
);

export default MobileHeader;


