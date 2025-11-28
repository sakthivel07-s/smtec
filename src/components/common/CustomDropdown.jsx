import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomDropdown({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    disabled = false,
    className = "",
    variant = "default", // default | ghost
    error
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        if (disabled) return;
        // Handle both simple string options and object options {value, label}
        const selectedValue = typeof option === 'object' ? option.value : option;
        onChange({ target: { value: selectedValue, name: label } }); // Mock event object for compatibility
        setIsOpen(false);
    };

    // Find display label
    const getDisplayLabel = () => {
        if (!value) return placeholder;
        const selectedOption = options.find(opt =>
            (typeof opt === 'object' ? opt.value : opt) === value
        );
        if (!selectedOption) return value; // Fallback
        return typeof selectedOption === 'object' ? selectedOption.label : selectedOption;
    };

    const isGhost = variant === 'ghost';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full text-left flex items-center justify-between
                    transition-all duration-200 outline-none
                    ${isGhost
                        ? 'bg-transparent border-none p-0'
                        : 'px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl'
                    }
                    ${!isGhost && (error
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : isOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {getDisplayLabel()}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto custom-scrollbar animate-fade-in">
                    <div className="p-1">
                        {options.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                No options available
                            </div>
                        ) : (
                            options.map((option, index) => {
                                const optValue = typeof option === 'object' ? option.value : option;
                                const optLabel = typeof option === 'object' ? option.label : option;
                                const isSelected = optValue === value;

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        className={`
                                            w-full px-3 py-2.5 text-left text-sm rounded-lg flex items-center justify-between
                                            transition-colors duration-150
                                            ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }
                                        `}
                                    >
                                        <span className="truncate">{optLabel}</span>
                                        {isSelected && <Check size={16} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}
