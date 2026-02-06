import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const PasswordInput = ({
    value,
    onChange,
    placeholder = "Password",
    className = "",
    name,
    id,
    required = false,
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="relative z-0">
            <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                name={name}
                id={id}
                required={required}
                className={`pr-12 ${className}`}
                {...props}
            />
            <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 z-10 bg-transparent"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex="-1"
            >
                {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                ) : (
                    <EyeIcon className="h-5 w-5" />
                )}
            </button>
        </div>
    );
};

export default PasswordInput;