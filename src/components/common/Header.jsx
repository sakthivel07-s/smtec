import { useAuth } from "../../contexts/AuthContext";
import { Menu, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ title, onMenuClick }) {
    const { currentUser, userRole } = useAuth();
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-colors duration-300">
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[200px] md:max-w-none">
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <ThemeToggle />

                <button className="relative text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                </button>

                <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-gray-100 dark:border-gray-800">
                    {isDesktop && (
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{currentUser?.email}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize">{userRole}</span>
                        </div>
                    )}
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md shadow-blue-200 dark:shadow-none">
                        {currentUser?.email?.[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}
