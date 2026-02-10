import { SearchIcon, XIcon } from "lucide-react";
import { useState, useEffect } from "react";

const SearchBar = ({ value, onChange, placeholder = "Search or start new chat" }) => {
    const [localValue, setLocalValue] = useState(value);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => onChange(localValue), 300);
        return () => clearTimeout(timer);
    }, [localValue, onChange]);

    const handleClear = () => {
        setLocalValue("");
        onChange("");
    };

    return (
        <div className="relative group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50 transition-all group-focus-within:text-primary group-focus-within:opacity-100" />
            <input
                type="text"
                placeholder={placeholder}
                className="w-full pl-10 pr-10 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm text-base-content placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-base-content/30"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-base-300 transition-all opacity-50 hover:opacity-100"
                    aria-label="Clear search"
                >
                    <XIcon className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

export default SearchBar;

