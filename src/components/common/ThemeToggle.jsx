import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useState, useRef, useEffect } from "react";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    const CurrentIcon = options.find(opt => opt.value === theme)?.icon || Monitor;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Switch Theme"
            >
                <CurrentIcon size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-fade-in">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                setTheme(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                                w-full px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors
                                ${theme === option.value
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            <option.icon size={16} />
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
